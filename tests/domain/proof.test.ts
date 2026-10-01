import { describe, expect, it } from 'vitest';
import {
  DEMO_CUSTOMER,
  SimulatedAccountVerificationProvider,
  UnknownCustomerError,
} from '../../src/domain/proof/accountVerification';
import { clampTtl, isProofId, minimumClaims, proofStatus, PROOF_TTL_SECONDS } from '../../src/domain/proof/proof';

describe('MukuruProof', () => {
  it('the simulated AVS adapter answers only for the synthetic demo customer', async () => {
    const avs = new SimulatedAccountVerificationProvider(() => new Date('2026-10-01T10:00:00Z'));
    expect(avs.simulated).toBe(true);
    const result = await avs.verifyAccount({ customerRef: DEMO_CUSTOMER.customerRef });
    expect(result).toMatchObject({ accountActive: true, ownerMatch: true, acceptsCredits: true, simulated: true });
    await expect(avs.verifyAccount({ customerRef: 'someone-else' })).rejects.toBeInstanceOf(UnknownCustomerError);
  });

  it('discloses only the four minimum claims — no balance, history, statement or ID document', async () => {
    const result = await new SimulatedAccountVerificationProvider().verifyAccount({ customerRef: DEMO_CUSTOMER.customerRef });
    const claims = minimumClaims(result);
    expect(Object.keys(claims).sort()).toEqual(['accountOwnership', 'accountStatus', 'canReceiveCredits', 'identity']);
    expect(JSON.stringify(claims)).not.toMatch(/balance|transaction|statement|document|idNumber/i);
  });

  it('proof expiry', () => {
    const record = { status: 'ACTIVE' as const, expiresAt: '2026-10-01T10:10:00.000Z' };
    expect(proofStatus(record, new Date('2026-10-01T10:09:59Z'))).toBe('VALID');
    expect(proofStatus(record, new Date('2026-10-01T10:10:00Z'))).toBe('EXPIRED');
    expect(proofStatus({ ...record, status: 'REVOKED' }, new Date('2026-10-01T10:00:00Z'))).toBe('REVOKED');
  });

  it('defaults to 10 minutes and clamps demo lifetimes', () => {
    expect(PROOF_TTL_SECONDS).toBe(600);
    expect(clampTtl(undefined)).toBe(600);
    expect(clampTtl(1)).toBe(10);
    expect(clampTtl(15)).toBe(15);
    expect(clampTtl(99999)).toBe(600);
    expect(clampTtl(Number.NaN)).toBe(600);
  });

  it('accepts only well-formed 256-bit opaque IDs', () => {
    expect(isProofId('A'.repeat(43))).toBe(true);
    expect(isProofId('A'.repeat(42))).toBe(false);
    expect(isProofId('../../etc/passwd')).toBe(false);
    expect(isProofId('<script>alert(1)</script>')).toBe(false);
  });
});
