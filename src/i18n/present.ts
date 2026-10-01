import type { Language, ReasonCode, Signal, Verdict } from '../domain/types';
import { SUBSUMED_BY } from '../domain/rules/catalogue';
import { translate } from './translate';

export interface PresentedReason {
  code: ReasonCode;
  severity: Signal['severity'];
  text: string;
  action: string;
}

export interface PresentedResult {
  title: string;
  /** One plain-language sentence explaining the verdict. */
  headline: string;
  reasons: PresentedReason[];
  /** The verdict's main next step plus the most relevant rule actions. */
  nextSteps: string[];
}

const MAX_REASONS = 5;

/** Hides codes fully explained by a more specific code that is also present. */
export function visibleSignals(signals: readonly Signal[]): Signal[] {
  const present = new Set(signals.map((s) => s.code));
  return signals.filter((s) => !(SUBSUMED_BY[s.code] ?? []).some((c) => present.has(c)));
}

function secretAsked(codes: Set<ReasonCode>): 'OTP' | 'PIN' | 'PASSWORD' | 'CARD' | null {
  if (codes.has('REQUESTS_OTP')) return 'OTP';
  if (codes.has('REQUESTS_PIN')) return 'PIN';
  if (codes.has('REQUESTS_PASSWORD')) return 'PASSWORD';
  if (codes.has('REQUESTS_CARD_DETAILS')) return 'CARD';
  return null;
}

export function presentReason(lang: Language, signal: Signal): PresentedReason {
  const params = signal.params ?? {};
  return {
    code: signal.code,
    severity: signal.severity,
    text: translate(lang, `reasons.${signal.code}.text`, params),
    action: translate(lang, `reasons.${signal.code}.action`, params),
  };
}

/** Turns verdict + reason codes into customer language. Pure; used by the API and the UI. */
export function presentResult(lang: Language, verdict: Verdict, signals: readonly Signal[]): PresentedResult {
  const shown = visibleSignals(signals).slice(0, MAX_REASONS);
  const reasons = shown.map((s) => presentReason(lang, s));
  const codes = new Set(signals.map((s) => s.code));

  const secret = secretAsked(codes);
  const money = codes.has('UPFRONT_FEE') || codes.has('RELEASE_FEE');
  const badLink =
    codes.has('LOOKALIKE_DOMAIN') ||
    codes.has('LOOKALIKE_ALPHABET') ||
    codes.has('DECEPTIVE_LINK') ||
    codes.has('UNKNOWN_LINK_IN_MUKURU_MESSAGE');

  let headline: string;
  if (verdict === 'NOT_OFFICIAL' && secret && money && badLink) {
    headline = translate(lang, 'result.summary.secretMoneyLink', { secret: translate(lang, `result.secret.${secret}`) });
  } else if (verdict === 'NOT_OFFICIAL' && secret && money) {
    headline = translate(lang, 'result.summary.secretMoney', { secret: translate(lang, `result.secret.${secret}`) });
  } else if (verdict === 'NOT_OFFICIAL' && codes.has('UPFRONT_FEE') && codes.has('FAKE_JOB_CONTEXT')) {
    headline = translate(lang, 'result.summary.moneyJob');
  } else {
    headline = reasons[0]?.text ?? translate(lang, 'verdict.CANT_CONFIRM.explain');
  }

  const nextSteps: string[] = [];
  const add = (s: string) => {
    if (s && !nextSteps.includes(s)) nextSteps.push(s);
  };
  add(translate(lang, `verdict.${verdict}.next`));
  if (verdict === 'CANT_CONFIRM') add(translate(lang, 'verdict.CANT_CONFIRM.dontAct'));
  for (const r of reasons.slice(0, 2)) add(r.action);

  return { title: translate(lang, `verdict.${verdict}.title`), headline, reasons, nextSteps };
}
