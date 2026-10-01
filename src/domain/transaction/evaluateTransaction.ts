import type { ReasonCode, Signal } from '../types';
import { RULE_SEVERITY, SEVERITY_RANK } from '../rules/catalogue';
import { analyse } from '../checker/analyse';

export const PAYMENT_PURPOSES = ['FAMILY_SUPPORT', 'BILLS', 'GOODS', 'JOB_FEE', 'RELEASE_FEE', 'OTHER'] as const;
export type PaymentPurpose = (typeof PAYMENT_PURPOSES)[number];

export interface TransactionDraft {
  recipientName: string;
  /** True when the customer has never paid this recipient before. */
  recipientIsNew: boolean;
  amount: number;
  currency: 'ZAR';
  purpose: PaymentPurpose;
  /** Free-text payment reference the customer typed (often dictated by a scammer). */
  reference: string;
}

export type TransactionRiskLevel = 'STOP' | 'CAUTION' | 'NO_WARNING_SIGNS';

export interface TransactionRisk {
  risk: TransactionRiskLevel;
  /** The customer-facing verdict card to show: STOP → NOT_OFFICIAL, CAUTION → CANT_CONFIRM. */
  verdict: 'NOT_OFFICIAL' | 'CANT_CONFIRM' | null;
  reasonCodes: ReasonCode[];
  signals: Signal[];
}

/** Absence-of-evidence codes from the reference text are noise in a payment review. */
const IGNORED_FROM_REFERENCE: ReadonlySet<ReasonCode> = new Set([
  'UNKNOWN_PHONE',
  'UNKNOWN_LINK',
  'UNKNOWN_EMAIL',
  'UNKNOWN_USSD',
  'UNKNOWN_LOCATION',
  'PARTIAL_LOCATION_MATCH',
  'NO_CHECKABLE_DETAILS',
]);

function sig(code: ReasonCode): Signal {
  return { code, severity: RULE_SEVERITY[code] };
}

/**
 * Re-runs TrustShield on a payment before money moves. Used after a
 * CallLock pause and for every send. It never sends anything itself.
 */
export function evaluateTransaction(draft: TransactionDraft): TransactionRisk {
  const found = new Map<ReasonCode, Signal>();
  const add = (s: Signal) => {
    if (!found.has(s.code)) found.set(s.code, s);
  };

  if (draft.recipientIsNew) add(sig('NEW_RECIPIENT'));
  if (draft.purpose === 'JOB_FEE') {
    add(sig('UPFRONT_FEE'));
    add(sig('FAKE_JOB_CONTEXT'));
  }
  if (draft.purpose === 'RELEASE_FEE') add(sig('RELEASE_FEE'));

  const text = [draft.reference, draft.recipientName].filter(Boolean).join('. ');
  if (text.trim()) {
    for (const s of analyse(text).signals) {
      if (s.severity === 'positive' || IGNORED_FROM_REFERENCE.has(s.code)) continue;
      add(s);
    }
  }

  const signals = Array.from(found.values()).sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  const hard = signals.some((s) => s.severity === 'high' || s.severity === 'critical');
  const mediums = signals.filter((s) => s.severity === 'medium').length;

  let risk: TransactionRiskLevel = 'NO_WARNING_SIGNS';
  if (hard || mediums >= 2) risk = 'STOP';
  else if (mediums === 1) risk = 'CAUTION';

  return {
    risk,
    verdict: risk === 'STOP' ? 'NOT_OFFICIAL' : risk === 'CAUTION' ? 'CANT_CONFIRM' : null,
    reasonCodes: signals.map((s) => s.code),
    signals,
  };
}
