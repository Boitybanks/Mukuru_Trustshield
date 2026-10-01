/**
 * Minimal RFC 3492 Punycode decoder (browser + Node, no deprecated
 * `punycode` module). Used only to reveal what an `xn--` hostname label
 * really looks like so we can compare it to "mukuru".
 */
const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;

function adapt(delta: number, numPoints: number, firstTime: boolean): number {
  let k = 0;
  delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  while (delta > ((BASE - TMIN) * TMAX) >> 1) {
    delta = Math.floor(delta / (BASE - TMIN));
    k += BASE;
  }
  return Math.floor(k + ((BASE - TMIN + 1) * delta) / (delta + SKEW));
}

function basicToDigit(code: number): number {
  if (code - 48 < 10) return code - 22;
  if (code - 65 < 26) return code - 65;
  if (code - 97 < 26) return code - 97;
  return BASE;
}

/** Decodes a single punycode payload (without the "xn--" prefix). Returns null when malformed. */
export function decodePunycode(input: string): string | null {
  const output: number[] = [];
  let n = INITIAL_N;
  let i = 0;
  let bias = INITIAL_BIAS;
  let basic = input.lastIndexOf('-');
  if (basic < 0) basic = 0;
  for (let j = 0; j < basic; j++) {
    const c = input.charCodeAt(j);
    if (c >= 0x80) return null;
    output.push(c);
  }
  for (let index = basic > 0 ? basic + 1 : 0; index < input.length; ) {
    const oldi = i;
    for (let w = 1, k = BASE; ; k += BASE) {
      if (index >= input.length) return null;
      const digit = basicToDigit(input.charCodeAt(index++));
      if (digit >= BASE) return null;
      i += digit * w;
      if (i > 0x7fffffff) return null;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
    }
    const out = output.length + 1;
    bias = adapt(i - oldi, out, oldi === 0);
    n += Math.floor(i / out);
    if (n > 0x10ffff) return null;
    i %= out;
    output.splice(i++, 0, n);
  }
  return String.fromCodePoint(...output);
}

/** Converts each "xn--" label of an ASCII hostname to Unicode. */
export function hostnameToUnicode(asciiHost: string): string {
  return asciiHost
    .split('.')
    .map((label) => {
      if (!label.startsWith('xn--')) return label;
      return decodePunycode(label.slice(4)) ?? label;
    })
    .join('.');
}

/**
 * Characters from other alphabets that are visually confusable with the
 * Latin letters scammers need to fake "mukuru" (and common domain letters).
 * Subset of Unicode TR39 confusables, chosen for the brand we protect.
 */
const CONFUSABLES: Record<string, string> = {
  // Cyrillic
  а: 'a', в: 'b', с: 'c', е: 'e', ё: 'e', һ: 'h', і: 'i', ј: 'j', к: 'k', м: 'm', н: 'h', о: 'o',
  р: 'p', ѕ: 's', т: 't', у: 'y', х: 'x', ԁ: 'd', ԛ: 'q', ԝ: 'w', г: 'r', п: 'n', ц: 'u', и: 'u',
  // Greek
  α: 'a', β: 'b', ε: 'e', η: 'n', ι: 'i', κ: 'k', μ: 'u', ν: 'v', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x', ω: 'w',
  // Armenian / other common look-alikes
  ս: 'u', ո: 'n', օ: 'o', ʀ: 'r', ᴋ: 'k', ᴍ: 'm', ᴜ: 'u', ı: 'i', ł: 'l', ŀ: 'l',
};

/**
 * A "skeleton" for brand comparison: strip accents, map confusable letters
 * and "rn" → "m" so that "rnukuru", "mükuru" and "mukurи" all compare as "mukuru".
 */
export function brandSkeleton(text: string): string {
  const stripped = text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  let out = '';
  for (const ch of stripped) out += CONFUSABLES[ch] ?? ch;
  return out.replace(/rn/g, 'm').replace(/vv/g, 'w');
}

export function hasNonAscii(text: string): boolean {
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) > 0x7f) return true;
  return false;
}
