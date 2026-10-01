export interface NormalisedPhone {
  /** E.164, e.g. "+27860018555". */
  e164: string;
  /** "ZA" for South African numbers, otherwise "INTL". */
  region: 'ZA' | 'INTL';
  /** Friendly local format for display, e.g. "0860 018 555". */
  display: string;
  /** Ordinary SA cellphone number (06x/07x/081–084). */
  isMobile: boolean;
}

/**
 * Normalises South African and international phone numbers.
 * "0860018555", "0860 018 555", "+27 86 001 8555", "0027860018555" and
 * "(086) 001-8555" all resolve to "+27860018555".
 */
export function normalisePhone(raw: string): NormalisedPhone | null {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  let national: string | null = null;
  if (hasPlus && digits.startsWith('27')) national = digits.slice(2);
  else if (!hasPlus && digits.startsWith('0027')) national = digits.slice(4);
  else if (!hasPlus && digits.length === 11 && digits.startsWith('27')) national = digits.slice(2);
  else if (!hasPlus && digits.length === 10 && digits.startsWith('0')) national = digits.slice(1);

  if (national !== null) {
    if (national.startsWith('0')) national = national.slice(1); // "+27 (0)86…"
    if (national.length !== 9 || !/^[1-9]/.test(national)) return null;
    const local = `0${national}`;
    return {
      e164: `+27${national}`,
      region: 'ZA',
      display: formatSouthAfrican(local),
      isMobile: /^0(6|7|8[1-4])/.test(local),
    };
  }

  // Other countries: accept plausible E.164 (8–15 digits) written with + or 00.
  const intl = hasPlus ? digits : digits.startsWith('00') ? digits.slice(2) : null;
  if (intl && intl.length >= 8 && intl.length <= 15 && /^[1-9]/.test(intl)) {
    return { e164: `+${intl}`, region: 'INTL', display: `+${intl}`, isMobile: false };
  }
  return null;
}

function formatSouthAfrican(local: string): string {
  // Share-call / toll-free numbers are written 4-3-3 ("0860 018 555").
  if (/^08[06]/.test(local)) return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/**
 * Finds phone-number-shaped substrings in free text. Deliberately strict so
 * amounts ("R250", "R 1 500") and dates are not mistaken for numbers.
 */
const PHONE_CANDIDATE = /(?:\+|\b00)?\(?\d[\d\s().-]{6,18}\d/g;

export function extractPhoneCandidates(text: string): { raw: string; phone: NormalisedPhone }[] {
  const found: { raw: string; phone: NormalisedPhone }[] = [];
  for (const match of text.matchAll(PHONE_CANDIDATE)) {
    const raw = match[0].trim();
    const start = match.index ?? 0;
    const before = text.slice(Math.max(0, start - 6), start);
    // Skip currency amounts ("R 1 500 000", "MT 25 000") and digits glued to words or USSD codes.
    if (/(?:^|[^A-Za-z])(?:R|ZAR|MT|MZN|USD|US\$|\$)\s?$/i.test(before)) continue;
    if (/[A-Za-z*#]$/.test(before)) continue;
    if (/\d{4}[-/]\d{2}[-/]\d{2}/.test(raw)) continue; // ISO dates
    const digitCount = raw.replace(/\D/g, '').length;
    if (digitCount < 9 || digitCount > 15) continue;
    const phone = normalisePhone(raw);
    if (phone) found.push({ raw, phone });
  }
  return found;
}

const USSD_PATTERN = /\*\d{2,4}(?:\*\d{1,8})*#/g;

export function extractUssdCodes(text: string): string[] {
  return Array.from(text.matchAll(USSD_PATTERN), (m) => m[0]);
}
