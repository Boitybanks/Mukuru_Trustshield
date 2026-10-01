import type { OfficialLocation } from '../../data/officialLocations';
import { foldForMatching } from './text';
import { fuzzyTokenEquals } from './similarity';

const ABBREVIATIONS: Record<string, string[]> = {
  st: ['street'], str: ['street'], rd: ['road'], ave: ['avenue'], av: ['avenue'], dr: ['drive'],
  ln: ['lane'], cnr: ['corner'], crn: ['corner'], blvd: ['boulevard'], cres: ['crescent'],
  pl: ['place'], sq: ['square'], ctr: ['centre'], cntr: ['centre'], center: ['centre'],
  bldg: ['building'], jhb: ['johannesburg'], joburg: ['johannesburg'], jozi: ['johannesburg'],
  pta: ['pretoria'], dbn: ['durban'], cpt: ['cape', 'town'], ct: ['cape', 'town'],
};

/** Street-type words: helpful context, but optional when matching ("Bree" ≈ "Bree Street"). */
export const STREET_TYPES = new Set([
  'street', 'road', 'avenue', 'drive', 'lane', 'corner', 'boulevard', 'crescent', 'close', 'way',
  'place', 'square', 'centre', 'building', 'mall', 'plaza', 'station', 'rank', 'arcade', 'court',
  'rua', 'avenida', 'estrada', 'travessa', 'praca', 'bairro', 'mugwagwa',
]);

const STOPWORDS = new Set([
  'the', 'at', 'of', 'and', 'in', 'on', 'near', 'opposite', 'next', 'to', 'by', 'a', 'an',
  'mukuru', 'branch', 'booth', 'store', 'kiosk', 'outlet', 'office', 'collection', 'collect', 'point',
  'pickup', 'pick', 'up', 'paypoint', 'location', 'address', 'south', 'africa', 'sa', 'za', 'rsa',
  'number', 'no', 'unit', 'shop', 'floor', 'ground', 'level', 'entrance', 'gate', 'de', 'da', 'do',
  'na', 'loja', 'ponto', 'recolha', 'levantamento', 'pa', 'ku', 'kero', 'gauteng', 'province',
]);

const LOCATION_INTENT =
  /\b(branch|booth|store|kiosk|outlet|collection point|pick ?up point|paypoint|pay point|collect (your|the) (money|cash)|located at|address|loja|balcao|ponto de (recolha|levantamento|pagamento)|endereco|bazi|kero|chitoro)\b/;
const STREET_WORD =
  /\b(street|st|str|road|rd|avenue|ave|drive|dr|lane|corner|cnr|boulevard|crescent|close|mall|centre|center|plaza|square|building|station|taxi rank|rank|arcade|rua|avenida|estrada|travessa|praca|bairro)\b\.?/;

export function locationTokens(text: string): string[] {
  const words = foldForMatching(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    const expanded = ABBREVIATIONS[w] ?? [w];
    for (const e of expanded) if (!STOPWORDS.has(e)) out.push(e);
  }
  return out;
}

function containsAll(haystack: string[], needles: string[]): boolean {
  return needles.every((n) => haystack.some((h) => fuzzyTokenEquals(h, n)));
}

/** Words that make the input look like a physical place. */
export function looksLikeLocation(text: string, knownCities: readonly string[]): boolean {
  if (text.length > 240) return false;
  const folded = foldForMatching(text);
  const tokens = locationTokens(text);
  const mentionsCity = knownCities.some((c) => containsAll(tokens, locationTokens(c)));
  const hasStreet = STREET_WORD.test(folded);
  const hasIntent = LOCATION_INTENT.test(folded);
  const hasNumber = /\b\d{1,5}[a-z]?\b/.test(folded);
  // "Mukuru Bosman, Pretoria": a short phrase naming a town is a place, not a message.
  const short = folded.split(/\s+/).length <= 6;
  return (hasStreet && (hasNumber || mentionsCity || hasIntent)) || (hasIntent && mentionsCity) || (short && mentionsCity);
}

export type LocationMatch =
  | { kind: 'OFFICIAL'; location: OfficialLocation }
  | { kind: 'PARTIAL'; location: OfficialLocation; missing: 'AREA' | 'STREET' }
  | { kind: 'NONE' };

/**
 * Conservative matching: a place is OFFICIAL only when one of its published
 * name/street keys AND its town agree, and the street number (if given)
 * does not contradict the record.
 */
export function matchLocation(text: string, locations: readonly OfficialLocation[]): LocationMatch {
  const tokens = locationTokens(text);
  const numbers = tokens.filter((t) => /^\d+[a-z]?$/.test(t));
  let streetKnown: LocationMatch | null = null;
  let areaKnown: LocationMatch | null = null;
  for (const loc of locations) {
    const areas = [loc.city, ...(loc.suburb ? [loc.suburb] : [])];
    const areaMatch = areas.some((area) => containsAll(tokens, locationTokens(area)));
    const keyMatch = loc.matchKeys.some((key) => {
      const core = locationTokens(key).filter((t) => !STREET_TYPES.has(t));
      return core.length > 0 && containsAll(tokens, core);
    });
    const numberConflict =
      loc.streetNumber !== undefined && numbers.length > 0 && !numbers.includes(loc.streetNumber.toLowerCase());
    if (keyMatch && areaMatch && !numberConflict) return { kind: 'OFFICIAL', location: loc };
    if (keyMatch && !areaMatch && !numberConflict) streetKnown ??= { kind: 'PARTIAL', location: loc, missing: 'AREA' };
    if (areaMatch && !keyMatch) areaKnown ??= { kind: 'PARTIAL', location: loc, missing: 'STREET' };
  }
  return streetKnown ?? areaKnown ?? { kind: 'NONE' };
}

export function locationCanonicalKey(text: string): string {
  // Order-insensitive so 'Bree St, Cape Town' and 'Cape Town, Bree Street' share one report.
  const tokens = Array.from(new Set(locationTokens(text))).sort();
  return `loc:${tokens.join(' ').slice(0, 160)}`;
}
