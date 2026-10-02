import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { DEMO_SCENARIOS } from '../src/data/demoScenarios';

/** Pastes one of the seeded example inputs and presses Check, like a customer would. */
async function checkExample(page: Page, id: (typeof DEMO_SCENARIOS)[number]['id']) {
  await page.getByTestId('check-input').fill(DEMO_SCENARIOS.find((s) => s.id === id)!.input);
  await page.getByTestId('check-button').click();
}

/** The send-money form starts empty; fill it with the seeded scam payment. */
async function fillScamPayment(page: Page) {
  await page.fill('#tx-recipient', 'Tendai Moyo');
  await page.fill('#tx-amount', '850');
  await page.selectOption('#tx-purpose', 'JOB_FEE');
  await page.fill('#tx-reference', 'Employment account activation');
}

/**
 * The complete judge experience (ATOM.md §42 "Final judge experience"),
 * runnable against localhost or the live Netlify URL (BASE_URL=…).
 */

const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/server responded with a status of (404|410)/.test(msg.text())) {
      consoleErrors.push(`console: ${msg.text()}`);
    }
  });
});

test.afterEach(() => {
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});

async function check(page: Page, input: string) {
  await page.getByTestId('check-input').fill(input);
  await page.getByTestId('check-button').click();
  return page.getByTestId('verdict');
}

test('1. OFFICIAL MUKURU — seeded official contact', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Is this really Mukuru?');
  await checkExample(page, 'official');
  const verdict = page.getByTestId('verdict');
  await expect(verdict).toHaveAttribute('data-verdict', 'OFFICIAL');
  await expect(verdict).toContainText('Official Mukuru');
  await expect(verdict).toContainText('0860 018 555');
  await expect(verdict).toContainText('Mukuru will never ask you to share your PIN or OTP.');
});

test('2. NOT OFFICIAL — STOP — look-alike Mukuru URL', async ({ page }) => {
  await page.goto('/');
  const verdict = await check(page, 'https://mukuru-secure-pay.co.za/verify');
  await expect(verdict).toHaveAttribute('data-verdict', 'NOT_OFFICIAL');
  await expect(verdict).toContainText('Not official — stop');
  await expect(verdict).toContainText('mukuru-secure-pay.co.za looks like Mukuru, but it is not mukuru.com.');
});

test('3. SCAM MESSAGE ANALYSIS — fake job/payment message asking for money and OTP', async ({ page }) => {
  await page.goto('/');
  const verdict = await check(
    page,
    'Mukuru Jobs: you are hired! Pay R250 registration fee today and send us the OTP you receive to activate your account.',
  );
  await expect(verdict).toHaveAttribute('data-verdict', 'NOT_OFFICIAL');
  for (const code of ['REQUESTS_OTP', 'UPFRONT_FEE', 'FAKE_JOB_CONTEXT']) {
    await expect(verdict.locator(`[data-code="${code}"]`)).toBeVisible();
  }
});

test('4. CAN’T CONFIRM — unknown location', async ({ page }) => {
  await page.goto('/');
  await checkExample(page, 'unknownLocation');
  const verdict = page.getByTestId('verdict');
  await expect(verdict).toHaveAttribute('data-verdict', 'CANT_CONFIRM');
  await expect(verdict).toContainText('Can’t confirm');
});

test('5. MULTILINGUAL — the same warning in English, Portuguese and Shona', async ({ page }) => {
  await page.goto('/');
  await checkExample(page, 'scamMessage');
  const title = page.getByTestId('verdict').getByRole('heading', { level: 2 });
  await expect(title).toHaveText('Not official — stop');
  await page.getByRole('button', { name: 'Português' }).click();
  await expect(title).toHaveText('Não é oficial — pare');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-MZ');
  await page.getByRole('button', { name: 'chiShona' }).click();
  await expect(title).toHaveText('Haisi Mukuru yepamutemo — mira');
  await expect(page.locator('html')).toHaveAttribute('lang', 'sn');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(title).toHaveText('Not official — stop');
});

test('6. COMMUNITY REPORTING — persisted warning count survives a reload', async ({ page, context }) => {
  const unique = `https://mukuru-smoketest-${Date.now()}.example/claim`;
  await page.goto('/');
  await check(page, unique);
  await page.getByTestId('report-button').click();
  await page.getByTestId('report-confirm').click();
  await expect(page.getByTestId('report-status')).toContainText('Thank you');
  await expect(page.getByTestId('report-count')).toContainText('Reported by 1 TrustShield user');

  // A second, separate browser profile sees the persisted count.
  const other = await context.browser()!.newContext();
  const page2 = await other.newPage();
  await page2.goto('/');
  await check(page2, unique);
  await expect(page2.getByTestId('report-count')).toContainText('Reported by 1 TrustShield user');
  // And can add its own report.
  await page2.getByTestId('report-button').click();
  await page2.getByTestId('report-confirm').click();
  await expect(page2.getByTestId('report-count')).toContainText('Reported by 2 TrustShield users');
  await other.close();
});

test('7. CALLLOCK — paused during a call; re-checked, never sent, after the call', async ({ page }) => {
  await page.goto('/calllock');
  await fillScamPayment(page);
  await page.getByTestId('simulate-call').click();
  await expect(page.getByTestId('call-state')).toHaveAttribute('data-state', 'ACTIVE');
  await page.getByTestId('send-button').click();
  const paused = page.getByTestId('paused-screen');
  await expect(paused).toContainText('CALL IN PROGRESS');
  await expect(paused.getByRole('button', { name: /continue|anyway/i })).toHaveCount(0);
  await expect(page.getByTestId('money-sent')).toHaveAttribute('data-sent', 'false');

  await page.getByTestId('end-call').click();
  const review = page.getByTestId('review-screen');
  await expect(review).toHaveAttribute('data-risk', 'STOP');
  await expect(review.getByTestId('tx-verdict')).toContainText('Not official — stop');
  for (const code of ['NEW_RECIPIENT', 'UPFRONT_FEE', 'FAKE_JOB_CONTEXT']) {
    await expect(review.locator(`[data-code="${code}"]`)).toBeVisible();
  }
  await expect(page.getByTestId('money-sent')).toHaveAttribute('data-sent', 'false');
  await expect(review.getByTestId('confirm-send')).toHaveCount(0);
});

test('8. MUKURUPROOF — proof, verifier, minimum facts, expiry', async ({ page }) => {
  await page.goto('/proof');
  await page.getByTestId('generate-proof').click();
  await expect(page.getByTestId('proof-qr')).toBeVisible();
  const url = (await page.getByTestId('verify-url').textContent())!.trim();
  expect(url).toMatch(/\/verify\/[A-Za-z0-9_-]{43}$/);

  await page.goto(url);
  const verifier = page.getByTestId('verifier');
  await expect(verifier).toHaveAttribute('data-status', 'VALID');
  await expect(verifier).toContainText('Verified financial details');
  for (const text of ['Identity', 'Account ownership', 'Account status', 'Can receive credits']) {
    await expect(verifier.getByTestId('claims')).toContainText(text);
  }
  await expect(verifier).toContainText('Only the minimum required information is shared.');
  await expect(verifier).not.toContainText('HACKATHON');

  // Forged link
  await page.goto(`/verify/${'Q'.repeat(43)}`);
  await expect(page.getByTestId('proof-not-found')).toBeVisible();
});

test('8b. MUKURUPROOF — an expired proof fails', async ({ page, request }) => {
  const res = await request.post('/api/proof/create', { data: { ttlSeconds: 10 } });
  expect(res.status()).toBe(201);
  const proof = await res.json();
  await page.waitForTimeout(11_000);
  await page.goto(proof.verifyPath);
  await expect(page.getByTestId('proof-expired')).toContainText('This proof has expired');
  const api = await request.get(`/api/proof/${proof.proofId}`);
  expect(api.status()).toBe(410);
});

test('API contract: POST /api/check returns the documented schema', async ({ request }) => {
  const res = await request.post('/api/check', { data: { input: '+27 86 0018 555', language: 'en' } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ verdict: 'OFFICIAL', inputType: 'PHONE', reasonCodes: ['OFFICIAL_PHONE_MATCH'], reportCount: 0 });
  for (const field of ['reason', 'nextStep', 'matchedOfficialRecord', 'checkedAt']) expect(body).toHaveProperty(field);
  const tooBig = await request.post('/api/check', { data: { input: 'x'.repeat(6000) } });
  expect(tooBig.status()).toBe(413);
});

test('Security headers are served', async ({ request }) => {
  test.skip(!process.env.BASE_URL, 'Headers come from netlify.toml and are only served by Netlify');
  const res = await request.get('/');
  const headers = res.headers();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['permissions-policy']).toContain('microphone=()');
  expect(headers['x-content-type-options']).toBe('nosniff');
});
