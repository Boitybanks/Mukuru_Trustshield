/**
 * Connects MukuruProof to the send-money flow.
 *
 * Before this module existed, "Send Money" and "MukuruProof" were parallel
 * systems: TrustShield only ever asked "does this payment *look* unsafe?"
 * (see `transaction/evaluateTransaction.ts`). It never asked "am I actually
 * paying the person I think I am?" — the question MukuruProof answers.
 *
 * `matchRecipientProof` is the one pure function that bridges them: it
 * compares what the customer typed as the recipient's name against the
 * verified identity disclosed by a MukuruProof, so a new recipient can be
 * turned from "new recipient ⚠" into either "RECIPIENT VERIFIED ✓" or a hard
 * "recipient details don't match — do not send" stop.
 */
export type RecipientVerificationStatus = 'VERIFIED' | 'MISMATCH';

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
 * Compares the recipient name the customer entered against the name on a
 * valid MukuruProof. VERIFIED only when the names match once normalised;
 * anything else is a MISMATCH — the account exists and is verified, but it
 * does not belong to the person the customer believes they are paying.
 */
export function matchRecipientProof(recipientName: string, proofHolderName: string): RecipientVerificationStatus {
  const a = normaliseName(recipientName);
  const b = normaliseName(proofHolderName);
  return a.length > 0 && a === b ? 'VERIFIED' : 'MISMATCH';
}
