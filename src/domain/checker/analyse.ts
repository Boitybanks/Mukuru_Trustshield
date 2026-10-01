import type { Analysis, Entity, EntityKind, InputType, Signal } from '../types';
import { RULE_SEVERITY } from '../rules/catalogue';
import { foldForMatching, fingerprint, normaliseInput } from '../normalisation/text';
import { extractLinkCandidates, parseLink, refang } from '../normalisation/url';
import { extractPhoneCandidates, extractUssdCodes } from '../normalisation/phone';
import { looksLikeLocation } from '../normalisation/location';
import {
  classifyEmail,
  classifyLink,
  classifyLocation,
  classifyPhone,
  classifyShortcode,
  classifyUnreadableLink,
  classifyUssd,
} from '../rules/entityRules';
import type { Classified } from '../rules/entityRules';
import { detectMukuruClaim, evaluateContent } from '../rules/contentRules';
import { OFFICIAL_LOCATIONS } from '../../data/officialRegistry';

// The look-behind skips "user@host" inside a URL ("https://mukuru.com@evil.example"):
// that is a link trick, handled by the link rules, not an email address.
const EMAIL = /(?<!\/\/[^\s@]*)(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,24}/gu;
const MAX_ENTITIES = 10;

/** Words that just label a pasted contact ("WhatsApp: +27…") and are not a message. */
const LABEL_ONLY = /^(call|phone|tel|cell|number|whatsapp|wa|sms|link|website|site|url|email|e-mail|ussd|dial|from|contact|mukuru|official|numero|ligue|nhamba|runhare)$/;

export const KNOWN_CITIES: readonly string[] = Array.from(
  new Set([
    ...OFFICIAL_LOCATIONS.map((l) => l.city),
    'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Soweto', 'Polokwane', 'Bloemfontein',
    'Gqeberha', 'Port Elizabeth', 'East London', 'Mbombela', 'Nelspruit', 'Rustenburg',
    'Kimberley', 'Pietermaritzburg', 'Germiston', 'Benoni', 'Sandton', 'Midrand', 'Tembisa',
    'Musina', 'Maputo', 'Harare', 'Bulawayo',
  ]),
);

function removeFirst(haystack: string, needle: string): string {
  const at = haystack.indexOf(needle);
  return at < 0 ? haystack : `${haystack.slice(0, at)} ${haystack.slice(at + needle.length)}`;
}

function inferInputType(entities: Entity[], residual: string): InputType {
  const words = foldForMatching(residual)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((w) => !LABEL_ONLY.test(w));
  const kinds = new Set<EntityKind>(entities.map((e) => e.kind));
  if (entities.length === 1 && words.length === 0) {
    const kind = entities[0]!.kind;
    return kind === 'SMS_SHORTCODE' ? 'PHONE' : kind;
  }
  if (kinds.size === 1 && kinds.has('LOCATION')) return 'LOCATION';
  if (kinds.size >= 2) return 'MIXED';
  return 'MESSAGE';
}

/**
 * Step 1 of a check: understand the input with no outside data.
 * Detects every contact detail, classifies each against the official
 * registry, and runs the message rules on the remaining text.
 */
export function analyse(rawInput: string): Analysis {
  const { text, truncated } = normaliseInput(rawInput);
  const classified: Classified[] = [];
  let residual = refang(text);

  for (const match of residual.matchAll(EMAIL)) classified.push(classifyEmail(match[0]));
  residual = residual.replace(EMAIL, ' ');

  for (const candidate of extractLinkCandidates(residual)) {
    const link = parseLink(candidate);
    if (link) classified.push(classifyLink(link));
    else if (/^https?:\/\//i.test(candidate)) classified.push(classifyUnreadableLink(candidate));
    residual = removeFirst(residual, candidate);
  }

  for (const code of extractUssdCodes(residual)) {
    classified.push(classifyUssd(code));
    residual = removeFirst(residual, code);
  }

  // Official SMS short codes (e.g. 34246). Unknown 5-digit numbers are not treated as contacts.
  for (const match of residual.matchAll(/(?<![\d*#+])\b\d{5}\b(?![\d*#])/g)) {
    const shortcode = classifyShortcode(match[0]);
    if (shortcode) {
      classified.push(shortcode);
      residual = removeFirst(residual, match[0]);
    }
  }

  for (const { raw, phone } of extractPhoneCandidates(residual)) {
    classified.push(classifyPhone(raw, phone));
    residual = removeFirst(residual, raw);
  }

  if (classified.length === 0 && looksLikeLocation(text, KNOWN_CITIES)) {
    classified.push(classifyLocation(text));
    residual = '';
  }

  // De-duplicate by canonical key ("0860018555" pasted twice is one contact).
  const seen = new Set<string>();
  const entities: Entity[] = [];
  const signals: Signal[] = [];
  for (const c of classified) {
    if (seen.has(c.entity.canonicalKey) || entities.length >= MAX_ENTITIES) continue;
    seen.add(c.entity.canonicalKey);
    entities.push(c.entity);
    signals.push(...c.signals);
  }

  const isLocation = entities.length === 1 && entities[0]!.kind === 'LOCATION';
  const mukuruClaim = !isLocation && detectMukuruClaim(residual);
  if (!isLocation) signals.push(...evaluateContent(residual));

  // A message that says it is Mukuru but uses a contact Mukuru doesn't own.
  if (mukuruClaim) {
    const add = (s: Signal) => signals.push(s);
    for (const e of entities) {
      if (e.kind === 'URL' && e.status !== 'OFFICIAL' && e.status !== 'PARTIAL') {
        add({ code: 'UNKNOWN_LINK_IN_MUKURU_MESSAGE', severity: RULE_SEVERITY.UNKNOWN_LINK_IN_MUKURU_MESSAGE, params: { host: e.display } });
      }
      if ((e.kind === 'PHONE' || e.kind === 'EMAIL' || e.kind === 'USSD') && e.status === 'UNKNOWN') {
        add({ code: 'IMPERSONATION_CLAIM', severity: RULE_SEVERITY.IMPERSONATION_CLAIM, params: { value: e.display } });
      }
    }
  }

  const inputType = inferInputType(entities, residual);
  const messageKey =
    entities.length === 0 && foldForMatching(text).length > 0
      ? `msg:${fingerprint(foldForMatching(text).replace(/\s+/g, ' '))}`
      : null;

  return { input: text, inputType, entities, signals, mukuruClaim, messageKey, truncated };
}
