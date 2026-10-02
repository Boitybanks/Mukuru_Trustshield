import { createHash } from 'node:crypto';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import type { ProofIntegrity, ProofRecord, ProofSignature } from '../src/domain/proof/proof';

/**
 * Post-quantum integrity for stored MukuruProof records.
 *
 * Every proof is signed at creation with ML-DSA-65 (NIST FIPS 204) and
 * re-verified on every read. If anyone edits a stored record — flips a claim,
 * renames the holder, extends the expiry — the signature no longer matches
 * and the proof is refused as TAMPERED.
 */
export const PQC_ALGORITHM = 'ML-DSA-65';
export const PQC_STANDARD = 'NIST FIPS 204';

/** Fixed context string: a signature for anything else can never verify as a proof. */
const CONTEXT = new TextEncoder().encode('mukuru-trustshield/proof/v1');
const DEV_SEED_LABEL = 'mukuru-trustshield/dev-only-mldsa-seed';

export interface ProofSigner {
  readonly keyId: string;
  /** True when no TRUSTSHIELD_MLDSA_SEED was configured and a public dev seed is in use. */
  readonly devKey: boolean;
  sign(record: ProofRecord): ProofSignature;
  verify(record: ProofRecord): boolean;
  integrity(record: ProofRecord): ProofIntegrity;
}

/** The exact bytes that are signed: every field a verifier relies on, in a fixed order. */
export function canonicalProofPayload(record: ProofRecord): Uint8Array {
  const payload = [
    'v1',
    record.idHash,
    record.subjectRef ?? '',
    record.claims.identity,
    record.claims.accountOwnership,
    record.claims.accountStatus,
    String(record.claims.canReceiveCredits),
    record.holder.displayName,
    record.holder.accountHint,
    record.verifiedAt,
    record.createdAt,
    record.expiresAt,
    record.status,
    record.provider,
    String(record.simulated),
  ];
  return new TextEncoder().encode(JSON.stringify(payload));
}

/** Accepts a 32-byte seed as 64 hex chars or base64/base64url. */
export function parseSeed(raw: string): Uint8Array {
  const value = raw.trim();
  const bytes = /^[0-9a-fA-F]{64}$/.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64url');
  if (bytes.length !== 32) throw new Error('TRUSTSHIELD_MLDSA_SEED must decode to exactly 32 bytes');
  return new Uint8Array(bytes);
}

export function createProofSigner(seed: Uint8Array, devKey = false): ProofSigner {
  const { publicKey, secretKey } = ml_dsa65.keygen(seed);
  const keyId = createHash('sha256').update(publicKey).digest('hex').slice(0, 16);

  const verify = (record: ProofRecord): boolean => {
    const sig = record.signature;
    if (!sig || sig.algorithm !== PQC_ALGORITHM || sig.keyId !== keyId) return false;
    try {
      return ml_dsa65.verify(Buffer.from(sig.value, 'base64url'), canonicalProofPayload(record), publicKey, { context: CONTEXT });
    } catch {
      return false;
    }
  };

  return {
    keyId,
    devKey,
    sign: (record) => ({
      algorithm: PQC_ALGORITHM,
      keyId,
      value: Buffer.from(ml_dsa65.sign(canonicalProofPayload(record), secretKey, { context: CONTEXT })).toString('base64url'),
    }),
    verify,
    integrity: (record) => ({ algorithm: PQC_ALGORITHM, standard: PQC_STANDARD, keyId, verified: verify(record) }),
  };
}

/** Production key from the TRUSTSHIELD_MLDSA_SEED secret; a clearly-labelled dev key otherwise. */
export function signerFromEnv(env: Record<string, string | undefined> = process.env): ProofSigner {
  const raw = env.TRUSTSHIELD_MLDSA_SEED;
  if (raw) return createProofSigner(parseSeed(raw));
  return createProofSigner(new Uint8Array(createHash('sha256').update(DEV_SEED_LABEL).digest()), true);
}
