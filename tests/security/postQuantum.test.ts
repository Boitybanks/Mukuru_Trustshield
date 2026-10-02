import { describe, expect, it } from 'vitest';
import { createProofHandler, createTransactionHandler } from '../../server/handlers';
import { canonicalProofPayload, createProofSigner, parseSeed, signerFromEnv } from '../../server/postQuantum';
import { CALLLOCK_SCENARIO } from '../../src/data/demoScenarios';
import type { ProofRecord } from '../../src/domain/proof/proof';
import { get, post, TEST_SIGNER, testDeps } from '../api/helpers';

async function createSigned() {
  const t = testDeps();
  const created = await (await createProofHandler(t.deps)(post('/api/proof/create', { profile: 'RECIPIENT' }))).json();
  const record = [...t.proofs.records.values()][0] as ProofRecord;
  return { ...t, created, record };
}

describe('ML-DSA-65 proof signing (NIST FIPS 204)', () => {
  it('signs every new proof and reports a verified integrity summary', async () => {
    const { created, record } = await createSigned();
    expect(record.signature).toMatchObject({ algorithm: 'ML-DSA-65', keyId: TEST_SIGNER.keyId });
    expect(Buffer.from(record.signature!.value, 'base64url')).toHaveLength(3309);
    expect(created.integrity).toEqual({ algorithm: 'ML-DSA-65', standard: 'NIST FIPS 204', keyId: TEST_SIGNER.keyId, verified: true });
  });

  it('verifies the signature on read', async () => {
    const { deps, created } = await createSigned();
    const res = await createProofHandler(deps)(get(`/api/proof/${created.proofId}`));
    expect(res.status).toBe(200);
    expect((await res.json()).integrity.verified).toBe(true);
  });

  it.each<[string, (r: ProofRecord) => void]>([
    ['holder renamed', (r) => (r.holder.displayName = 'Mallory Fraudster')],
    ['claim flipped', (r) => (r.claims.canReceiveCredits = !r.claims.canReceiveCredits)],
    ['expiry extended', (r) => (r.expiresAt = '2099-01-01T00:00:00.000Z')],
    ['signature removed', (r) => delete r.signature],
    ['signature forged', (r) => (r.signature = { ...r.signature!, value: Buffer.alloc(3309, 1).toString('base64url') })],
  ])('refuses a stored proof with %s as TAMPERED', async (_, mutate) => {
    const { deps, created, record } = await createSigned();
    mutate(record);
    const res = await createProofHandler(deps)(get(`/api/proof/${created.proofId}`));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ status: 'TAMPERED', serverTime: expect.any(String) });
  });

  it('blocks payment to a recipient whose stored proof was tampered with', async () => {
    const { deps, created, record } = await createSigned();
    record.claims.identity = 'VERIFIED';
    record.holder.accountHint = '•••• 0000';
    const body = await (
      await createTransactionHandler(deps)(
        post('/api/transaction/check', {
          draft: { ...CALLLOCK_SCENARIO, purpose: 'FAMILY_SUPPORT', reference: 'Groceries', recipientProofId: created.proofId },
          callState: 'INACTIVE',
        }),
      )
    ).json();
    expect(body.recipientVerification.status).toBe('INVALID');
    expect(body.requiresConfirmation).toBe(false);
  });

  it('rejects a signature made by a different key', async () => {
    const { record } = await createSigned();
    const other = createProofSigner(new Uint8Array(32).fill(9));
    expect(other.verify(record)).toBe(false);
    expect(TEST_SIGNER.verify(record)).toBe(true);
  });

  it('signs a canonical payload that excludes the signature itself', async () => {
    const { record } = await createSigned();
    const before = canonicalProofPayload(record);
    expect(canonicalProofPayload({ ...record, signature: undefined })).toEqual(before);
  });
});

describe('ML-DSA key material', () => {
  it('derives the key from TRUSTSHIELD_MLDSA_SEED in hex or base64url', () => {
    const hex = '07'.repeat(32);
    const fromHex = signerFromEnv({ TRUSTSHIELD_MLDSA_SEED: hex });
    const fromB64 = signerFromEnv({ TRUSTSHIELD_MLDSA_SEED: Buffer.from(hex, 'hex').toString('base64url') });
    expect(fromHex.keyId).toBe(TEST_SIGNER.keyId);
    expect(fromB64.keyId).toBe(TEST_SIGNER.keyId);
    expect(fromHex.devKey).toBe(false);
  });

  it('falls back to a labelled dev key when no seed is configured', () => {
    const signer = signerFromEnv({});
    expect(signer.devKey).toBe(true);
    expect(signer.keyId).not.toBe(TEST_SIGNER.keyId);
  });

  it('rejects a seed that is not 32 bytes', () => {
    expect(() => parseSeed('abcd')).toThrow(/32 bytes/);
  });
});
