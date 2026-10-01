/**
 * Deterministic judge-demo inputs (ATOM.md §23). Each maps to a fixed,
 * tested verdict so the live demo never depends on luck.
 */
export interface DemoScenario {
  id: 'official' | 'fakeLink' | 'scamMessage' | 'unknownLocation' | 'realBranch';
  labelKey: string;
  input: string;
  expected: 'OFFICIAL' | 'NOT_OFFICIAL' | 'CANT_CONFIRM';
}

export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  { id: 'official', labelKey: 'home.demo.official', input: '+27 86 0018 555', expected: 'OFFICIAL' },
  { id: 'fakeLink', labelKey: 'home.demo.fakeLink', input: 'https://mukuru-secure-pay.co.za/verify', expected: 'NOT_OFFICIAL' },
  {
    id: 'scamMessage',
    labelKey: 'home.demo.scamMessage',
    input:
      'Your Mukuru account will be blocked today.\nPay R250 verification fee and send your OTP here:\nhttps://mukuru-verify-now.example',
    expected: 'NOT_OFFICIAL',
  },
  {
    id: 'unknownLocation',
    labelKey: 'home.demo.unknownLocation',
    input: 'Mukuru collection point, 19 Random Road, Johannesburg',
    expected: 'CANT_CONFIRM',
  },
  {
    id: 'realBranch',
    labelKey: 'home.demo.realBranch',
    input: 'Mukuru Long Market branch, 102 Longmarket Street, Cape Town',
    expected: 'OFFICIAL',
  },
];

/** The seeded CallLock story (ATOM.md §42). Recipient and reference are fictional. */
export const CALLLOCK_SCENARIO = {
  recipientName: 'Sipho M. (recruiter)',
  recipientIsNew: true,
  amount: 850,
  currency: 'ZAR' as const,
  purpose: 'JOB_FEE' as const,
  reference: 'Employment account activation',
};
