// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CallLockPage from '../../src/features/callLock/CallLockPage';
import { installApi, renderWithProviders, stubBrowser } from './harness';
import { CALLLOCK_SCENARIO } from '../../src/data/demoScenarios';
import type { ProofRecord } from '../../src/domain/proof/proof';

beforeEach(() => {
  stubBrowser();
});

function fakeProofId(seed: string): string {
  return seed.repeat(43).slice(0, 43);
}

describe('CallLock ↔ MukuruProof: recipient verification', () => {
  it('a new recipient is verified by the server, then the payment can reach confirmation', async () => {
    const api = installApi();
    const proofId = fakeProofId('v');
    const record: ProofRecord = {
      idHash: api.deps.hash(proofId),
      subjectRef: 'demo-tendai-moyo',
      claims: { identity: 'VERIFIED', accountOwnership: 'VERIFIED', accountStatus: 'ACTIVE', canReceiveCredits: true },
      holder: { displayName: CALLLOCK_SCENARIO.recipientName, accountHint: 'Mukuru wallet •••• 7314' },
      verifiedAt: api.deps.now().toISOString(),
      createdAt: api.deps.now().toISOString(),
      expiresAt: new Date(api.deps.now().getTime() + 600_000).toISOString(),
      status: 'ACTIVE',
      provider: 'SIMULATED_AVS',
      simulated: true,
    };
    // Issued like a real proof: ML-DSA-65 signed, or the server refuses it as tampered.
    record.signature = api.deps.signer.sign(record);
    await api.proofs.save(record);

    const user = userEvent.setup();
    renderWithProviders(<CallLockPage />, { path: '/calllock' });

    await user.selectOptions(screen.getByLabelText('What is this payment for?'), 'FAMILY_SUPPORT');
    await user.clear(screen.getByLabelText('Reference'));
    await user.type(screen.getByLabelText('Reference'), 'Groceries');

    await user.type(screen.getByTestId('verify-recipient-input'), proofId);
    await user.click(screen.getByTestId('verify-recipient-button'));

    const verified = await screen.findByTestId('recipient-verified');
    expect(verified).toHaveAttribute('data-status', 'VERIFIED');
    expect(verified).toHaveTextContent('RECIPIENT VERIFIED');
    expect(verified).toHaveTextContent('Account exists');

    await user.click(screen.getByTestId('send-button'));
    const review = await screen.findByTestId('review-screen');
    expect(review).toHaveAttribute('data-risk', 'NO_WARNING_SIGNS');
    const codes = within(review)
      .getAllByRole('listitem')
      .map((li) => li.getAttribute('data-code'));
    expect(codes).toContain('RECIPIENT_VERIFIED');
    expect(codes).not.toContain('NEW_RECIPIENT');

    await user.click(within(review).getByTestId('confirm-send'));
    expect(await screen.findByTestId('sent-screen')).toBeInTheDocument();
  });

  it('a MukuruProof that belongs to someone else is a hard mismatch', async () => {
    installApi();
    const created = (await (
      await fetch('/api/proof/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    ).json()) as { proofId: string };

    const user = userEvent.setup();
    renderWithProviders(<CallLockPage />, { path: '/calllock' });

    await user.type(screen.getByTestId('verify-recipient-input'), created.proofId);
    await user.click(screen.getByTestId('verify-recipient-button'));

    const mismatch = await screen.findByTestId('recipient-mismatch');
    expect(mismatch).toHaveAttribute('data-status', 'MISMATCH');
    expect(mismatch).toHaveTextContent('Recipient details don’t match');
    expect(mismatch).toHaveTextContent('Blessing Ndlovu');
    expect(screen.getByTestId('do-not-send')).toHaveTextContent('DO NOT SEND');
    expect(screen.getByTestId('send-button')).toBeDisabled();
  });

  it('an invalid MukuruProof cannot create a verified state', async () => {
    installApi();
    const user = userEvent.setup();
    renderWithProviders(<CallLockPage />, { path: '/calllock' });

    await user.type(screen.getByTestId('verify-recipient-input'), 'not-a-real-code');
    await user.click(screen.getByTestId('verify-recipient-button'));

    expect(await screen.findByTestId('verify-recipient-error')).toBeInTheDocument();
    expect(screen.queryByTestId('recipient-verified')).toBeNull();
    expect(screen.queryByTestId('recipient-mismatch')).toBeNull();
  });
});
