import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { check } from '../../src/domain/checker/check';
import { createCheckHandler, createReportHandler } from '../../server/handlers';
import { post, testDeps } from '../api/helpers';

/** ATOM.md §37 — "Before declaring success, attack the product." */
describe('red team (ATOM §37)', () => {
  it('URL with mukuru.com in the PATH is not official', () => {
    expect(check('https://evil.com/mukuru.com').verdict).toBe('NOT_OFFICIAL');
  });

  it('real hostname evil.com is not official, even with mukuru.com as user-info', () => {
    expect(check('https://mukuru.com@evil.com').verdict).toBe('NOT_OFFICIAL');
    expect(check('https://www.mukuru.com.evil.com').verdict).toBe('NOT_OFFICIAL');
  });

  it('uppercase input still matches the official record', () => {
    expect(check('HTTPS://WWW.MUKURU.COM/SA/').verdict).toBe('OFFICIAL');
  });

  it('phone numbers with spaces, dashes and brackets still match', () => {
    expect(check('(086) 001-8555').verdict).toBe('OFFICIAL');
    expect(check('+27 86 001 8555').verdict).toBe('OFFICIAL');
  });

  it('an unknown but harmless number is CANT_CONFIRM, not a scam', () => {
    expect(check('012 345 6789').verdict).toBe('CANT_CONFIRM');
  });

  it('a slightly misspelled location still matches', () => {
    expect(check('102 Longmarkt Street, Cape Town').verdict).toBe('OFFICIAL');
  });

  it('a Portuguese scam is caught', () => {
    expect(check('Ganhou um prémio! Pague a taxa de libertação de 500 MT para receber o seu dinheiro hoje.').verdict).toBe('NOT_OFFICIAL');
  });

  it('a Shona scam is caught', () => {
    expect(check('Mari yako yamiswa. Bhadhara R300 kuti mari yako isunungurwe nhasi. Tumira OTP yako.').verdict).toBe('NOT_OFFICIAL');
  });

  it('HTML input is treated as plain text and never executed', () => {
    const r = check('<img src=x onerror=alert(1)><script>alert(document.cookie)</script>');
    expect(r.verdict).toBe('CANT_CONFIRM');
    expect(JSON.stringify(r)).not.toContain('onerror=alert(1)><script>');
  });

  it('zero-width characters cannot hide an OTP request', () => {
    expect(check('Send me the O\u200bT\u200bP now').reasonCodes).toContain('REQUESTS_OTP');
  });

  it('full-width look-alike characters are folded', () => {
    expect(check('ｍｕｋｕｒｕ.ｃｏｍ').verdict).toBe('OFFICIAL');
  });

  it('100,000 characters are rejected by the API and truncated (never crash) in the engine', async () => {
    const { deps } = testDeps();
    const res = await createCheckHandler(deps)(post('/api/check', { input: 'a '.repeat(50_000) }));
    expect(res.status).toBe(413);
    const started = Date.now();
    const r = check('Pay now '.repeat(12_500));
    expect(r.truncated).toBe(true);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('pathological input does not cause catastrophic regex backtracking', () => {
    const started = Date.now();
    check(`${'a'.repeat(4000)}@${'b.'.repeat(400)}`);
    check(`https://${'a-'.repeat(1200)}.com`);
    check(`${'1 '.repeat(2400)}`);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('an expired proof fails (covered in API tests) and a malicious user cannot report Mukuru’s real number', async () => {
    const { deps } = testDeps();
    const res = await createReportHandler(deps)(post('/api/report', { input: '+27860018555', reporterId: 'attacker-0001' }));
    expect(res.status).toBe(409);
    expect(check('0860018555', { 'phone:+27860018555': 10_000 }).verdict).toBe('OFFICIAL');
  });

  it('the backend never fetches pasted URLs (no SSRF surface)', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|mts)$/.test(name) && /\bfetch\(|https?\.request\(|axios/.test(readFileSync(path, 'utf8'))) offenders.push(path);
      }
    };
    walk('server');
    walk('netlify');
    walk('src/domain');
    expect(offenders).toEqual([]);
  });

  it('no component renders user text as raw HTML', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx$/.test(name) && /dangerouslySetInnerHTML|innerHTML\s*=/.test(readFileSync(path, 'utf8'))) offenders.push(path);
      }
    };
    walk('src');
    expect(offenders).toEqual([]);
  });

  it('security headers are configured for the deployed site', () => {
    const toml = readFileSync('netlify.toml', 'utf8');
    expect(toml).toContain("frame-ancestors 'none'");
    expect(toml).toContain("script-src 'self'");
    expect(toml).toContain('Referrer-Policy = "no-referrer"');
    expect(toml).toContain('X-Content-Type-Options = "nosniff"');
  });

  it('no secrets are committed', () => {
    const files = ['netlify.toml', 'package.json', 'vite.config.ts'];
    for (const f of files) expect(readFileSync(f, 'utf8')).not.toMatch(/(api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9]{16,}/i);
  });
});
