// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CallLockPage from '../../src/features/callLock/CallLockPage';
import { installApi, renderWithProviders, stubBrowser } from './harness';
import { CALLLOCK_SCENARIO } from '../../src/data/demoScenarios';

beforeEach(() => {
  stubBrowser();
});

/** A well-formed, otherwise-unseen proof ID for direct repository seeding. */
function fakeProofId(seed: string): string {
  return seed.repeat(43).slice(0, 43);
}

describe('CallLock ↔ MukuruProof: recipient verification', () => {
  it('a new recipient can be verified with MukuruProof, replacing NEW_RECIPIENT with RECIPIENT_VERIFIED', async () => {
    const api = installApi();
    const proofId = fakeProofId('v');
    await api.proofs.save({
      idHash: api.deps.hash(proofId),
      claims: { identity: 'VERIFIED', accountOwnership: 'VERIFIED', accountStatus: 'ACTIVE', canReceiveCredits: true },
      holder: { displayName: CALLLOCK_SCENARIO.recipientName, accountHint: 'Mukuru wallet •••• 1234' },
      verifiedAt: api.deps.now().toISOString(),
      createdAt: api.deps.now().toISOString(),
      expiresAt: new Date(api.deps.now().getTime() + 600_000).toISOString(),
      status: 'ACTIVE',
      provider: 'SIMULATED_AVS',
      simulated: true,
    });

    const user = userEvent.setup();
    renderWithProviders(<CallLockPage />, { path: '/calllock' });

    // Remove the job-fee warning signs so verification is the only variable under test.
    await user.selectOptions(screen.getByLabelText('What is this payment for?'), 'FAMILY_SUPPORT');
    await user.clear(screen.getByLabelText('Reference'));
    await user.type(screen.getByLabelText('Reference'), 'Groceries');

    await user.type(screen.getByTestId('verify-recipient-input'), proofId);
    await user.click(screen.getByTestId('verify-recipient-button'));

    const verified = await screen.findByTestId('recipient-verified');
    expect(verified).toHaveAttribute('data-status', 'VERIFIED');
    expect(verified).toHaveTextContent('RECIPIENT VERIFIED');

    await user.click(screen.getByTestId('send-button'));
    const review = await screen.findByTestId('review-screen');
    // "(recruiter)" in the recipient's own name still trips a job-context signal —
    // verification answers identity, not whether the payment itself looks risky.
    expect(review).toHaveAttribute('data-risk', 'CAUTION');
    const codes = within(review)
      .getAllByRole('listitem')
      .map((li) => li.getAttribute('data-code'));
    expect(codes).toContain('RECIPIENT_VERIFIED');
    expect(codes).not.toContain('NEW_RECIPIENT');

    await user.click(within(review).getByRole('checkbox'));
    await user.click(within(review).getByTestId('confirm-send'));
    expect(await screen.findByTestId('sent-screen')).toBeInTheDocument();
  });

  it('a MukuruProof that belongs to someone else is a mismatch: DO NOT SEND, and the send button is disabled', async () => {
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

  it('an invalid MukuruProof code shows an inline error and verifies nothing', async () => {
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
