// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
import { installApi, renderWithProviders, stubBrowser } from './harness';

beforeEach(() => {
  stubBrowser();
});

async function verdict() {
  return screen.findByTestId('verdict');
}

describe('Checker UI', () => {
  it('OFFICIAL MUKURU for the seeded official WhatsApp number', async () => {
    installApi();
    const user = userEvent.setup();
    renderWithProviders(<App />);
    await user.click(screen.getByTestId('demo-official'));
    const card = await verdict();
    expect(card).toHaveAttribute('data-verdict', 'OFFICIAL');
    expect(within(card).getByRole('heading', { level: 2 })).toHaveTextContent('Official Mukuru');
    expect(within(card).getByText('Mukuru will never ask you to share your PIN or OTP.')).toBeInTheDocument();
    expect(within(card).getByTestId('checked-value')).toHaveTextContent('0860 018 555');
    // Official contacts can never be reported.
    expect(within(card).queryByTestId('report-button')).toBeNull();
  });

  it('NOT OFFICIAL — STOP for a look-alike link, and the warning switches to Portuguese and Shona instantly', async () => {
    const api = installApi();
    const user = userEvent.setup();
    renderWithProviders(<App />);
    await user.type(screen.getByTestId('check-input'), 'https://mukuru-secure-pay.co.za/verify');
    await user.click(screen.getByTestId('check-button'));
    const card = await verdict();
    expect(card).toHaveAttribute('data-verdict', 'NOT_OFFICIAL');
    expect(within(card).getByTestId('headline')).toHaveTextContent('mukuru-secure-pay.co.za looks like Mukuru, but it is not mukuru.com.');
    const requestsBefore = api.fetchMock.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Português' }));
    expect(within(await verdict()).getByRole('heading', { level: 2 })).toHaveTextContent('Não é oficial — pare');
    expect(document.documentElement.lang).toBe('pt-MZ');

    await user.click(screen.getByRole('button', { name: 'chiShona' }));
    expect(within(await verdict()).getByRole('heading', { level: 2 })).toHaveTextContent('Haisi Mukuru yepamutemo — mira');
    expect(screen.getByTestId('check-button')).toHaveTextContent('TARISA');
    expect(document.documentElement.lang).toBe('sn');

    // Re-rendered from reason codes: no extra network round-trip.
    expect(api.fetchMock.mock.calls.length).toBe(requestsBefore);
  });

  it('SCAM MESSAGE ANALYSIS explains several red flags', async () => {
    installApi();
    const user = userEvent.setup();
    renderWithProviders(<App />);
    await user.click(screen.getByTestId('demo-scamMessage'));
    const card = await verdict();
    expect(card).toHaveAttribute('data-verdict', 'NOT_OFFICIAL');
    const codes = within(card)
      .getAllByRole('listitem')
      .map((li) => li.getAttribute('data-code'))
      .filter(Boolean);
    expect(codes).toEqual(expect.arrayContaining(['REQUESTS_OTP', 'UPFRONT_FEE', 'ACCOUNT_BLOCK_THREAT']));
  });

  it('CAN’T CONFIRM for an unknown location, with the official-contact shortcut', async () => {
    installApi();
    const user = userEvent.setup();
    renderWithProviders(<App />);
    await user.click(screen.getByTestId('demo-unknownLocation'));
    const card = await verdict();
    expect(card).toHaveAttribute('data-verdict', 'CANT_CONFIRM');
    expect(within(card).getByRole('button', { name: 'Official contact options' })).toBeInTheDocument();
    expect(within(card).getByTestId('next-steps')).toHaveTextContent('Check the digits, copy the full link, or add the street name and town.');
  });

  it('COMMUNITY REPORTING: report persists and the count appears on the next check', async () => {
    installApi();
    const user = userEvent.setup();
    renderWithProviders(<App />);
    await user.click(screen.getByTestId('demo-fakeLink'));
    await verdict();
    await user.click(screen.getByTestId('report-button'));
    await user.click(screen.getByTestId('report-confirm'));
    expect(await screen.findByTestId('report-status')).toHaveTextContent('Thank you');
    expect(screen.getByTestId('report-count')).toHaveTextContent('Reported by 1 TrustShield user');

    await user.click(screen.getByTestId('check-another'));
    await user.click(screen.getByTestId('demo-fakeLink'));
    await waitFor(() => expect(screen.getByTestId('report-count')).toHaveTextContent('Reported by 1 TrustShield user'));
  });

  it('pasted HTML is shown as text, never executed', async () => {
    installApi();
    const user = userEvent.setup();
    const { container } = renderWithProviders(<App />);
    await user.type(screen.getByTestId('check-input'), '<img src=x onerror="window.pwned=1">');
    await user.click(screen.getByTestId('check-button'));
    await verdict();
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect((window as unknown as { pwned?: number }).pwned).toBeUndefined();
  });

  it('asks for input instead of checking nothing', async () => {
    installApi();
    const user = userEvent.setup();
    renderWithProviders(<App />);
    await user.click(screen.getByTestId('check-button'));
    expect(screen.getByRole('alert')).toHaveTextContent('Paste or type something to check first.');
  });

  it('keeps working offline: falls back to the on-device engine', async () => {
    stubBrowser();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    const user = userEvent.setup();
    renderWithProviders(<App />);
    await user.click(screen.getByTestId('demo-fakeLink'));
    const card = await verdict();
    expect(card).toHaveAttribute('data-verdict', 'NOT_OFFICIAL');
    expect(within(card).getByText('Checked on this phone because the connection is slow.')).toBeInTheDocument();
  });

  it('has a visible language switch with all three languages and a hackathon disclaimer', () => {
    installApi();
    renderWithProviders(<App />);
    for (const name of ['English', 'Português', 'chiShona']) expect(screen.getByRole('button', { name })).toBeInTheDocument();
    expect(screen.getByText('Hackathon prototype — not an official production Mukuru service.')).toBeInTheDocument();
  });
});
