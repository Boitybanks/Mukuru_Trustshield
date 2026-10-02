import { SimulatedAccountVerificationProvider } from '../src/domain/proof/accountVerification';
import { BlobProofRepository, BlobReportRepository } from './blobRepositories';
import { randomProofId, sha256Hex } from './crypto';
import { signerFromEnv } from './postQuantum';
import type { Deps } from './handlers';
import { MemoryRateLimiter } from './rateLimit';

let cached: Deps | null = null;

/** Production wiring: Netlify Blobs persistence + simulated AVS adapter. Created lazily per function instance. */
export function productionDeps(): Deps {
  cached ??= {
    reports: new BlobReportRepository(),
    proofs: new BlobProofRepository(),
    avs: new SimulatedAccountVerificationProvider(),
    rateLimiter: new MemoryRateLimiter(),
    now: () => new Date(),
    newProofId: randomProofId,
    hash: sha256Hex,
    signer: signerFromEnv(),
  };
  return cached;
}
