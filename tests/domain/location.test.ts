import { describe, expect, it } from 'vitest';
import { check } from '../../src/domain/checker/check';
import { looksLikeLocation, matchLocation, locationCanonicalKey } from '../../src/domain/normalisation/location';
import { OFFICIAL_LOCATIONS } from '../../src/data/officialLocations';
import { KNOWN_CITIES } from '../../src/domain/checker/analyse';

describe('location detection', () => {
  it.each([
    'Mukuru collection point, 19 Random Road, Johannesburg',
    '102 Longmarket St, Cape Town',
    'Mukuru branch Bosman Pretoria',
  ])('"%s" looks like a place', (text) => {
    expect(looksLikeLocation(text, KNOWN_CITIES)).toBe(true);
  });

  it('a normal sentence is not a place', () => {
    expect(looksLikeLocation('Hello, how are you?', KNOWN_CITIES)).toBe(false);
  });
});

describe('official location matching', () => {
  it.each([
    'Mukuru Long Market branch, 102 Longmarket Street, Cape Town',
    '102 longmarket st cape town',
    'Shop G7, 102 Long Market Street, Cape Town City Centre',
    'Mukuru, 102 Longmarkt Street, Cape Town', // one-letter typo
    'Mukuru Bosman, Pretoria',
    '252 Robert Sobukwe Street, Sunnyside, Pretoria',
    '11 Leyds Street Braamfontein',
    '530 Mahatma Gandhi Rd, Durban',
  ])('"%s" → OFFICIAL', (text) => {
    const r = check(text);
    expect(r.inputType).toBe('LOCATION');
    expect(r.verdict).toBe('OFFICIAL');
    expect(r.reasonCodes).toContain('OFFICIAL_LOCATION_MATCH');
  });

  it('a different street number on the same street is NOT matched', () => {
    expect(matchLocation('12 Longmarket Street, Cape Town', OFFICIAL_LOCATIONS).kind).not.toBe('OFFICIAL');
  });

  it('a street without the town asks for the town', () => {
    const m = matchLocation('Robert Sobukwe Street', OFFICIAL_LOCATIONS);
    expect(m).toMatchObject({ kind: 'PARTIAL', missing: 'AREA' });
  });

  it('Scenario 4: an unknown collection point is CANT_CONFIRM (never automatically fraudulent)', () => {
    const r = check('Mukuru collection point, 19 Random Road, Johannesburg');
    expect(r.verdict).toBe('CANT_CONFIRM');
    expect(r.inputType).toBe('LOCATION');
    expect(r.reasonCodes).toEqual(expect.arrayContaining(['UNKNOWN_LOCATION', 'PARTIAL_LOCATION_MATCH']));
  });

  it('a place in a town with no known Mukuru branch is CANT_CONFIRM / UNKNOWN_LOCATION', () => {
    const r = check('Mukuru pick up point, 4 Market Street, Polokwane');
    expect(r.verdict).toBe('CANT_CONFIRM');
    expect(r.reasonCodes).toContain('UNKNOWN_LOCATION');
  });

  it('canonical location keys ignore order and filler words', () => {
    expect(locationCanonicalKey('Mukuru collection point, 19 Random Road, Johannesburg')).toBe(
      locationCanonicalKey('Johannesburg, 19 Random Rd'),
    );
  });

  it('every official location record cites a mukuru.com source page', () => {
    for (const loc of OFFICIAL_LOCATIONS) {
      expect(loc.source).toMatch(/^https:\/\/www\.mukuru\.com\//);
      expect(loc.demoStatus).toBe('PUBLIC_MUKURU_SOURCE');
    }
  });
});
