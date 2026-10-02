// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CallLockPage from '../../src/features/callLock/CallLockPage';
import { installApi, renderWithProviders, stubBrowser } from './harness';

beforeEach(() => {
  stubBrowser();
});

type User = ReturnType<typeof userEvent.setup>;

/** Fills the send-money form by field id, so it works in every language. */
async function fillPayment(user: User, payment: { name: string; amount: string; purpose: string; reference: string }) {
  const field = (id: string) => document.getElementById(id) as HTMLElement;
  await user.type(field('tx-recipient'), payment.name);
  await user.type(field('tx-amount'), payment.amount);
  await user.selectOptions(field('tx-purpose'), payment.purpose);
  await user.type(field('tx-reference'), payment.reference);
}

const SCAM_PAYMENT = { name: 'Tendai Moyo', amount: '850', purpose: 'JOB_FEE', reference: 'Employment account activation' };

describe('Send money (CallLock) UI', () => {
  it('starts with an empty form and cannot send until a recipient and amount are entered', () => {
    installApi();
    renderWithProviders(<CallLockPage />, { path: '/calllock' });
    expect(document.getElementById('tx-recipient')).toHaveValue('');
    expect(screen.getByTestId('send-button')).toBeDisabled();
    expect(screen.queryByText(/demo|hackathon|simulated/i)).toBeNull();
  });

  it('pauses the payment during a call, then re-checks (never sends) when the call ends', async () => {
    installApi();
    const user = userEvent.setup();
    renderWithProviders(<CallLockPage />, { path: '/calllock' });
    await fillPayment(user, SCAM_PAYMENT);

    await user.click(screen.getByTestId('simulate-call'));
    expect(screen.getByTestId('call-state')).toHaveAttribute('data-state', 'ACTIVE');
    expect(screen.getByTestId('call-banner')).toHaveTextContent('Call in progress');

    await user.click(screen.getByTestId('send-button'));
    const paused = await screen.findByTestId('paused-screen');
    expect(paused).toHaveTextContent('CALL IN PROGRESS');
    expect(paused).toHaveTextContent('For your protection, you can’t send money while you’re on a call.');
    expect(paused).toHaveTextContent('End the call first. Then come back and check the payment again.');
    expect(within(paused).queryByRole('button', { name: /continue|anyway|send/i })).toBeNull();
    expect(screen.getByTestId('money-sent')).toHaveAttribute('data-sent', 'false');

    await user.click(screen.getByTestId('end-call'));
    const review = await screen.findByTestId('review-screen');
    expect(review).toHaveAttribute('data-risk', 'STOP');
    expect(within(review).getByTestId('tx-verdict')).toHaveAttribute('data-verdict', 'NOT_OFFICIAL');
    const codes = within(review)
      .getAllByRole('listitem')
      .map((li) => li.getAttribute('data-code'));
    expect(codes).toEqual(expect.arrayContaining(['NEW_RECIPIENT', 'UPFRONT_FEE', 'FAKE_JOB_CONTEXT']));
    // Reason codes are for machines, not customers.
    expect(review).not.toHaveTextContent('UPFRONT_FEE');
    expect(within(review).getByTestId('review-amount')).toHaveTextContent('R850');
    expect(within(review).queryByTestId('confirm-send')).toBeNull();
    expect(screen.getByTestId('money-sent')).toHaveAttribute('data-sent', 'false');
  });

  it('a verified new recipient goes to review and only sends after explicit confirmation', async () => {
    installApi();
    const proof = (await (
      await fetch('/api/proof/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"profile":"RECIPIENT"}' })
    ).json()) as { proofId: string };
    const user = userEvent.setup();
    renderWithProviders(<CallLockPage />, { path: '/calllock' });
    await fillPayment(user, { name: 'Tendai Moyo', amount: '850', purpose: 'FAMILY_SUPPORT', reference: 'Groceries' });

    await user.type(screen.getByTestId('verify-recipient-input'), proof.proofId);
    await user.click(screen.getByTestId('verify-recipient-button'));
    expect(await screen.findByTestId('recipient-verified')).toHaveAttribute('data-status', 'VERIFIED');

    await user.click(screen.getByTestId('send-button'));
    const review = await screen.findByTestId('review-screen');
    expect(screen.getByTestId('money-sent')).toHaveAttribute('data-sent', 'false');
    expect(review).toHaveAttribute('data-risk', 'NO_WARNING_SIGNS');
    expect(within(review).getByTestId('confirm-send')).toBeEnabled();

    await user.click(within(review).getByTestId('confirm-send'));
    expect(await screen.findByTestId('sent-screen')).toBeInTheDocument();
    expect(screen.getByTestId('money-sent')).toHaveAttribute('data-sent', 'true');
  });

  it.each([
    ['pt', 'CHAMADA EM CURSO', 'Para sua proteção, não pode enviar dinheiro enquanto está numa chamada.'],
    ['sn', 'URI PARUNHARE', 'Kuti uchengetedzeke, haugoni kutumira mari uchiri parunhare.'],
  ] as const)('CallLock copy in %s', async (lang, title, line1) => {
    installApi();
    const user = userEvent.setup();
    renderWithProviders(<CallLockPage />, { path: '/calllock', lang });
    await fillPayment(user, SCAM_PAYMENT);
    await user.click(screen.getByTestId('simulate-call'));
    await user.click(screen.getByTestId('send-button'));
    const paused = await screen.findByTestId('paused-screen');
    expect(paused).toHaveTextContent(title);
    expect(paused).toHaveTextContent(line1);
  });
});
