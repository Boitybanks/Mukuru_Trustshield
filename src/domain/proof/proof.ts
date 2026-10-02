import type { AccountVerificationResult } from './accountVerification';

/** Default proof lifetime: 10 minutes. */
export const PROOF_TTL_SECONDS = 600;
/** Demo control for showing expiry live. */
export const MIN_PROOF_TTL_SECONDS = 10;

/** 32 random bytes, base64url → 43 characters. Anything else is rejected before storage is touched. */
export const PROOF_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function isProofId(value: string): boolean {
  return PROOF_ID_PATTERN.test(value);
}

/**
 * The ONLY facts a verifier ever sees. No balance, no transactions, no
 * statement, no identity document, no account number.
 */
export interface ProofClaims {
  identity: 'VERIFIED' | 'NOT_VERIFIED';
  accountOwnership: 'VERIFIED' | 'NOT_VERIFIED';
  accountStatus: 'ACTIVE' | 'INACTIVE';
  canReceiveCredits: boolean;
}

export interface ProofHolder {
  displayName: string;
  accountHint: string;
}

export interface ProofRecord {
  /** SHA-256 of the proof ID — the raw ID is never stored. */
  idHash: string;
  /** Opaque subject ref used only to re-run authorised account verification. */
  subjectRef?: string;
  claims: ProofClaims;
  holder: ProofHolder;
  verifiedAt: string;
  createdAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'REVOKED';
  provider: string;
  simulated: boolean;
}

export type ProofStatus = 'VALID' | 'EXPIRED' | 'REVOKED';

export function minimumClaims(result: AccountVerificationResult): ProofClaims {
  return {
    identity: result.identityVerified ? 'VERIFIED' : 'NOT_VERIFIED',
    accountOwnership: result.ownerMatch ? 'VERIFIED' : 'NOT_VERIFIED',
    accountStatus: result.accountActive ? 'ACTIVE' : 'INACTIVE',
    canReceiveCredits: result.acceptsCredits,
  };
}

export function proofStatus(record: Pick<ProofRecord, 'status' | 'expiresAt'>, now: Date): ProofStatus {
  if (record.status === 'REVOKED') return 'REVOKED';
  return now.getTime() >= Date.parse(record.expiresAt) ? 'EXPIRED' : 'VALID';
}

export function clampTtl(requested: number | undefined): number {
  if (requested === undefined || !Number.isFinite(requested)) return PROOF_TTL_SECONDS;
  return Math.min(PROOF_TTL_SECONDS, Math.max(MIN_PROOF_TTL_SECONDS, Math.round(requested)));
}
