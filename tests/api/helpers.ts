import { createHash } from 'node:crypto';
import { SimulatedAccountVerificationProvider } from '../../src/domain/proof/accountVerification';
import type { Deps } from '../../server/handlers';
import { createProofSigner } from '../../server/postQuantum';
import { MemoryRateLimiter } from '../../server/rateLimit';
import { InMemoryProofRepository, InMemoryReportRepository } from '../../server/repositories';

/** Keygen is the slow part of ML-DSA, so tests share one fixed key. */
export const TEST_SIGNER = createProofSigner(new Uint8Array(32).fill(7));

export function testDeps(overrides: Partial<Deps> = {}, start = new Date('2026-10-01T10:00:00.000Z')) {
  let clock = start;
  let n = 0;
  const reports = new InMemoryReportRepository();
  const proofs = new InMemoryProofRepository();
  const deps: Deps = {
    signer: TEST_SIGNER,
    reports,
    proofs,
    avs: new SimulatedAccountVerificationProvider(() => clock),
    rateLimiter: new MemoryRateLimiter(() => clock.getTime()),
    now: () => clock,
    newProofId: () => `${String(++n).padStart(3, '0')}${'x'.repeat(40)}`,
    hash: (v) => createHash('sha256').update(v).digest('hex'),
    ...overrides,
  };
  return {
    deps,
    reports,
    proofs,
    advance: (seconds: number) => {
      clock = new Date(clock.getTime() + seconds * 1000);
    },
  };
}

export function post(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`https://trustshield.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

export function get(path: string): Request {
  return new Request(`https://trustshield.test${path}`);
}
