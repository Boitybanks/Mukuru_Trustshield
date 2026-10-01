/**
 * Mukuru TrustShield brand tokens.
 *
 * SOURCE OF BRAND VALUES (retrieved 2026-10-01):
 *  - Mukuru's public site stylesheet (https://www.mukuru.com/sa/, child theme
 *    CSS custom properties) defines: --orange #F05423, --charcoal #373A36,
 *    --charcoal-light #66686A, --teal #00A5A3, --grey #E9E9EA,
 *    --peach-orange #FFE0D6, --grey-2 #FCDCD3.
 *  - The logo is Mukuru's own header asset (Mukuru-Logo-final.webp),
 *    used unaltered. The press/media kit publishes no colour guidelines.
 *  - Mukuru's brand typeface ("Madera") is proprietary; we use the
 *    device's system font for speed on low-data phones.
 *
 * Values marked DERIVED are NOT Mukuru brand values. They exist only to
 * meet WCAG AA contrast for small text and for the three verdict states.
 *
 * These tokens mirror the CSS custom properties in global.css; a unit test
 * keeps the two in sync and checks contrast ratios.
 */
export const brandTokens = {
  color: {
    // Official Mukuru site values
    orange: '#F05423',
    charcoal: '#373A36',
    charcoalLight: '#66686A',
    teal: '#00A5A3',
    grey: '#E9E9EA',
    peach: '#FFE0D6',
    peachSoft: '#FCDCD3',
    white: '#FFFFFF',
    // DERIVED for accessibility
    ink: '#1F2120',
    orangeText: '#B83A12',
    surface: '#FBF8F6',
    official: '#17703A',
    officialBg: '#E9F6EE',
    danger: '#B42318',
    dangerBg: '#FDECEA',
    caution: '#8A4B00',
    cautionBg: '#FFF4DA',
  },
  radius: { card: '20px', control: '14px', pill: '999px' },
  font: {
    family: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    bodySize: '17px',
  },
} as const;

/** Text/background pairs the UI relies on, with the WCAG level each must meet. */
export const CONTRAST_PAIRS: { fg: keyof typeof brandTokens.color; bg: keyof typeof brandTokens.color; min: number; use: string }[] = [
  { fg: 'ink', bg: 'white', min: 4.5, use: 'body text' },
  { fg: 'charcoal', bg: 'white', min: 4.5, use: 'secondary text' },
  { fg: 'charcoalLight', bg: 'white', min: 4.5, use: 'muted text' },
  { fg: 'orangeText', bg: 'white', min: 4.5, use: 'orange small text' },
  { fg: 'white', bg: 'orange', min: 3, use: 'primary button (large bold text)' },
  { fg: 'white', bg: 'official', min: 4.5, use: 'OFFICIAL band' },
  { fg: 'white', bg: 'danger', min: 4.5, use: 'NOT OFFICIAL band' },
  { fg: 'white', bg: 'caution', min: 4.5, use: "CAN'T CONFIRM band" },
  { fg: 'official', bg: 'officialBg', min: 4.5, use: 'official card text' },
  { fg: 'danger', bg: 'dangerBg', min: 4.5, use: 'danger card text' },
  { fg: 'caution', bg: 'cautionBg', min: 4.5, use: 'caution card text' },
  { fg: 'ink', bg: 'peach', min: 4.5, use: 'hero text' },
];

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
