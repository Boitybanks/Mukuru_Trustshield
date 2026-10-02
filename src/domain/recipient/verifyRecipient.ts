import type { ProofHolder } from '../proof/proof';

/**
 * Server-owned state for recipient verification.
 *
 * The browser may supply an opaque proof ID. It may NEVER supply a trusted
 * "verified" boolean/status. These states are produced by the backend only.
 */
export type RecipientVerificationStatus =
  | 'NOT_REQUIRED'
  | 'REQUIRED'
  | 'VERIFIED'
  | 'INVALID'
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'REVOKED'
  | 'MISMATCH'
  | 'IDENTITY_NOT_VERIFIED'
  | 'OWNERSHIP_NOT_VERIFIED'
  | 'ACCOUNT_INACTIVE'
  | 'CANNOT_RECEIVE_CREDITS'
  | 'UNAVAILABLE';

export interface RecipientVerificationChecks {
  accountExists: boolean;
  identityVerified: boolean;
  ownerMatch: boolean;
  accountActive: boolean;
  acceptsCredits: boolean;
}

export interface RecipientVerificationResult {
  status: RecipientVerificationStatus;
  holder?: ProofHolder;
  checks?: RecipientVerificationChecks;
  provider?: string;
  simulated?: boolean;
  verifiedAt?: string;
  expiresAt?: string;
}

/** Loose equality: case, punctuation, extra whitespace and accents never matter. */
function normaliseName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compare the intended recipient against the holder disclosed by a valid
 * MukuruProof. This helper is pure; the backend decides whether a proof itself
 * is valid and whether its live account-verification facts are acceptable.
 */
export function matchRecipientProof(recipientName: string, proofHolderName: string): 'VERIFIED' | 'MISMATCH' {
  const a = normaliseName(recipientName);
  const b = normaliseName(proofHolderName);
  return a.length > 0 && a === b ? 'VERIFIED' : 'MISMATCH';
}
