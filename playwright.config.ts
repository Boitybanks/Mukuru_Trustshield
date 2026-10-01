import { defineConfig, devices } from '@playwright/test';

/**
 * E2E + visual QA.
 *  - "local": against a source Vite server with the production handlers backed by memory.
 *  - "live":  the same specs against the deployed Netlify site (BASE_URL).
 */
const live = process.env.BASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: live ? 1 : 0,
  reporter: [['list']],
  webServer: live
    ? undefined
    : {
        command: '.\\node_modules\\.bin\\vite.cmd --host=127.0.0.1 --port=5180',
        url: 'http://127.0.0.1:5180',
        reuseExistingServer: true,
        timeout: 120_000,
        env: { TRUSTSHIELD_E2E: '1' },
      },
  use: {
    baseURL: live ?? 'http://127.0.0.1:5180',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: live ? 'live' : 'local' }],
});
