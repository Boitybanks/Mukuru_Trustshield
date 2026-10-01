import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { brandTokens, CONTRAST_PAIRS, contrastRatio } from '../../src/styles/brandTokens';

const css = readFileSync('src/styles/global.css', 'utf8');
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe('brand tokens', () => {
  it('Mukuru orange and charcoal match the values from Mukuru’s public stylesheet', () => {
    expect(brandTokens.color.orange).toBe('#F05423');
    expect(brandTokens.color.charcoal).toBe('#373A36');
  });

  it('every token is mirrored as a CSS custom property', () => {
    for (const [name, value] of Object.entries(brandTokens.color)) {
      const cssName = name === 'peachSoft' ? 'peach-soft' : kebab(name);
      expect(css, name).toContain(`--${cssName}: ${value};`);
    }
  });

  it.each(CONTRAST_PAIRS)('$use meets WCAG contrast ($fg on $bg ≥ $min)', ({ fg, bg, min }) => {
    expect(contrastRatio(brandTokens.color[fg], brandTokens.color[bg])).toBeGreaterThanOrEqual(min);
  });

  it('body text is at least 16px', () => {
    expect(css).toMatch(/body \{[^}]*font-size: 17px/);
  });

  it('respects reduced-motion preferences', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
