import type { CheckResult, Entity, Language, OfficialRecordSummary, Signal, Verdict, InputType } from '../domain/types';
import { check } from '../domain/checker/check';
import { evaluateTransaction } from '../domain/transaction/evaluateTransaction';
import type { TransactionDraft, TransactionRisk } from '../domain/transaction/evaluateTransaction';
import type { CallState } from '../domain/callLock/callSafety';
import type { ProofClaims, ProofHolder, ProofIntegrity } from '../domain/proof/proof';
import type { RecipientVerificationResult } from '../domain/recipient/verifyRecipient';

/** What the UI needs to render a check. Text is rendered client-side from codes so language switches are instant. */
export interface CheckView {
  verdict: Verdict;
  inputType: InputType;
  signals: Signal[];
  entities: Pick<Entity, 'kind' | 'display' | 'status' | 'canonicalKey'>[];
  matchedOfficialRecord: OfficialRecordSummary | null;
  reportCount: number;
  reportableKeys: string[];
  truncated: boolean;
  source: 'api' | 'device';
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

async function postJson<T>(url: string, body: unknown, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: { code?: string } };
    if (!res.ok) throw new ApiError(res.status, data.error?.code ?? `HTTP_${res.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function fromResult(result: CheckResult, source: CheckView['source']): CheckView {
  return {
    verdict: result.verdict,
    inputType: result.inputType,
    signals: result.signals,
    entities: result.entities.map(({ kind, display, status, canonicalKey }) => ({ kind, display, status, canonicalKey })),
    matchedOfficialRecord: result.matchedOfficialRecord,
    reportCount: result.reportCount,
    reportableKeys: result.reportableKeys,
    truncated: result.truncated,
    source,
  };
}

/**
 * Calls POST /api/check. If the network is slow or down, runs the very same
 * rules engine on the device so the customer still gets an answer.
 */
export async function checkInput(input: string, language: Language): Promise<CheckView> {
  try {
    const data = await postJson<Omit<CheckView, 'source'>>('/api/check', { input, language });
    return { ...data, source: 'api' };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 400 || err.status === 413)) throw err;
    return fromResult(check(input), 'device');
  }
}

export interface ReportResponse {
  reported: { canonicalKey: string; canonicalValue: string; reportCount: number; duplicate: boolean }[];
  reportCount: number;
  alreadyReported: boolean;
}

export function reportInput(input: string, reporterId: string, language: Language): Promise<ReportResponse> {
  return postJson<ReportResponse>('/api/report', { input, reporterId, language });
}

export interface TransactionCheckResponse {
  decision: 'PAUSED' | 'REVIEW' | 'BLOCKED';
  risk?: TransactionRisk['risk'];
  verdict: TransactionRisk['verdict'];
  reasonCodes: string[];
  moneyMoved: false;
  recipientVerification?: RecipientVerificationResult;
  requiresConfirmation?: boolean;
}

function localTransactionFallback(draft: TransactionDraft): TransactionRisk {
  const recipientVerification: RecipientVerificationResult = draft.recipientIsNew ? { status: 'UNAVAILABLE' } : { status: 'NOT_REQUIRED' };
  const risk = evaluateTransaction(draft, recipientVerification.status);
  return {
    ...risk,
    recipientVerification,
    requiresConfirmation: !draft.recipientIsNew && risk.risk !== 'STOP',
  };
}

/**
 * Re-runs TrustShield on a payment. The server is authoritative for recipient
 * verification. If the network fails, a NEW recipient is never treated as
 * verified and cannot reach final confirmation.
 */
export async function checkTransaction(draft: TransactionDraft, callState: CallState, language: Language): Promise<TransactionRisk> {
  try {
    const data = await postJson<TransactionCheckResponse & { reasons?: { code: string; severity: Signal['severity'] }[] }>(
      '/api/transaction/check',
      { draft, callState, language },
    );
    if (data.decision === 'PAUSED' || !data.risk) return localTransactionFallback(draft);
    return {
      risk: data.risk,
      verdict: data.verdict,
      reasonCodes: data.reasonCodes as TransactionRisk['reasonCodes'],
      signals: (data.reasons ?? []).map((r) => ({ code: r.code as Signal['code'], severity: r.severity })),
      recipientVerification: data.recipientVerification,
      requiresConfirmation: data.requiresConfirmation,
    };
  } catch {
    return localTransactionFallback(draft);
  }
}

export interface ProofCreated {
  proofId: string;
  verifyPath: string;
  createdAt: string;
  expiresAt: string;
  claims: ProofClaims;
  holder: ProofHolder;
  verifiedAt: string;
  provider: string;
  simulated: boolean;
  integrity?: ProofIntegrity;
}

export type DemoProofProfile = 'CUSTOMER' | 'RECIPIENT' | 'MISMATCH';

export function createProof(ttlSeconds?: number, profile: DemoProofProfile = 'CUSTOMER'): Promise<ProofCreated> {
  const body: { ttlSeconds?: number; profile: DemoProofProfile } = { profile };
  if (ttlSeconds !== undefined) body.ttlSeconds = ttlSeconds;
  return postJson<ProofCreated>('/api/proof/create', body);
}

export type ProofLookup =
  | {
      status: 'VALID';
      claims: ProofClaims;
      holder: ProofHolder;
      verifiedAt: string;
      expiresAt: string;
      serverTime: string;
      provider: string;
      simulated: boolean;
      integrity?: ProofIntegrity;
    }
  | { status: 'EXPIRED' | 'REVOKED'; expiresAt: string; serverTime: string }
  | { status: 'NOT_FOUND' | 'INVALID' | 'TAMPERED'; serverTime?: string };

export async function lookupProof(id: string): Promise<ProofLookup> {
  const res = await fetch(`/api/proof/${encodeURIComponent(id)}`, { headers: { accept: 'application/json' } });
  const data = (await res.json().catch(() => null)) as ProofLookup | null;
  if (data && 'status' in data) return data;
  throw new ApiError(res.status, 'BAD_RESPONSE');
}
