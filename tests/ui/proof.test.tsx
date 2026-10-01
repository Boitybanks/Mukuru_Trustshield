// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProofPage from '../../src/features/mukuruProof/ProofPage';
import VerifyPage from '../../src/features/mukuruProof/VerifyPage';
import { installApi, renderWithProviders, stubBrowser } from './harness';

beforeEach(() => {
  stubBrowser();
});

describe('MukuruProof UI', () => {
  it('generates a proof with QR + verifier URL, clearly labelled as simulated', async () => {
    installApi();
    const user = userEvent.setup();
    renderWithProviders(<ProofPage />, { path: '/proof' });
    expect(screen.getByTestId('simulated-badge')).toHaveTextContent('SIMULATED VERIFICATION FOR HACKATHON');
    await user.click(screen.getByTestId('generate-proof'));
    expect(await screen.findByTestId('proof-qr')).toBeInTheDocument();
    expect(screen.getByTestId('verify-url')).toHaveTextContent(/\/verify\/[A-Za-z0-9_-]{43}$/);
    expect(screen.getByTestId('proof-countdown')).toHaveTextContent(/Expires in (10:00|09:5\d)/);
  });

  it('the verifier shows the four facts and nothing more', async () => {
    const api = installApi();
    const created = await (await fetch('/api/proof/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json();
    renderWithProviders(<VerifyPage proofId={created.proofId} />, { path: created.verifyPath });
    const verifier = await screen.findByTestId('verifier');
    await within(verifier).findByText('Verified financial details');
    const claims = within(verifier).getByTestId('claims');
    expect(claims).toHaveTextContent('IdentityVerified');
    expect(claims).toHaveTextContent('Account ownershipVerified');
    expect(claims).toHaveTextContent('Account statusActive');
    expect(claims).toHaveTextContent('Can receive creditsYes');
    expect(verifier).toHaveTextContent('Only the minimum required information is shared.');
    expect(verifier).not.toHaveTextContent(/R\s?\d[\d,]*\.\d\d/); // no balance figure anywhere
    expect(api.calls.some((c) => c.startsWith('/api/proof/'))).toBe(true);
  });

  it('an expired proof fails', async () => {
    const api = installApi();
    const created = await (await fetch('/api/proof/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json();
    api.advance(601);
    renderWithProviders(<VerifyPage proofId={created.proofId} />, { path: created.verifyPath });
    expect(await screen.findByTestId('proof-expired')).toHaveTextContent('This proof has expired');
  });

  it('a forged proof link fails', async () => {
    installApi();
    renderWithProviders(<VerifyPage proofId={'F'.repeat(43)} />);
    expect(await screen.findByTestId('proof-not-found')).toHaveTextContent('Proof not found');
  });
});
