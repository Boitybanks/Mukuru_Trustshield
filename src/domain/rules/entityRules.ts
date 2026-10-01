import type { Entity, Signal, ReasonCode, SignalParams } from '../types';
import { RULE_SEVERITY } from './catalogue';
import type { ParsedLink } from '../normalisation/url';
import { parseLink } from '../normalisation/url';
import type { NormalisedPhone } from '../normalisation/phone';
import { brandSkeleton, hasNonAscii } from '../normalisation/punycode';
import { editDistance } from '../normalisation/similarity';
import { locationCanonicalKey, matchLocation } from '../normalisation/location';
import {
  BRAND_TOKEN,
  OFFICIAL_HOSTS,
  OFFICIAL_LOCATIONS,
  OFFICIAL_REGISTRABLE_DOMAINS,
  findOfficialEmail,
  findOfficialHost,
  findOfficialPhone,
  findOfficialShortcode,
  findOfficialSocial,
  findOfficialUssd,
} from '../../data/officialRegistry';

export interface Classified {
  entity: Entity;
  signals: Signal[];
}

function sig(code: ReasonCode, params?: SignalParams): Signal {
  return params ? { code, severity: RULE_SEVERITY[code], params } : { code, severity: RULE_SEVERITY[code] };
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export type LookalikeTechnique = 'ALPHABET' | 'BRAND_IN_NAME' | 'TYPO';

/**
 * Does this hostname imitate Mukuru? A near-copy is MORE suspicious than an
 * unrelated domain, because it only exists to be mistaken for Mukuru.
 */
export function detectLookalike(link: Pick<ParsedLink, 'hostname' | 'unicodeHostname' | 'isPunycode'>): LookalikeTechnique | null {
  if (OFFICIAL_HOSTS.has(link.hostname)) return null;
  const skeleton = brandSkeleton(link.unicodeHostname);
  if ((link.isPunycode || hasNonAscii(link.unicodeHostname)) && skeleton.includes(BRAND_TOKEN)) {
    return 'ALPHABET';
  }
  const labels = skeleton.split('.');
  const tokens = new Set<string>();
  for (const label of labels) {
    tokens.add(label.replace(/[-_]/g, ''));
    for (const part of label.split(/[-_]+/)) if (part) tokens.add(part);
  }
  for (const t of tokens) if (t.includes(BRAND_TOKEN)) return 'BRAND_IN_NAME';
  for (const t of tokens) {
    if (t.length < 4 || t.length > 9) continue;
    const limit = t.length >= 6 ? 2 : 1;
    if (editDistance(t, BRAND_TOKEN) <= limit) return 'TYPO';
  }
  return null;
}

export function classifyLink(link: ParsedLink): Classified {
  const host = link.hostname;
  const display = link.unicodeHostname !== host ? `${link.unicodeHostname} (${host})` : host;
  const signals: Signal[] = [];
  const entity: Entity = {
    kind: 'URL',
    raw: link.raw,
    display,
    canonicalKey: `host:${host}`,
    status: 'UNKNOWN',
  };

  // "https://mukuru.com@evil.example" — the part before @ is decoration; the
  // browser really goes to evil.example.
  const userInfoDeceives = link.hasUserInfo && /\.|mukuru/i.test(decodeURIComponentSafe(link.raw.split('@')[0] ?? ''));

  const social = findOfficialSocial(host, link.path.split(/[?#]/)[0] ?? '');
  if (social && !userInfoDeceives) {
    entity.status = 'OFFICIAL';
    entity.officialRecordId = social.id;
    entity.display = social.display;
    signals.push(sig('OFFICIAL_SOCIAL_MATCH', { host: social.display }));
    return { entity, signals };
  }

  const official = findOfficialHost(host);
  if (official && link.port === '' && !userInfoDeceives) {
    entity.status = 'OFFICIAL';
    entity.officialRecordId = official.id;
    signals.push(sig('OFFICIAL_DOMAIN_MATCH', { host }));
    return { entity, signals };
  }

  if (OFFICIAL_REGISTRABLE_DOMAINS.has(link.registrableDomain) && !userInfoDeceives) {
    // e.g. "promo.mukuru.com": owned by Mukuru's domain, but not an address we have verified.
    entity.status = 'PARTIAL';
    signals.push(sig('UNVERIFIED_MUKURU_ADDRESS', { host }));
    return { entity, signals };
  }

  signals.push(sig('UNKNOWN_LINK', { host }));
  const technique = detectLookalike(link);
  if (technique === 'ALPHABET') {
    entity.status = 'LOOKALIKE';
    signals.push(sig('LOOKALIKE_ALPHABET', { host: link.unicodeHostname }));
  } else if (technique) {
    entity.status = 'LOOKALIKE';
    signals.push(sig('LOOKALIKE_DOMAIN', { host }));
  }

  const pathSkeleton = brandSkeleton(decodeURIComponentSafe(link.path));
  if (userInfoDeceives || /mukuru\.(com|co|net|org)/.test(pathSkeleton)) {
    signals.push(sig('DECEPTIVE_LINK', { host }));
  } else if (!technique && pathSkeleton.includes(BRAND_TOKEN)) {
    signals.push(sig('MUKURU_NAME_IN_LINK', { host }));
  }
  return { entity, signals };
}

/**
 * A link the URL parser refuses (e.g. broken punycode "xn--…") cannot be
 * opened safely or verified. Still report it as an unknown link instead of
 * silently ignoring it.
 */
export function classifyUnreadableLink(candidate: string): Classified {
  const host = (candidate.replace(/^[a-z]+:\/\//i, '').split(/[/?#:@]/)[0] ?? candidate).toLowerCase().slice(0, 120);
  const entity: Entity = { kind: 'URL', raw: candidate, display: host, canonicalKey: `host:${host}`, status: 'UNKNOWN' };
  const signals = [sig('UNKNOWN_LINK', { host })];
  if (brandSkeleton(host).includes(BRAND_TOKEN) || host.includes('xn--')) {
    entity.status = 'LOOKALIKE';
    signals.push(sig('LOOKALIKE_DOMAIN', { host }));
  }
  return { entity, signals };
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// ---------------------------------------------------------------------------
// Phones, emails, USSD
// ---------------------------------------------------------------------------

export function classifyPhone(raw: string, phone: NormalisedPhone): Classified {
  const official = findOfficialPhone(phone.e164);
  const entity: Entity = {
    kind: 'PHONE',
    raw,
    display: phone.display,
    canonicalKey: `phone:${phone.e164}`,
    status: official ? 'OFFICIAL' : 'UNKNOWN',
  };
  if (official) {
    entity.officialRecordId = official.id;
    return { entity, signals: [sig('OFFICIAL_PHONE_MATCH', { number: phone.display })] };
  }
  const signals = [sig('UNKNOWN_PHONE', { number: phone.display })];
  // Mukuru's fraud page: "A mukuru agent/employee would never contact you through a mobile number."
  if (phone.isMobile) signals.push(sig('MOBILE_NUMBER', { number: phone.display }));
  return { entity, signals };
}

export function classifyShortcode(code: string): Classified | null {
  const official = findOfficialShortcode(code);
  if (!official) return null;
  return {
    entity: {
      kind: 'SMS_SHORTCODE',
      raw: code,
      display: code,
      canonicalKey: `sms:${code}`,
      status: 'OFFICIAL',
      officialRecordId: official.id,
    },
    signals: [sig('OFFICIAL_SMS_MATCH', { code })],
  };
}

export function classifyEmail(raw: string): Classified {
  const address = raw.toLowerCase();
  const domainPart = address.slice(address.lastIndexOf('@') + 1);
  const parsedDomain = parseLink(domainPart);
  const host = parsedDomain?.hostname ?? domainPart;
  const entity: Entity = { kind: 'EMAIL', raw, display: address, canonicalKey: `email:${address}`, status: 'UNKNOWN' };
  const official = findOfficialEmail(address);
  if (official) {
    entity.status = 'OFFICIAL';
    entity.officialRecordId = official.id;
    return { entity, signals: [sig('OFFICIAL_EMAIL_MATCH', { email: address })] };
  }
  if (parsedDomain && OFFICIAL_REGISTRABLE_DOMAINS.has(parsedDomain.registrableDomain)) {
    entity.status = 'PARTIAL';
    return { entity, signals: [sig('UNVERIFIED_MUKURU_ADDRESS', { host: address })] };
  }
  const signals = [sig('UNKNOWN_EMAIL', { email: address })];
  if (parsedDomain && detectLookalike(parsedDomain)) {
    entity.status = 'LOOKALIKE';
    signals.push(sig('LOOKALIKE_DOMAIN', { host }));
  } else if (brandSkeleton(address.slice(0, address.lastIndexOf('@'))).includes(BRAND_TOKEN)) {
    // "mukuru.support@gmail.com": the address itself pretends to be Mukuru.
    entity.status = 'LOOKALIKE';
    signals.push(sig('IMPERSONATION_CLAIM', { value: address }));
  }
  return { entity, signals };
}

export function classifyUssd(code: string): Classified {
  const official = findOfficialUssd(code);
  const entity: Entity = {
    kind: 'USSD',
    raw: code,
    display: code,
    canonicalKey: `ussd:${code}`,
    status: official ? 'OFFICIAL' : 'UNKNOWN',
  };
  if (official) {
    entity.officialRecordId = official.id;
    return { entity, signals: [sig('OFFICIAL_USSD_MATCH', { code })] };
  }
  return { entity, signals: [sig('UNKNOWN_USSD', { code })] };
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export function classifyLocation(text: string): Classified {
  const display = text.replace(/\s+/g, ' ').trim().slice(0, 160);
  const match = matchLocation(text, OFFICIAL_LOCATIONS);
  const entity: Entity = {
    kind: 'LOCATION',
    raw: display,
    display,
    canonicalKey: locationCanonicalKey(text),
    status: 'UNKNOWN',
  };
  if (match.kind === 'OFFICIAL') {
    entity.status = 'OFFICIAL';
    entity.officialRecordId = match.location.id;
    entity.display = `${match.location.name}, ${match.location.address}`;
    return { entity, signals: [sig('OFFICIAL_LOCATION_MATCH', { place: match.location.name, city: match.location.city })] };
  }
  if (match.kind === 'PARTIAL') {
    entity.status = 'PARTIAL';
    return {
      entity,
      signals: [
        sig('UNKNOWN_LOCATION'),
        sig('PARTIAL_LOCATION_MATCH', { city: match.location.city, missing: match.missing }),
      ],
    };
  }
  return { entity, signals: [sig('UNKNOWN_LOCATION')] };
}
