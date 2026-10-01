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

  it('a verified recipient replaces NEW_RECIPIENT with a positive RECIPIENT_VERIFIED signal and no warning', () => {
    const result = evaluateTransaction({ ...familyDraft, recipientVerification: 'VERIFIED' });
    expect(result.reasonCodes).toContain('RECIPIENT_VERIFIED');
    expect(result.reasonCodes).not.toContain('NEW_RECIPIENT');
    expect(result).toMatchObject({ risk: 'NO_WARNING_SIGNS', verdict: null });
  });

  it('an unverified new recipient keeps the existing NEW_RECIPIENT behaviour', () => {
    const result = evaluateTransaction(familyDraft);
    expect(result.reasonCodes).toContain('NEW_RECIPIENT');
    expect(result.reasonCodes).not.toContain('RECIPIENT_VERIFIED');
  });

  it('a MukuruProof mismatch is a hard STOP — "do not send" — even for a previously-paid recipient', () => {
    const result = evaluateTransaction({ ...familyDraft, recipientIsNew: false, recipientVerification: 'MISMATCH' });
    expect(result.reasonCodes).toContain('RECIPIENT_PROOF_MISMATCH');
    expect(result.reasonCodes).not.toContain('NEW_RECIPIENT');
    expect(result).toMatchObject({ risk: 'STOP', verdict: 'NOT_OFFICIAL' });
  });
});
