import { describe, expect, it } from 'vitest';
import { check } from '../../src/domain/checker/check';
import { evaluateContent } from '../../src/domain/rules/contentRules';
import { DEMO_SCENARIOS } from '../../src/data/demoScenarios';

const codes = (text: string) => evaluateContent(text).map((s) => s.code);

describe('message extraction', () => {
  it('extracts links, numbers and emails from one pasted message', () => {
    const r = check('Mukuru support here. Call 071 234 5678, email help@mukuru-help.example or visit https://mukuru-help.example');
    expect(r.entities.map((e) => e.kind).sort()).toEqual(['EMAIL', 'PHONE', 'URL']);
    expect(r.inputType).toBe('MIXED');
    expect(r.verdict).toBe('NOT_OFFICIAL');
  });

  it('does not treat the brand inside a link as a Mukuru claim', () => {
    expect(check('https://mukuru-secure-pay.co.za/verify').reasonCodes).not.toContain('UNKNOWN_LINK_IN_MUKURU_MESSAGE');
  });
});

describe('sensitive-data rules', () => {
  it.each([
    ['Please send me your PIN to confirm', 'REQUESTS_PIN'],
    ['Reply with the OTP we sent you', 'REQUESTS_OTP'],
    ['Share the 6-digit code you received', 'REQUESTS_OTP'],
    ['What is your password?', 'REQUESTS_PASSWORD'],
    ['Send your card number and CVV', 'REQUESTS_CARD_DETAILS'],
    ['We need a copy of your ID and your bank details', 'REQUESTS_PERSONAL_INFORMATION'],
  ] as const)('%s → %s', (text, code) => {
    expect(codes(text)).toContain(code);
  });

  it.each([
    'Mukuru will never ask you to share your PIN or OTP.',
    'Never share your OTP with anyone.',
    'Do not give your password to anyone, even if they say they are from Mukuru.',
    'A Mukuru nunca vai pedir o seu PIN ou OTP.',
    'Não partilhe o seu código OTP com ninguém.',
    'Usatumira PIN yako kune munhu.',
    'Mukuru haambokukumbiri PIN kana OTP yako.',
  ])('safety advice is not an alarm: "%s"', (text) => {
    expect(codes(text)).toEqual([]);
    expect(check(text).verdict).toBe('CANT_CONFIRM');
  });

  it('a negation earlier in the sentence does not hide a later request', () => {
    expect(codes("Don't hang up and send the OTP now")).toContain('REQUESTS_OTP');
    expect(codes("Don't tell anyone, just send me the PIN")).toContain('REQUESTS_PIN');
  });
});

describe('money and pressure rules', () => {
  it('release fee', () => {
    expect(codes('Your money is on hold. Pay R300 release fee to receive it')).toContain('RELEASE_FEE');
    expect(codes('Pay a fee to release your funds')).toContain('RELEASE_FEE');
  });

  it('upfront fee, including "we need R850 to activate"', () => {
    expect(codes('Pay the R200 registration fee to start work')).toContain('UPFRONT_FEE');
    expect(codes('We need R850 to activate your employment account')).toContain('UPFRONT_FEE');
  });

  it('"send money" alone is Mukuru product language, not a fee demand', () => {
    expect(codes('Send money home with Mukuru from R9.99')).toEqual([]);
  });

  it('urgency + payment', () => {
    expect(codes('Pay R250 now or lose your place')).toEqual(expect.arrayContaining(['UPFRONT_FEE', 'URGENT_PAYMENT']));
  });

  it('account-block threat and verify-your-account phishing', () => {
    expect(codes('Your Mukuru account will be blocked today')).toContain('ACCOUNT_BLOCK_THREAT');
    expect(codes('Click the link to verify your account')).toContain('VERIFY_ACCOUNT_REQUEST');
  });

  it('fake job, stay-on-call, secrecy and romance patterns', () => {
    expect(codes('We are hiring! Start work tomorrow')).toContain('FAKE_JOB_CONTEXT');
    expect(codes("Stay on the phone and I'll show you where to send it")).toContain('STAY_ON_CALL_PRESSURE');
    expect(codes("Keep this secret, don't tell anyone")).toContain('SECRECY_PRESSURE');
    expect(codes('My love, please send me money for the ticket')).toContain('ROMANCE_MONEY_REQUEST');
  });
});

describe('message verdicts', () => {
  it('Scenario 3: phishing message → NOT_OFFICIAL with UPFRONT_FEE, REQUESTS_OTP, ACCOUNT_BLOCK_THREAT, UNKNOWN_LINK', () => {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === 'scamMessage')!;
    const r = check(scenario.input);
    expect(r.verdict).toBe('NOT_OFFICIAL');
    expect(r.inputType).toBe('MESSAGE');
    expect(r.reasonCodes).toEqual(
      expect.arrayContaining(['UPFRONT_FEE', 'REQUESTS_OTP', 'ACCOUNT_BLOCK_THREAT', 'UNKNOWN_LINK']),
    );
  });

  it('ATOM §10 example → LOOKALIKE_DOMAIN, UPFRONT_FEE, REQUESTS_OTP, ACCOUNT_BLOCK_THREAT', () => {
    const r = check('Your Mukuru payment is blocked.\nPay R250 now and send us your OTP:\nhttps://mukuru-release.co.za');
    expect(r.verdict).toBe('NOT_OFFICIAL');
    expect(r.reasonCodes).toEqual(expect.arrayContaining(['LOOKALIKE_DOMAIN', 'UPFRONT_FEE', 'REQUESTS_OTP', 'ACCOUNT_BLOCK_THREAT']));
  });

  it('a scam written in Portuguese is caught', () => {
    const r = check('A sua conta Mukuru será bloqueada hoje. Pague a taxa de 300 MT e envie o código OTP para este número 0712345678');
    expect(r.verdict).toBe('NOT_OFFICIAL');
    expect(r.reasonCodes).toEqual(expect.arrayContaining(['REQUESTS_OTP', 'ACCOUNT_BLOCK_THREAT', 'UPFRONT_FEE', 'IMPERSONATION_CLAIM']));
  });

  it('a scam written in Shona is caught', () => {
    const r = check('Akaundi yako yeMukuru ichavharwa nhasi. Bhadhara R200 uye tumira OTP yako.');
    expect(r.verdict).toBe('NOT_OFFICIAL');
    expect(r.reasonCodes).toEqual(expect.arrayContaining(['REQUESTS_OTP', 'ACCOUNT_BLOCK_THREAT', 'UPFRONT_FEE']));
  });

  it('a Shona fake-job fee is caught', () => {
    const r = check('Tine basa kwauri. Bhadhara mari yekunyoresa R300 nhasi.');
    expect(r.verdict).toBe('NOT_OFFICIAL');
    expect(r.reasonCodes).toEqual(expect.arrayContaining(['UPFRONT_FEE', 'FAKE_JOB_CONTEXT']));
  });

  it('a genuine-looking message with only official contacts and no warning signs is OFFICIAL', () => {
    expect(check('Questions? Call Mukuru on 0860 018 555 or visit www.mukuru.com').verdict).toBe('OFFICIAL');
  });

  it('a real Mukuru number inside a message asking for the OTP is still NOT_OFFICIAL', () => {
    const r = check('This is Mukuru 0860018555. Reply with your OTP to keep your account open.');
    expect(r.verdict).toBe('NOT_OFFICIAL');
    expect(r.reasonCodes).toContain('REQUESTS_OTP');
  });

  it('ordinary chat is CANT_CONFIRM with NO_CHECKABLE_DETAILS', () => {
    const r = check('Hello, how are you?');
    expect(r).toMatchObject({ verdict: 'CANT_CONFIRM', reasonCodes: ['NO_CHECKABLE_DETAILS'] });
  });

  it('one warning sign without a Mukuru claim is CANT_CONFIRM, not a false alarm', () => {
    expect(check('We are hiring cleaners in Durban.').verdict).toBe('CANT_CONFIRM');
  });

  it('the CallLock caller script is NOT_OFFICIAL when pasted as a message', () => {
    const r = check("We need R850 to activate your Mukuru employment account. Stay on the phone and I'll show you where to send it.");
    expect(r.verdict).toBe('NOT_OFFICIAL');
    expect(r.reasonCodes).toEqual(expect.arrayContaining(['UPFRONT_FEE', 'FAKE_JOB_CONTEXT', 'STAY_ON_CALL_PRESSURE']));
  });
});
