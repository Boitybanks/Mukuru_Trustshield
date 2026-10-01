import type { InputType, ReasonCode } from '../src/domain/types';
import type { ProofRecord } from '../src/domain/proof/proof';
import { MAX_REPORTER_FINGERPRINTS } from '../src/domain/reports/policy';

/**
 * Persistence ports. Handlers depend on these interfaces; Netlify Blobs
 * implements them in production and an in-memory map in tests.
 */

/** What we keep about a reported entity — no message text, no personal data. */
export interface ReportRecord {
  id: string;
  canonicalKey: string;
  canonicalValue: string;
  inputType: InputType;
  reasonCodes: ReasonCode[];
  reportedAt: string;
  lastReportedAt: string;
  reportCount: number;
  /** Truncated SHA-256 of (anonymous browser id + key). Used only to ignore repeat reports. */
  reporterFingerprints: string[];
}

export interface ReportInput {
  canonicalKey: string;
  canonicalValue: string;
  inputType: InputType;
  reasonCodes: ReasonCode[];
}

export interface IncrementResult {
  record: ReportRecord;
  duplicate: boolean;
}

export interface ReportRepository {
  get(canonicalKey: string): Promise<ReportRecord | null>;
  getCounts(canonicalKeys: string[]): Promise<Record<string, number>>;
  increment(input: ReportInput, reporterFingerprint: string | null, now: Date): Promise<IncrementResult>;
}

export interface ProofRepository {
  save(record: ProofRecord): Promise<void>;
  get(idHash: string): Promise<ProofRecord | null>;
}

/** Pure merge used by every repository implementation. */
export function mergeReport(
  existing: ReportRecord | null,
  input: ReportInput,
  id: string,
  reporterFingerprint: string | null,
  now: Date,
): IncrementResult {
  const at = now.toISOString();
  if (existing && reporterFingerprint && existing.reporterFingerprints.includes(reporterFingerprint)) {
    return { record: existing, duplicate: true };
  }
  const fingerprints = existing?.reporterFingerprints ?? [];
  const nextFingerprints = reporterFingerprint
    ? [...fingerprints, reporterFingerprint].slice(-MAX_REPORTER_FINGERPRINTS)
    : fingerprints;
  const record: ReportRecord = {
    id,
    canonicalKey: input.canonicalKey,
    canonicalValue: input.canonicalValue,
    inputType: existing?.inputType ?? input.inputType,
    reasonCodes: Array.from(new Set([...(existing?.reasonCodes ?? []), ...input.reasonCodes])).slice(0, 40),
    reportedAt: existing?.reportedAt ?? at,
    lastReportedAt: at,
    reportCount: (existing?.reportCount ?? 0) + 1,
    reporterFingerprints: nextFingerprints,
  };
  return { record, duplicate: false };
}

export class InMemoryReportRepository implements ReportRepository {
  readonly records = new Map<string, ReportRecord>();

  constructor(private readonly idFor: (key: string) => string = (k) => k) {}

  async get(canonicalKey: string): Promise<ReportRecord | null> {
    return this.records.get(canonicalKey) ?? null;
  }

  async getCounts(keys: string[]): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const k of keys) out[k] = this.records.get(k)?.reportCount ?? 0;
    return out;
  }

  async increment(input: ReportInput, fp: string | null, now: Date): Promise<IncrementResult> {
    const result = mergeReport(this.records.get(input.canonicalKey) ?? null, input, this.idFor(input.canonicalKey), fp, now);
    if (!result.duplicate) this.records.set(input.canonicalKey, result.record);
    return result;
  }
}

export class InMemoryProofRepository implements ProofRepository {
  readonly records = new Map<string, ProofRecord>();

  async save(record: ProofRecord): Promise<void> {
    this.records.set(record.idHash, record);
  }

  async get(idHash: string): Promise<ProofRecord | null> {
    return this.records.get(idHash) ?? null;
  }
}
