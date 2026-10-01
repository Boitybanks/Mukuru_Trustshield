import { describe, expect, it } from 'vitest';
import { REASON_CODES, VERDICTS } from '../../src/domain/types';
import { DICTIONARIES, resolveLanguage, translate } from '../../src/i18n/translate';
import { presentResult } from '../../src/i18n/present';
import { check } from '../../src/domain/checker/check';
import { en } from '../../src/i18n/locales/en';

function flatten(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}

const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');
const enFlat = flatten(en);

describe.each(['pt', 'sn'] as const)('%s dictionary', (lang) => {
  const flat = flatten(DICTIONARIES[lang]);

  it('has exactly the same keys as English', () => {
    expect(Object.keys(flat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it('has no empty strings', () => {
    for (const [key, value] of Object.entries(flat)) expect(value.trim(), key).not.toBe('');
  });

  it('keeps every {{placeholder}} of the English text', () => {
    for (const [key, value] of Object.entries(enFlat)) expect(placeholders(flat[key]!), key).toBe(placeholders(value));
  });
});

describe('reason catalogue is explainable in every language', () => {
  it.each(['en', 'pt', 'sn'] as const)('%s has text and action for every reason code', (lang) => {
    for (const code of REASON_CODES) {
      const text = translate(lang, `reasons.${code}.text`, { count: 2 });
      const action = translate(lang, `reasons.${code}.action`);
      expect(text, code).not.toMatch(/^reasons\./);
      expect(action, code).not.toMatch(/^reasons\./);
    }
  });
});

describe('core result concepts use the agreed wording', () => {
  it.each([
    ['en', 'Official Mukuru', 'Not official — stop', 'Can’t confirm'],
    ['pt', 'Mukuru oficial', 'Não é oficial — pare', 'Não foi possível confirmar'],
    ['sn', 'Mukuru yepamutemo', 'Haisi Mukuru yepamutemo — mira', 'Hatina kukwanisa kusimbisa'],
  ] as const)('%s', (lang, official, notOfficial, cantConfirm) => {
    expect(translate(lang, 'verdict.OFFICIAL.title')).toBe(official);
    expect(translate(lang, 'verdict.NOT_OFFICIAL.title')).toBe(notOfficial);
    expect(translate(lang, 'verdict.CANT_CONFIRM.title')).toBe(cantConfirm);
  });
});

describe('language fallback', () => {
  it('falls back to English for an unknown key in another language, then to the key', () => {
    expect(translate('sn', 'does.not.exist')).toBe('does.not.exist');
  });

  it('resolves browser language tags', () => {
    expect(resolveLanguage('pt-MZ')).toBe('pt');
    expect(resolveLanguage('sn-ZW')).toBe('sn');
    expect(resolveLanguage('en-ZA')).toBe('en');
    expect(resolveLanguage('fr-FR')).toBe('en');
    expect(resolveLanguage(undefined)).toBe('en');
  });

  it('pluralises with count', () => {
    expect(translate('en', 'result.reportedBy', { count: 1 })).toBe('Reported by 1 TrustShield user');
    expect(translate('en', 'result.reportedBy', { count: 7 })).toBe('Reported by 7 TrustShield users');
  });
});

describe('presentation', () => {
  it('the same verdict is explained in all three languages', () => {
    const r = check('https://mukuru-secure-pay.co.za/verify');
    for (const lang of ['en', 'pt', 'sn'] as const) {
      const p = presentResult(lang, r.verdict, r.signals);
      expect(p.title).toBe(translate(lang, 'verdict.NOT_OFFICIAL.title'));
      expect(p.headline).toContain('mukuru-secure-pay.co.za');
      expect(p.nextSteps[0]).toBe(translate(lang, 'verdict.NOT_OFFICIAL.next'));
    }
  });

  it('summarises OTP + money + fake link in one plain sentence (ATOM §10)', () => {
    const r = check('Your Mukuru payment is blocked. Pay R250 now and send us your OTP: https://mukuru-release.co.za');
    expect(presentResult('en', r.verdict, r.signals).headline).toBe(
      'This message asks for your OTP and for money, through a web address that is not Mukuru.',
    );
  });

  it('never shows an arbitrary percentage score', () => {
    for (const v of VERDICTS) expect(presentResult('en', v, []).headline).not.toMatch(/%/);
  });
});
