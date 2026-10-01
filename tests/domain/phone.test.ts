import { describe, expect, it } from 'vitest';
import { extractPhoneCandidates, extractUssdCodes, normalisePhone } from '../../src/domain/normalisation/phone';
import { check } from '../../src/domain/checker/check';

describe('phone normalisation', () => {
  it.each(['0860018555', '0860 018 555', '+27 86 001 8555', '+27860018555', '+27 86 0018 555', '0027860018555', '(086) 001-8555', '27860018555', '+27 (0)86 001 8555'])(
    '%s resolves to the canonical +27860018555',
    (raw) => {
      expect(normalisePhone(raw)?.e164).toBe('+27860018555');
    },
  );

  it('formats share-call numbers the way Mukuru writes them', () => {
    expect(normalisePhone('+27860018555')?.display).toBe('0860 018 555');
  });

  it('flags ordinary South African cellphone numbers', () => {
    expect(normalisePhone('071 234 5678')).toMatchObject({ e164: '+27712345678', isMobile: true });
    expect(normalisePhone('0860018555')?.isMobile).toBe(false);
  });

  it('keeps foreign numbers in E.164 without inventing a country', () => {
    expect(normalisePhone('+263 77 123 4567')).toMatchObject({ e164: '+263771234567', region: 'INTL' });
  });

  it('rejects things that are not phone numbers', () => {
    expect(normalisePhone('12345')).toBeNull();
    expect(normalisePhone('abc')).toBeNull();
    expect(normalisePhone('0012')).toBeNull();
  });
});

describe('phone extraction from text', () => {
  it('finds numbers inside a message', () => {
    const found = extractPhoneCandidates('Hi, call our agent on 071 234 5678 today');
    expect(found.map((f) => f.phone.e164)).toEqual(['+27712345678']);
  });

  it('does not mistake money amounts for phone numbers', () => {
    expect(extractPhoneCandidates('Pay R 1 500 000 now')).toEqual([]);
    expect(extractPhoneCandidates('Send R250 to unlock')).toEqual([]);
  });

  it('finds USSD codes', () => {
    expect(extractUssdCodes('Dial *130*567# now')).toEqual(['*130*567#']);
  });
});

describe('official phone match', () => {
  it('Scenario 1: +27 86 0018 555 is OFFICIAL', () => {
    const r = check('+27 86 0018 555');
    expect(r.verdict).toBe('OFFICIAL');
    expect(r.inputType).toBe('PHONE');
    expect(r.reasonCodes).toContain('OFFICIAL_PHONE_MATCH');
    expect(r.matchedOfficialRecord?.id).toBe('za-call-centre');
  });

  it('a labelled paste ("WhatsApp: …") is still a phone check', () => {
    expect(check('WhatsApp: +27 86 001 8555')).toMatchObject({ verdict: 'OFFICIAL', inputType: 'PHONE' });
  });

  it('official USSD code is OFFICIAL', () => {
    expect(check('*130*567#')).toMatchObject({ verdict: 'OFFICIAL', inputType: 'USSD' });
  });

  it('an unknown landline is CANT_CONFIRM, not a scam', () => {
    const r = check('011 555 0199');
    expect(r.verdict).toBe('CANT_CONFIRM');
    expect(r.reasonCodes).toContain('UNKNOWN_PHONE');
  });

  it('an unknown cellphone is CANT_CONFIRM, with Mukuru’s own “never from a mobile number” warning', () => {
    const r = check('071 234 5678');
    expect(r.verdict).toBe('CANT_CONFIRM');
    expect(r.reasonCodes).toEqual(expect.arrayContaining(['UNKNOWN_PHONE', 'MOBILE_NUMBER']));
  });

  it('an ordinary mobile number claiming to be Mukuru support is a strong NOT_OFFICIAL', () => {
    const r = check('0712345678 Hi, this is Mukuru support');
    expect(r.verdict).toBe('NOT_OFFICIAL');
    expect(r.reasonCodes).toContain('IMPERSONATION_CLAIM');
  });
});
