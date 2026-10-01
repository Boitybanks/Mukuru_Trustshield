import { hostnameToUnicode } from './punycode';

export interface ParsedLink {
  raw: string;
  protocol: 'http:' | 'https:';
  /** Canonical ASCII hostname: lowercase, IDN as punycode, no trailing dot. */
  hostname: string;
  /** Hostname with any punycode labels decoded, for display and look-alike checks. */
  unicodeHostname: string;
  port: string;
  /** pathname + search + hash. Never fetched, only inspected. */
  path: string;
  registrableDomain: string;
  hasUserInfo: boolean;
  isIpAddress: boolean;
  isPunycode: boolean;
  hadScheme: boolean;
}

/**
 * Multi-label public suffixes we expect around Mukuru's markets. A full
 * Public Suffix List is unnecessary here: the registrable domain is only used
 * to explain "the real website is X", never to grant trust (trust requires an
 * exact host match in the official registry).
 */
const MULTI_LABEL_SUFFIXES = new Set([
  'co.za', 'org.za', 'net.za', 'gov.za', 'ac.za', 'web.za', 'nom.za',
  'co.zw', 'org.zw', 'ac.zw', 'gov.zw',
  'co.mz', 'org.mz', 'gov.mz', 'com.mz',
  'co.bw', 'org.bw', 'co.ls', 'org.ls', 'co.sz', 'com.na', 'co.na',
  'co.zm', 'com.zm', 'co.mw', 'com.mw', 'co.tz', 'co.ug', 'co.ke', 'or.ke',
  'com.ng', 'org.ng', 'com.gh', 'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
  'com.au', 'net.au', 'org.au', 'co.nz', 'com.br', 'co.in', 'com.cn',
]);

/** TLDs accepted for links written WITHOUT http(s):// (keeps "today.Pay" from being a link). */
const SCHEMELESS_TLDS = new Set([
  'com', 'net', 'org', 'info', 'biz', 'co', 'io', 'me', 'app', 'xyz', 'top', 'online', 'site',
  'website', 'link', 'click', 'live', 'shop', 'store', 'support', 'help', 'services', 'finance',
  'money', 'cash', 'pay', 'bank', 'loan', 'loans', 'work', 'jobs', 'career', 'careers', 'vip',
  'club', 'icu', 'buzz', 'cc', 'tk', 'ml', 'ga', 'cf', 'gq', 'ly', 'ws', 'su', 'ru', 'cn',
  'za', 'zw', 'mz', 'bw', 'ls', 'sz', 'na', 'zm', 'mw', 'tz', 'ug', 'ke', 'ng', 'gh', 'uk',
  'us', 'eu', 'de', 'fr', 'pt', 'br', 'in', 'au', 'example', 'test', 'africa', 'joburg',
  'capetown', 'durban', 'page', 'dev', 'tech', 'world', 'global', 'today', 'news', 'win',
]);

const SCHEME_URL = /\b(?:https?|hxxps?):\/\/[^\s<>"'`]+/gi;
const SCHEMELESS_URL =
  /(?<![@\p{L}\p{N}._-])(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+(\p{L}{2,24})\.?(?::\d{2,5})?(?:[/?#][^\s<>"'`]*)?/gu;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"»]+$/;

/** Undo common "defanging" used when people forward scam links: hxxp, [.], (.) */
export function refang(text: string): string {
  return text.replace(/\[\.\]|\(\.\)|\{\.\}/g, '.').replace(/\bhxxp/gi, 'http');
}

export function extractLinkCandidates(text: string): string[] {
  const found: string[] = [];
  let remaining = refang(text);
  for (const match of remaining.matchAll(SCHEME_URL)) {
    found.push(match[0].replace(TRAILING_PUNCTUATION, ''));
  }
  remaining = remaining.replace(SCHEME_URL, (m) => ' '.repeat(m.length));
  for (const match of remaining.matchAll(SCHEMELESS_URL)) {
    const rawTld = match[1] ?? '';
    const tld = rawTld.toLowerCase();
    if (!SCHEMELESS_TLDS.has(tld)) continue;
    // "blocked today.Pay R250" is a missing space, not a link: reject a
    // capitalised TLD when the rest of the hostname is lowercase.
    const host = match[0].split(/[/?#:]/)[0] ?? '';
    const beforeTld = host.slice(0, host.toLowerCase().lastIndexOf(`.${tld}`));
    if (rawTld !== tld && beforeTld !== beforeTld.toUpperCase()) continue;
    found.push(match[0].replace(TRAILING_PUNCTUATION, ''));
  }
  return found;
}

export function registrableDomain(hostname: string): string {
  const labels = hostname.split('.');
  if (labels.length <= 2) return hostname;
  const lastTwo = labels.slice(-2).join('.');
  return MULTI_LABEL_SUFFIXES.has(lastTwo) ? labels.slice(-3).join('.') : lastTwo;
}

function isIp(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.startsWith('[');
}

/**
 * Parses (never fetches) a link using the WHATWG URL parser — the same
 * parser browsers use to decide where a link really goes.
 */
export function parseLink(candidate: string): ParsedLink | null {
  const raw = candidate.trim();
  if (!raw || raw.length > 2048) return null;
  const hadScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  let url: URL;
  try {
    url = new URL(hadScheme ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  let hostname = url.hostname.toLowerCase();
  if (hostname.endsWith('.')) hostname = hostname.slice(0, -1);
  if (!hostname) return null;
  const ip = isIp(hostname);
  if (!ip && !hostname.includes('.')) return null;
  const unicodeHostname = hostnameToUnicode(hostname);
  return {
    raw,
    protocol: url.protocol,
    hostname,
    unicodeHostname,
    port: url.port,
    path: `${url.pathname}${url.search}${url.hash}`,
    registrableDomain: ip ? hostname : registrableDomain(hostname),
    hasUserInfo: url.username !== '' || url.password !== '',
    isIpAddress: ip,
    isPunycode: hostname.split('.').some((l) => l.startsWith('xn--')),
    hadScheme,
  };
}
