import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Responsive visual QA at the five required widths. Each page is checked
 * for horizontal overflow, tiny text and clipped tap targets, and a
 * full-page screenshot is written to docs/screenshots for review.
 */
const WIDTHS = [320, 360, 390, 768, 1440] as const;
const SHOTS = process.env.BASE_URL ? 'test-results/live-screens' : 'docs/screenshots';

async function assertLayoutSound(page: Page, label: string) {
  const report = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth - doc.clientWidth;
    const tooSmall: string[] = [];
    const smallTargets: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const hasOwnText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim().length > 0);
      if (hasOwnText && parseFloat(style.fontSize) < 12) tooSmall.push(`${el.tagName}.${el.className}:${style.fontSize}`);
      if (el.matches('button, a.btn, .chip, select, input:not([type=checkbox])') && (rect.height < 40 || rect.width < 40)) {
        smallTargets.push(`${el.tagName}.${el.className} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
      if (rect.right > doc.clientWidth + 1 && style.position !== 'fixed') {
        // Element sticking out of the viewport.
        tooSmall.push(`OVERFLOW ${el.tagName}.${el.className} right=${Math.round(rect.right)}`);
      }
    }
    return { overflowX, tooSmall: tooSmall.slice(0, 10), smallTargets: smallTargets.slice(0, 10) };
  });
  expect(report.overflowX, `${label}: horizontal scroll`).toBeLessThanOrEqual(0);
  expect(report.tooSmall, `${label}: tiny text / overflow`).toEqual([]);
  expect(report.smallTargets, `${label}: small tap targets`).toEqual([]);
}

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 800 : 900 } });

    test('home + NOT OFFICIAL result', async ({ page }) => {
      await page.goto('/');
      await assertLayoutSound(page, `home@${width}`);
      await page.screenshot({ path: `${SHOTS}/home-${width}.png`, fullPage: true });
      await page.getByTestId('demo-scamMessage').click();
      await expect(page.getByTestId('verdict')).toHaveAttribute('data-verdict', 'NOT_OFFICIAL');
      await assertLayoutSound(page, `not-official@${width}`);
      await page.screenshot({ path: `${SHOTS}/result-not-official-${width}.png`, fullPage: true });
    });

    test('OFFICIAL and CAN’T CONFIRM results (Shona)', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'chiShona' }).click();
      await page.getByTestId('demo-official').click();
      await expect(page.getByTestId('verdict')).toHaveAttribute('data-verdict', 'OFFICIAL');
      await assertLayoutSound(page, `official-sn@${width}`);
      await page.screenshot({ path: `${SHOTS}/result-official-sn-${width}.png`, fullPage: true });
      await page.getByTestId('check-another').click();
      await page.getByTestId('demo-fakeLink').click();
      await expect(page.getByTestId('verdict')).toHaveAttribute('data-verdict', 'NOT_OFFICIAL');
      await page.getByTestId('check-input').fill('Mukuru collection point, 19 Random Road, Johannesburg');
      await page.getByTestId('check-button').click();
      await expect(page.getByTestId('verdict')).toHaveAttribute('data-verdict', 'CANT_CONFIRM');
      await assertLayoutSound(page, `cant-confirm-sn@${width}`);
      await page.screenshot({ path: `${SHOTS}/result-cant-confirm-sn-${width}.png`, fullPage: true });
    });

    test('CallLock paused + blocked (Portuguese)', async ({ page }) => {
      await page.goto('/calllock');
      await page.getByRole('button', { name: 'Português' }).click();
      await page.getByTestId('simulate-call').click();
      await page.getByTestId('send-button').click();
      await expect(page.getByTestId('paused-screen')).toBeVisible();
      await assertLayoutSound(page, `calllock-paused@${width}`);
      await page.screenshot({ path: `${SHOTS}/calllock-paused-pt-${width}.png`, fullPage: true });
      await page.getByTestId('end-call').click();
      await expect(page.getByTestId('review-screen')).toHaveAttribute('data-risk', 'STOP');
      await assertLayoutSound(page, `calllock-blocked@${width}`);
      await page.screenshot({ path: `${SHOTS}/calllock-blocked-pt-${width}.png`, fullPage: true });
    });

    test('MukuruProof + verifier', async ({ page }) => {
      await page.goto('/proof');
      await page.getByTestId('generate-proof').click();
      await expect(page.getByTestId('proof-qr')).toBeVisible();
      await assertLayoutSound(page, `proof@${width}`);
      await page.screenshot({ path: `${SHOTS}/proof-${width}.png`, fullPage: true });
      await page.getByTestId('open-verifier').click();
      await expect(page.getByTestId('verifier')).toHaveAttribute('data-status', 'VALID');
      await assertLayoutSound(page, `verifier@${width}`);
      await page.screenshot({ path: `${SHOTS}/verifier-${width}.png`, fullPage: true });
    });
  });
}
