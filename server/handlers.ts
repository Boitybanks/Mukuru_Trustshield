import { z } from 'zod';
import { LANGUAGES } from '../src/domain/types';
import type { CheckResult, Language } from '../src/domain/types';
import { analyse, decide, ENGINE_VERSION } from '../src/domain/checker/check';
import { MAX_INPUT_CHARS } from '../src/domain/normalisation/text';
import { isCanonicalKey } from '../src/domain/reports/policy';
import { presentReason, presentResult } from '../src/i18n/present';
import { CALL_STATES } from '../src/domain/callLock/callSafety';
import { evaluateCallLock } from '../src/domain/callLock/policy';
import { evaluateTransaction, PAYMENT_PURPOSES } from '../src/domain/transaction/evaluateTransaction';
import type { AccountVerificationProvider } from '../src/domain/proof/accountVerification';
import { DEMO_CUSTOMER } from '../src/domain/proof/accountVerification';
import { clampTtl, isProofId, minimumClaims, proofStatus } from '../src/domain/proof/proof';
import type { ProofRecord } from '../src/domain/proof/proof';
import { errorResponse, HttpError, json, methodNotAllowed, readJson, toErrorResponse } from './http';
import type { RateLimiter } from './rateLimit';
import { RATE_LIMITS } from './rateLimit';
import type { ProofRepository, ReportRepository } from './repositories';

export interface Deps {
  reports: ReportRepository;
  proofs: ProofRepository;
  avs: AccountVerificationProvider;
  rateLimiter: RateLimiter;
  now: () => Date;
  newProofId: () => string;
  hash: (value: string) => string;
}

export interface RequestContext {
  ip?: string;
  params?: Record<string, string>;
}

const language = z.enum(LANGUAGES).default('en');

const CheckRequest = z.object({
  input: z.string().trim().min(1, 'input is required').max(MAX_INPUT_CHARS, `input must be at most ${MAX_INPUT_CHARS} characters`),
  language,
});

const ReportRequest = z.object({
  input: z.string().trim().min(1).max(MAX_INPUT_CHARS),
  reporterId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,64}$/)
    .optional(),
  language,
});

const ProofCreateRequest = z.object({
  ttlSeconds: z.number().int().optional(),
});

const TransactionRequest = z.object({
  callState: z.enum(CALL_STATES),
  draft: z.object({
    recipientName: z.string().trim().max(80),
    recipientIsNew: z.boolean(),
    amount: z.number().positive().max(1_000_000),
    currency: z.literal('ZAR'),
    purpose: z.enum(PAYMENT_PURPOSES),
    reference: z.string().trim().max(140),
  }),
  language,
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const tooLong = result.error.issues.some((i) => i.code === 'too_big' && i.path[0] === 'input');
    throw new HttpError(
      tooLong ? 413 : 400,
      tooLong ? 'INPUT_TOO_LONG' : 'INVALID_REQUEST',
      tooLong ? `input must be at most ${MAX_INPUT_CHARS} characters` : 'The request is not valid.',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return result.data;
}

function limit(deps: Deps, ctx: RequestContext, bucket: keyof typeof RATE_LIMITS): void {
  if (!deps.rateLimiter.allow(bucket, ctx.ip ?? 'unknown', RATE_LIMITS[bucket])) {
    throw new HttpError(429, 'RATE_LIMITED', 'Too many requests. Please wait a minute.');
  }
}

/** The public response contract of POST /api/check. */
export function toCheckResponse(result: CheckResult, lang: Language, checkedAt: Date) {
  const presented = presentResult(lang, result.verdict, result.signals);
  return {
    verdict: result.verdict,
    inputType: result.inputType,
    reasonCodes: result.reasonCodes,
    title: presented.title,
    reason: presented.headline,
    nextStep: presented.nextSteps[0] ?? '',
    nextSteps: presented.nextSteps,
    reasons: presented.reasons,
    signals: result.signals,
    entities: result.entities.map((e) => ({
      kind: e.kind,
      display: e.display,
      status: e.status,
      canonicalKey: e.canonicalKey,
    })),
    matchedOfficialRecord: result.matchedOfficialRecord,
    reportCount: result.reportCount,
    reportableKeys: result.reportableKeys,
    truncated: result.truncated,
    language: lang,
    engineVersion: ENGINE_VERSION,
    checkedAt: checkedAt.toISOString(),
  };
}

export type CheckResponse = ReturnType<typeof toCheckResponse>;

// ---------------------------------------------------------------------------
// POST /api/check
// ---------------------------------------------------------------------------
export function createCheckHandler(deps: Deps) {
  return async (req: Request, ctx: RequestContext = {}): Promise<Response> => {
    if (req.method !== 'POST') return methodNotAllowed(['POST']);
    try {
      limit(deps, ctx, 'check');
      const body = parse(CheckRequest, await readJson(req));
      const analysis = analyse(body.input);
      const keys = [...analysis.entities.filter((e) => e.status !== 'OFFICIAL').map((e) => e.canonicalKey)];
      if (analysis.messageKey) keys.push(analysis.messageKey);
      // Community data enhances the check but is never required for it.
      let counts: Record<string, number> = {};
      try {
        counts = keys.length ? await deps.reports.getCounts(keys) : {};
      } catch {
        counts = {};
      }
      return json(200, toCheckResponse(decide(analysis, counts), body.language, deps.now()));
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

// ---------------------------------------------------------------------------
// POST /api/report   and   GET /api/reports/:canonicalKey
// ---------------------------------------------------------------------------
export function createReportHandler(deps: Deps) {
  return async (req: Request, ctx: RequestContext = {}): Promise<Response> => {
    try {
      if (req.method === 'GET') {
        const raw = ctx.params?.key ?? new URL(req.url).pathname.split('/').pop() ?? '';
        let key: string;
        try {
          key = decodeURIComponent(raw);
        } catch {
          throw new HttpError(400, 'INVALID_REQUEST', 'Malformed key.');
        }
        if (!isCanonicalKey(key)) throw new HttpError(400, 'INVALID_REQUEST', 'Unknown key format.');
        const record = await deps.reports.get(key);
        return json(200, {
          canonicalKey: key,
          found: record !== null,
          reportCount: record?.reportCount ?? 0,
          canonicalValue: record?.canonicalValue ?? null,
          inputType: record?.inputType ?? null,
          reasonCodes: record?.reasonCodes ?? [],
          reportedAt: record?.reportedAt ?? null,
          lastReportedAt: record?.lastReportedAt ?? null,
        });
      }
      if (req.method !== 'POST') return methodNotAllowed(['POST', 'GET']);

      limit(deps, ctx, 'report');
      const body = parse(ReportRequest, await readJson(req));
      // Never trust a client-supplied canonical value: re-derive it here.
      const analysis = analyse(body.input);
      const result = decide(analysis);
      if (analysis.entities.length > 0 && analysis.entities.every((e) => e.status === 'OFFICIAL')) {
        throw new HttpError(409, 'OFFICIAL_ENTITY', 'This matches an official Mukuru contact and cannot be reported as a scam.');
      }
      if (result.reportableKeys.length === 0) {
        throw new HttpError(422, 'NOTHING_TO_REPORT', 'Nothing in this input can be reported.');
      }
      const now = deps.now();
      const reported = [];
      for (const key of result.reportableKeys.slice(0, 5)) {
        const entity = analysis.entities.find((e) => e.canonicalKey === key);
        const fingerprint = body.reporterId ? deps.hash(`${body.reporterId}:${key}`).slice(0, 16) : null;
        const { record, duplicate } = await deps.reports.increment(
          {
            canonicalKey: key,
            canonicalValue: (entity?.display ?? 'message').slice(0, 160),
            inputType: entity?.kind === 'SMS_SHORTCODE' ? 'PHONE' : (entity?.kind ?? 'MESSAGE'),
            reasonCodes: result.reasonCodes,
          },
          fingerprint,
          now,
        );
        reported.push({ canonicalKey: key, canonicalValue: record.canonicalValue, reportCount: record.reportCount, duplicate });
      }
      return json(201, {
        reported,
        reportCount: Math.max(...reported.map((r) => r.reportCount)),
        alreadyReported: reported.every((r) => r.duplicate),
      });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

// ---------------------------------------------------------------------------
// POST /api/proof/create   and   GET /api/proof/:id
// ---------------------------------------------------------------------------
export function createProofHandler(deps: Deps) {
  return async (req: Request, ctx: RequestContext = {}): Promise<Response> => {
    try {
      const path = new URL(req.url).pathname.replace(/\/+$/, '');
      if (req.method === 'POST' && path.endsWith('/proof/create')) {
        limit(deps, ctx, 'proofCreate');
        const body = parse(ProofCreateRequest, await readJson(req));
        const verification = await deps.avs.verifyAccount({ customerRef: DEMO_CUSTOMER.customerRef });
        const now = deps.now();
        const ttl = clampTtl(body.ttlSeconds);
        const proofId = deps.newProofId();
        const record: ProofRecord = {
          idHash: deps.hash(proofId),
          claims: minimumClaims(verification),
          holder: { displayName: DEMO_CUSTOMER.displayName, accountHint: DEMO_CUSTOMER.accountHint },
          verifiedAt: verification.verifiedAt,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + ttl * 1000).toISOString(),
          status: 'ACTIVE',
          provider: verification.provider,
          simulated: verification.simulated,
        };
        await deps.proofs.save(record);
        return json(201, {
          proofId,
          verifyPath: `/verify/${proofId}`,
          createdAt: record.createdAt,
          expiresAt: record.expiresAt,
          ttlSeconds: ttl,
          claims: record.claims,
          holder: record.holder,
          verifiedAt: record.verifiedAt,
          provider: record.provider,
          simulated: record.simulated,
        });
      }
      if (req.method !== 'GET') return methodNotAllowed(['GET', 'POST']);

      limit(deps, ctx, 'proofRead');
      const id = ctx.params?.id ?? path.split('/').pop() ?? '';
      const now = deps.now();
      if (!isProofId(id)) {
        return json(400, { status: 'INVALID', serverTime: now.toISOString() });
      }
      const record = await deps.proofs.get(deps.hash(id));
      if (!record) return json(404, { status: 'NOT_FOUND', serverTime: now.toISOString() });
      const status = proofStatus(record, now);
      if (status !== 'VALID') {
        // Expired or revoked proofs reveal nothing but their state.
        return json(410, { status, expiresAt: record.expiresAt, serverTime: now.toISOString() });
      }
      return json(200, {
        status,
        claims: record.claims,
        holder: record.holder,
        verifiedAt: record.verifiedAt,
        expiresAt: record.expiresAt,
        serverTime: now.toISOString(),
        provider: record.provider,
        simulated: record.simulated,
      });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

// ---------------------------------------------------------------------------
// POST /api/transaction/check — CallLock + TrustShield re-check. Never moves money.
// ---------------------------------------------------------------------------
export function createTransactionHandler(deps: Deps) {
  return async (req: Request, ctx: RequestContext = {}): Promise<Response> => {
    if (req.method !== 'POST') return methodNotAllowed(['POST']);
    try {
      limit(deps, ctx, 'transaction');
      const body = parse(TransactionRequest, await readJson(req));
      const gate = evaluateCallLock(body.callState, 'SEND_MONEY');
      const base = {
        callLock: { callState: body.callState, protection: gate.protection, decision: gate.decision },
        moneyMoved: false as const,
        checkedAt: deps.now().toISOString(),
      };
      if (gate.decision === 'PAUSE') {
        return json(200, { ...base, decision: 'PAUSED', reasonCode: gate.reasonCode, verdict: null, reasonCodes: [], reasons: [] });
      }
      const risk = evaluateTransaction(body.draft);
      return json(200, {
        ...base,
        decision: risk.risk === 'STOP' ? 'BLOCKED' : 'REVIEW',
        risk: risk.risk,
        verdict: risk.verdict,
        reasonCodes: risk.reasonCodes,
        reasons: risk.signals.map((s) => presentReason(body.language, s)),
        requiresConfirmation: risk.risk !== 'STOP',
      });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export function healthHandler(now: () => Date = () => new Date()) {
  return async (): Promise<Response> => json(200, { status: 'ok', engineVersion: ENGINE_VERSION, time: now().toISOString() });
}

export { errorResponse };
