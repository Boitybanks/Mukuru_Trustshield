/** Maximum characters TrustShield analyses. Longer input is truncated, never rejected silently. */
export const MAX_INPUT_CHARS = 5000;

// Zero-width and bidi-control characters are a classic way to hide text or
// break keyword matching ("O<zero-width space>TP"). Strip them before any
// analysis. Built from code points so the source contains no invisible bytes.
const INVISIBLE_RANGES: [number, number][] = [
  [0x00ad, 0x00ad], // soft hyphen
  [0x034f, 0x034f], // combining grapheme joiner
  [0x061c, 0x061c], // Arabic letter mark
  [0x115f, 0x1160], // Hangul fillers
  [0x17b4, 0x17b5], // Khmer inherent vowels
  [0x180e, 0x180e], // Mongolian vowel separator
  [0x200b, 0x200f], // zero-width space/joiners, LRM/RLM
  [0x202a, 0x202e], // bidi embeddings and overrides
  [0x2060, 0x2064], // word joiner, invisible operators
  [0x2066, 0x206f], // bidi isolates, deprecated format chars
  [0xfeff, 0xfeff], // zero-width no-break space / BOM
];
const INVISIBLE = new RegExp(
  `[${INVISIBLE_RANGES.map(([a, b]) => (a === b ? `\\u{${a.toString(16)}}` : `\\u{${a.toString(16)}}-\\u{${b.toString(16)}}`)).join('')}]`,
  'gu',
);

export function stripInvisible(text: string): string {
  return text.replace(INVISIBLE, '');
}

/** NFKC folds full-width / compatibility characters ("ｍｕｋｕｒｕ" → "mukuru"). */
export function normaliseInput(raw: string): { text: string; truncated: boolean } {
  const cleaned = stripInvisible(raw.normalize('NFKC')).replace(/\r\n?/g, '\n').trim();
  const truncated = cleaned.length > MAX_INPUT_CHARS;
  return { text: truncated ? cleaned.slice(0, MAX_INPUT_CHARS) : cleaned, truncated };
}

/** Lowercase, remove diacritics ("não" → "nao"), collapse whitespace. Used for keyword rules. */
export function foldForMatching(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
}

/** Deterministic 64-bit FNV-1a fingerprint (hex). Used to key reports of contact-free messages. */
export function fingerprint(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5 | 1) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}
