import { describe, expect, it } from 'vitest';
import { extractLinkCandidates, parseLink, registrableDomain } from '../../src/domain/normalisation/url';
import { decodePunycode, brandSkeleton } from '../../src/domain/normalisation/punycode';
import { detectLookalike } from '../../src/domain/rules/entityRules';
import { check } from '../../src/domain/checker/check';

describe('URL parsing (parse only, never fetch)', () => {
  it('extracts protocol, hostname, port, path and registrable domain', () => {
    const link = parseLink('HTTP://Pay.Mukuru-Secure.co.za:8080/verify?x=1#top')!;
    expect(link).toMatchObject({
      protocol: 'http:',
      hostname: 'pay.mukuru-secure.co.za',
      port: '8080',
      path: '/verify?x=1#top',
      registrableDomain: 'mukuru-secure.co.za',
    });
  });

  it('canonicalises case and a trailing dot', () => {
    expect(parseLink('https://WWW.MUKURU.COM./sa/')?.hostname).toBe('www.mukuru.com');
  });

  it('handles links pasted without http(s)://', () => {
    expect(parseLink('mukuru.com/sa')?.hostname).toBe('mukuru.com');
  });

  it('converts Unicode hostnames to punycode and back', () => {
    const link = parseLink('https://mukurú.com')!;
    expect(link.hostname.startsWith('xn--')).toBe(true);
    expect(link.isPunycode).toBe(true);
    expect(link.unicodeHostname).toBe('mukurú.com');
  });

  it('decodes punycode labels', () => {
    expect(decodePunycode('mukur-cva')).toBe('mukurú');
  });

  it('reveals the real host behind a user-info trick', () => {
    const link = parseLink('https://mukuru.com@evil.example/login')!;
    expect(link.hostname).toBe('evil.example');
    expect(link.hasUserInfo).toBe(true);
  });

  it('computes registrable domains for multi-label suffixes', () => {
    expect(registrableDomain('a.b.mukuru-pay.co.za')).toBe('mukuru-pay.co.za');
    expect(registrableDomain('login.evil.com')).toBe('evil.com');
  });

  it('finds links in messages, including defanged ones, without treating "today.Pay" as a link', () => {
    expect(extractLinkCandidates('Go to https://mukuru-pay.com/x. Or www.example.co.za now')).toEqual([
      'https://mukuru-pay.com/x',
      'www.example.co.za',
    ]);
    expect(extractLinkCandidates('visit mukuru-pay[.]com')).toEqual(['mukuru-pay.com']);
    expect(extractLinkCandidates('Your account is blocked today.Pay R250')).toEqual([]);
    expect(extractLinkCandidates('email support@mukuru.com')).toEqual([]);
  });

  it('brand skeleton folds look-alike letters', () => {
    expect(brandSkeleton('rnukuru')).toBe('mukuru');
    expect(brandSkeleton('mυkuru')).toBe('mukuru');
    expect(brandSkeleton('МUKURU')).toBe('mukuru');
  });
});

describe('domain verdicts', () => {
  it.each(['mukuru.com', 'https://mukuru.com', 'https://www.mukuru.com/sa/fraud-prevention/', 'MUKURU.COM', 'www.mukuru.com.'])(
    '%s is OFFICIAL (exact approved host)',
    (input) => {
      const r = check(input);
      expect(r.verdict).toBe('OFFICIAL');
      expect(r.reasonCodes).toContain('OFFICIAL_DOMAIN_MATCH');
    },
  );

  it('verified Mukuru service hosts are OFFICIAL', () => {
    expect(check('https://mobile.mukuru.com/mobi/login').verdict).toBe('OFFICIAL');
  });

  it("Mukuru's official Facebook page is OFFICIAL; a look-alike page path is not", () => {
    expect(check('https://www.facebook.com/mukurudotcom').verdict).toBe('OFFICIAL');
    const fake = check('https://www.facebook.com/mukuru.support.za');
    expect(fake.verdict).toBe('CANT_CONFIRM');
    expect(fake.reasonCodes).toContain('MUKURU_NAME_IN_LINK');
  });

  it('Scenario 2: https://mukuru-secure-pay.co.za/verify is NOT_OFFICIAL with LOOKALIKE_DOMAIN', () => {
    const r = check('https://mukuru-secure-pay.co.za/verify');
    expect(r.verdict).toBe('NOT_OFFICIAL');
    expect(r.inputType).toBe('URL');
    expect(r.reasonCodes).toContain('LOOKALIKE_DOMAIN');
  });

  it.each([
    'mukuru-login.com',
    'mukuru-secure.co.za',
    'mukurru.com',
    'mukvru.com',
    'mukru.com',
    'mukuru-pay.com',
    'mukuru.support.example',
    'mukuru.com.verify-account.example',
    'http://mukuru-pay.example',
    'https://rnukuru.com',
  ])('%s is a look-alike → NOT_OFFICIAL', (input) => {
    const r = check(input);
    expect(r.verdict).toBe('NOT_OFFICIAL');
    expect(r.reasonCodes).toContain('LOOKALIKE_DOMAIN');
  });

  it.each(['https://mukurú.com', 'https://xn--mukur-cva.com', 'https://mυkuru.com', 'https://мukuru.com'])(
    '%s uses another alphabet → NOT_OFFICIAL (LOOKALIKE_ALPHABET)',
    (input) => {
      const r = check(input);
      expect(r.verdict).toBe('NOT_OFFICIAL');
      expect(r.reasonCodes).toContain('LOOKALIKE_ALPHABET');
    },
  );

  it('malicious subdomain mukuru.com.evil.example is never OFFICIAL', () => {
    const r = check('https://mukuru.com.evil.example/login');
    expect(r.verdict).toBe('NOT_OFFICIAL');
  });

  it('a hidden real destination (user-info trick) is DECEPTIVE_LINK', () => {
    const r = check('https://mukuru.com@evil.example/');
    expect(r.verdict).toBe('NOT_OFFICIAL');
    expect(r.reasonCodes).toContain('DECEPTIVE_LINK');
  });

  it('mukuru.com in the PATH of evil.com is NOT_OFFICIAL', () => {
    const r = check('https://evil.com/mukuru.com/login');
    expect(r.verdict).toBe('NOT_OFFICIAL');
    expect(r.reasonCodes).toContain('DECEPTIVE_LINK');
  });

  it('an unlisted mukuru.com subdomain is CANT_CONFIRM, not auto-trusted', () => {
    const r = check('https://promo.mukuru.com');
    expect(r.verdict).toBe('CANT_CONFIRM');
    expect(r.reasonCodes).toContain('UNVERIFIED_MUKURU_ADDRESS');
  });

  it('an unrelated website is CANT_CONFIRM (we do not cry wolf)', () => {
    const r = check('https://www.example.org/recipes');
    expect(r.verdict).toBe('CANT_CONFIRM');
    expect(r.reasonCodes).toEqual(['UNKNOWN_LINK']);
  });

  it('a non-standard port on the official host is not OFFICIAL', () => {
    expect(check('https://mukuru.com:8443/login').verdict).not.toBe('OFFICIAL');
  });

  it('look-alike detection ignores unrelated short words', () => {
    expect(detectLookalike({ hostname: 'kuru.org', unicodeHostname: 'kuru.org', isPunycode: false })).toBeNull();
    expect(detectLookalike({ hostname: 'google.com', unicodeHostname: 'google.com', isPunycode: false })).toBeNull();
  });
});
