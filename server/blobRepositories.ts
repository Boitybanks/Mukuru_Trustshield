import { getDeployStore, getStore } from '@netlify/blobs';
import type { Store } from '@netlify/blobs';
import type { ProofRecord } from '../src/domain/proof/proof';
import { mergeReport } from './repositories';
import type { IncrementResult, ProofRepository, ReportInput, ReportRecord, ReportRepository } from './repositories';
import { sha256Hex } from './crypto';

export const REPORT_STORE = 'trustshield-reports';
export const PROOF_STORE = 'mukuruproof-tokens';

interface NetlifyGlobal {
  context?: { deploy?: { context?: string } } | null;
}

/**
 * Production data lives in the site-wide store. Deploy previews, branch
 * deploys and local dev use a deploy-scoped store so test traffic never
 * pollutes the live warning counts.
 */
function openStore(name: string): Store {
  const deployContext = (globalThis as { Netlify?: NetlifyGlobal }).Netlify?.context?.deploy?.context;
  return deployContext === 'production'
    ? getStore({ name, consistency: 'strong' })
    : getDeployStore({ name, consistency: 'strong' });
}

/** Blob keys are hashes, so arbitrary canonical values can never break key rules (≤600 bytes, no odd chars). */
export function reportBlobKey(canonicalKey: string): string {
  return sha256Hex(canonicalKey).slice(0, 40);
}

export class BlobReportRepository implements ReportRepository {
  private store: Store | null = null;

  private get s(): Store {
    this.store ??= openStore(REPORT_STORE);
    return this.store;
  }

  async get(canonicalKey: string): Promise<ReportRecord | null> {
    return ((await this.s.get(reportBlobKey(canonicalKey), { type: 'json' })) as ReportRecord | null) ?? null;
  }

  async getCounts(keys: string[]): Promise<Record<string, number>> {
    const entries = await Promise.all(keys.map(async (k) => [k, (await this.get(k))?.reportCount ?? 0] as const));
    return Object.fromEntries(entries);
  }

  /** Optimistic concurrency: retry when another report landed between our read and write. */
  async increment(input: ReportInput, fp: string | null, now: Date): Promise<IncrementResult> {
    const key = reportBlobKey(input.canonicalKey);
    for (let attempt = 0; attempt < 5; attempt++) {
      const current = await this.s.getWithMetadata(key, { type: 'json' });
      const existing = (current?.data as ReportRecord | undefined) ?? null;
      const result = mergeReport(existing, input, key, fp, now);
      if (result.duplicate) return result;
      const write = current?.etag
        ? await this.s.setJSON(key, result.record, { onlyIfMatch: current.etag })
        : await this.s.setJSON(key, result.record, { onlyIfNew: true });
      if (write.modified) return result;
    }
    throw new Error('REPORT_WRITE_CONFLICT');
  }
}

export class BlobProofRepository implements ProofRepository {
  private store: Store | null = null;

  private get s(): Store {
    this.store ??= openStore(PROOF_STORE);
    return this.store;
  }

  async save(record: ProofRecord): Promise<void> {
    await this.s.setJSON(record.idHash, record);
  }

  async get(idHash: string): Promise<ProofRecord | null> {
    return ((await this.s.get(idHash, { type: 'json' })) as ProofRecord | null) ?? null;
  }
}
