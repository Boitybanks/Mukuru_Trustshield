import { describe, expect, it } from 'vitest';
import { matchRecipientProof } from '../../src/domain/recipient/verifyRecipient';
import { evaluateTransaction } from '../../src/domain/transaction/evaluateTransaction';
import type { TransactionDraft } from '../../src/domain/transaction/evaluateTransaction';

const familyDraft: TransactionDraft = {
  recipientName: 'Tendai Moyo',
  recipientIsNew: true,
  amount: 500,
  currency: 'ZAR',
  purpose: 'FAMILY_SUPPORT',
  reference: 'School fees',
};

describe('MukuruProof ↔ Send Money wiring', () => {
  it('matches names once case, punctuation and whitespace are normalised', () => {
    expect(matchRecipientProof('Tendai Moyo', 'Tendai Moyo')).toBe('VERIFIED');
    expect(matchRecipientProof('  tendai   moyo ', 'Tendai Moyo')).toBe('VERIFIED');
    expect(matchRecipientProof('Tendai Moyo.', 'Tendai Moyo')).toBe('VERIFIED');
  });

  it('is a MISMATCH when the proof belongs to someone else', () => {
    expect(matchRecipientProof('Tendai Moyo', 'Simba Moyo')).toBe('MISMATCH');
    expect(matchRecipientProof('', 'Tendai Moyo')).toBe('MISMATCH');
  });

  it('a server-verified recipient replaces NEW_RECIPIENT with RECIPIENT_VERIFIED', () => {
    const result = evaluateTransaction(familyDraft, 'VERIFIED');
    expect(result.reasonCodes).toContain('RECIPIENT_VERIFIED');
    expect(result.reasonCodes).not.toContain('NEW_RECIPIENT');
    expect(result).toMatchObject({ risk: 'NO_WARNING_SIGNS', verdict: null });
  });

  it('a new recipient without server verification requires a proof and cannot be treated as verified', () => {
    const result = evaluateTransaction(familyDraft, 'REQUIRED');
    expect(result.reasonCodes).toContain('NEW_RECIPIENT');
    expect(result.reasonCodes).toContain('RECIPIENT_PROOF_REQUIRED');
    expect(result.reasonCodes).not.toContain('RECIPIENT_VERIFIED');
    expect(result).toMatchObject({ risk: 'CAUTION', verdict: 'CANT_CONFIRM' });
  });

  it('a proof mismatch is a hard STOP even for a previously-paid recipient', () => {
    const result = evaluateTransaction({ ...familyDraft, recipientIsNew: false }, 'MISMATCH');
    expect(result.reasonCodes).toContain('RECIPIENT_PROOF_MISMATCH');
    expect(result).toMatchObject({ risk: 'STOP', verdict: 'NOT_OFFICIAL' });
  });
});
