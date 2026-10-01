import { LANGUAGES } from '../domain/types';
import type { Language } from '../domain/types';
import { en } from './locales/en';
import type { Messages } from './locales/en';
import { pt } from './locales/pt';
import { sn } from './locales/sn';

/**
 * A small, typed, dependency-free dictionary system (no live translation
 * APIs). The same `translate` runs in React and in Netlify Functions, so the
 * API can answer in the caller's language.
 */
export const DICTIONARIES: Record<Language, Messages> = { en, pt, sn };

/** BCP-47 tags for <html lang>. */
export const HTML_LANG: Record<Language, string> = { en: 'en-ZA', pt: 'pt-MZ', sn: 'sn' };

export type TranslateParams = Record<string, string | number>;

function lookup(dict: unknown, key: string): unknown {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}

/**
 * Looks up `key` in the chosen language, falling back to English, then to
 * the key itself. With a numeric `count`, `key_one` / `key_other` are tried first.
 */
export function translate(lang: Language, key: string, params?: TranslateParams): string {
  const count = params?.count;
  const candidates = typeof count === 'number' ? [`${key}_${count === 1 ? 'one' : 'other'}`, key] : [key];
  for (const dict of [DICTIONARIES[lang] ?? en, en]) {
    for (const candidate of candidates) {
      const value = lookup(dict, candidate);
      if (typeof value === 'string') return interpolate(value, params);
    }
  }
  return key;
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** "pt-MZ" → "pt", "sn-ZW" → "sn", anything unknown → "en". */
export function resolveLanguage(value: string | null | undefined): Language {
  if (!value) return 'en';
  const base = value.toLowerCase().split(/[-_]/)[0];
  return isLanguage(base) ? base : 'en';
}
