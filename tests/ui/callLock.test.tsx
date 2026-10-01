// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CallLockPage from '../../src/features/callLock/CallLockPage';
import { installApi, renderWithProviders, stubBrowser } from './harness';

beforeEach(() => {
  stubBrowser();
});

describe('CallLock UI', () => {
  it('pauses the payment during a simulated scam call, then re-checks (never sends) when the call ends', async () => {
    installApi();
    const user = userEvent.setup();
    renderWithProviders(<CallLockPage />, { path: '/calllock' });

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
    expect(within(review).getByTestId('review-amount')).toHaveTextContent('R850');
    expect(within(review).queryByTestId('confirm-send')).toBeNull();
    expect(screen.getByTestId('money-sent')).toHaveAttribute('data-sent', 'false');

    const timeline = screen.getByTestId('timeline');
    expect(Array.from(timeline.querySelectorAll('li')).map((li) => li.getAttribute('data-key'))).toEqual([
      'callStarted',
      'submitted',
      'paused',
      'callEnded',
      'rechecked',
      'blocked',
    ]);
  });

  it('INACTIVE: a normal payment goes to review and is only sent after explicit confirmation', async () => {
    installApi();
    const user = userEvent.setup();
    renderWithProviders(<CallLockPage />, { path: '/calllock' });
    await user.selectOptions(screen.getByLabelText('What is this payment for?'), 'FAMILY_SUPPORT');
    await user.clear(screen.getByLabelText('Reference'));
    await user.type(screen.getByLabelText('Reference'), 'Groceries');
    await user.click(screen.getByTestId('send-button'));
    const review = await screen.findByTestId('review-screen');
    expect(screen.getByTestId('money-sent')).toHaveAttribute('data-sent', 'false');
    // The recipient is a "recruiter" (job context) → CAUTION: sending needs an explicit acknowledgement.
    expect(review).toHaveAttribute('data-risk', 'CAUTION');
    expect(within(review).getByTestId('confirm-send')).toBeDisabled();
    await user.click(within(review).getByRole('checkbox'));
    await user.click(within(review).getByTestId('confirm-send'));
    expect(await screen.findByTestId('sent-screen')).toBeInTheDocument();
    expect(screen.getByTestId('money-sent')).toHaveAttribute('data-sent', 'true');
  });

  it('UNKNOWN (real browser): does not claim protection and tells the customer to hang up first', async () => {
    installApi();
    const user = userEvent.setup();
    renderWithProviders(<CallLockPage />, { path: '/calllock' });
    await user.click(screen.getByTestId('mode-BROWSER_UNSUPPORTED'));
    expect(await screen.findByTestId('call-state')).toHaveAttribute('data-state', 'UNKNOWN');
    expect(screen.getByTestId('unknown-notice')).toHaveTextContent('This phone can’t tell us if you are on a call.');
    expect(screen.getByTestId('simulate-call')).toBeDisabled();
  });

  it.each([
    ['pt', 'CHAMADA EM CURSO', 'Para sua proteção, não pode enviar dinheiro enquanto está numa chamada.'],
    ['sn', 'URI PARUNHARE', 'Kuti uchengetedzeke, haugoni kutumira mari uchiri parunhare.'],
  ] as const)('CallLock copy in %s', async (lang, title, line1) => {
    installApi();
    const user = userEvent.setup();
    renderWithProviders(<CallLockPage />, { path: '/calllock', lang });
    await user.click(screen.getByTestId('simulate-call'));
    await user.click(screen.getByTestId('send-button'));
    const paused = await screen.findByTestId('paused-screen');
    expect(paused).toHaveTextContent(title);
    expect(paused).toHaveTextContent(line1);
  });
});
