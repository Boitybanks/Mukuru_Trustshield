import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BadgeCheck,
  CircleCheck,
  CircleX,
  Info,
  LoaderCircle,
  Phone,
  PhoneCall,
  PhoneOff,
  RotateCcw,
  Send,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { presentReason, presentResult } from '../../i18n/present';
import { BrowserCallSafetyProvider, SimulatedCallSafetyProvider } from '../../domain/callLock/callSafety';
import type { CallSafetyProvider, CallSafetyProviderKind, CallState } from '../../domain/callLock/callSafety';
import { INITIAL_TX_STATE, transactionReducer } from '../../domain/callLock/transactionMachine';
import type { TxState } from '../../domain/callLock/transactionMachine';
import { PAYMENT_PURPOSES } from '../../domain/transaction/evaluateTransaction';
import type { PaymentPurpose, TransactionDraft, TransactionRisk } from '../../domain/transaction/evaluateTransaction';
import { isProofId } from '../../domain/proof/proof';
import { matchRecipientProof } from '../../domain/recipient/verifyRecipient';
import type { RecipientVerificationStatus } from '../../domain/recipient/verifyRecipient';
import { checkTransaction, lookupProof } from '../../api/client';
import type { ProofLookup } from '../../api/client';
import { CALLLOCK_SCENARIO } from '../../data/demoScenarios';
import { OFFICIAL_CHANNELS } from '../../data/officialRegistry';
import { ReasonList, VerdictCard } from '../../components/Verdict';
import { ClaimsList } from '../mukuruProof/ProofClaims';

type TimelineKey =
  | 'callStarted'
  | 'submitted'
  | 'paused'
  | 'callEnded'
  | 'rechecked'
  | 'waiting'
  | 'blocked'
  | 'sent'
  | 'cancelled';

interface TimelineEntry {
  id: number;
  key: TimelineKey;
  at: Date;
}

/** Result of checking a MukuruProof against the typed recipient name. */
export interface RecipientVerification {
  status: RecipientVerificationStatus;
  proof: Extract<ProofLookup, { status: 'VALID' }>;
}

const TIMELINE_ICON: Record<TimelineKey, typeof Phone> = {
  callStarted: PhoneCall,
  submitted: Send,
  paused: ShieldX,
  callEnded: PhoneOff,
  rechecked: ShieldCheck,
  waiting: Info,
  blocked: CircleX,
  sent: CircleCheck,
  cancelled: CircleCheck,
};

const formatRand = (amount: number) => amount.toLocaleString('en-ZA', { maximumFractionDigits: 2 });

export default function CallLockPage() {
  const { t, lang } = useI18n();
  const simulated = useMemo(() => new SimulatedCallSafetyProvider('INACTIVE'), []);
  const browser = useMemo(() => new BrowserCallSafetyProvider(), []);
  const [mode, setMode] = useState<Exclude<CallSafetyProviderKind, 'NATIVE_DEVICE'>>('SIMULATED');
  const provider: CallSafetyProvider = mode === 'SIMULATED' ? simulated : browser;
  const [callState, setCallState] = useState<CallState>('INACTIVE');
  const [tx, dispatch] = useReducer(transactionReducer, INITIAL_TX_STATE);
  const [draft, setDraft] = useState<TransactionDraft>({ ...CALLLOCK_SCENARIO });
  const [acknowledged, setAcknowledged] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [proofIdInput, setProofIdInput] = useState('');
  const [verifyPhase, setVerifyPhase] = useState<'idle' | 'checking' | 'error'>('idle');
  const [verification, setVerification] = useState<RecipientVerification | null>(null);
  const nextId = useRef(0);
  const prevStatus = useRef<TxState['status']>(tx.status);

  // Verifying one recipient never carries over to a different name: MukuruProof
  // answers "is this person who they say they are?", not "was this box ticked?".
  useEffect(() => {
    setVerification(null);
    setVerifyPhase('idle');
  }, [draft.recipientName]);

  const verifyRecipient = async () => {
    const id = proofIdInput.trim();
    if (!isProofId(id)) {
      setVerifyPhase('error');
      return;
    }
    setVerifyPhase('checking');
    try {
      const result = await lookupProof(id);
      if (result.status !== 'VALID') {
        setVerifyPhase('error');
        setVerification(null);
        return;
      }
      setVerification({ status: matchRecipientProof(draft.recipientName, result.holder.displayName), proof: result });
      setVerifyPhase('idle');
    } catch {
      setVerifyPhase('error');
    }
  };

  const log = (...keys: TimelineKey[]) =>
    setTimeline((tl) => [...tl, ...keys.map((key) => ({ id: nextId.current++, key, at: new Date() }))]);

  // The provider is the ONLY source of call information: a state, nothing else.
  useEffect(() => {
    let live = true;
    void provider.getCallState().then((s) => live && setCallState(s));
    const unsubscribe = provider.subscribe?.((s) => setCallState(s));
    return () => {
      live = false;
      unsubscribe?.();
    };
  }, [provider]);

  useEffect(() => {
    dispatch({ type: 'CALL_STATE_CHANGED', callState });
  }, [callState]);

  // CHECKING means "re-run TrustShield". It can only ever end in REVIEW or BLOCKED — never SENT.
  useEffect(() => {
    if (tx.status !== 'CHECKING') return;
    let cancelled = false;
    void checkTransaction(tx.draft, callState === 'ACTIVE' ? 'INACTIVE' : callState, lang).then((result: TransactionRisk) => {
      if (!cancelled) dispatch({ type: 'CHECK_COMPLETED', result });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when a new check starts
  }, [tx]);

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = tx.status;
    if (prev === tx.status) return;
    if (tx.status === 'PAUSED_ON_CALL') log('paused');
    if (tx.status === 'REVIEW') log('rechecked', 'waiting');
    if (tx.status === 'BLOCKED') log('rechecked', 'blocked');
    if (tx.status === 'SENT') log('sent');
    if (tx.status === 'CANCELLED') log('cancelled');
  }, [tx.status]);

  const startCall = () => {
    if (mode !== 'SIMULATED' || callState === 'ACTIVE') return;
    log('callStarted');
    simulated.setCallState('ACTIVE');
  };

  const endCall = () => {
    if (mode !== 'SIMULATED' || callState !== 'ACTIVE') return;
    log('callEnded');
    simulated.setCallState('INACTIVE');
  };

  const restart = () => {
    simulated.setCallState('INACTIVE');
    setMode('SIMULATED');
    dispatch({ type: 'RESET' });
    setDraft({ ...CALLLOCK_SCENARIO });
    setAcknowledged(false);
    setTimeline([]);
    setProofIdInput('');
    setVerification(null);
    setVerifyPhase('idle');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    log('submitted');
    dispatch({ type: 'SUBMIT', draft: { ...draft, recipientVerification: verification?.status }, callState });
  };

  const confirm = () => dispatch({ type: 'CONFIRM', callState, acknowledgedWarning: acknowledged, at: new Date().toISOString() });
  const cancel = () => dispatch({ type: 'CANCEL' });

  const amountLabel = formatRand('draft' in tx && tx.draft ? tx.draft.amount : draft.amount);

  return (
    <div className="page">
      <div className="stack">
        <section className="hero" aria-labelledby="calllock-title">
          <p className="eyebrow">MUKURU TRUSTSHIELD</p>
          <h1 id="calllock-title">{t('callLock.title')}</h1>
          <p className="hero__lead">
            <strong>{t('callLock.tagline')}</strong> {t('callLock.intro')}
          </p>
          <p className="reminder" style={{ marginTop: 14 }}>
            <ShieldCheck size={22} aria-hidden="true" />
            <span data-testid="calllock-privacy">{t('callLock.privacy')}</span>
          </p>
        </section>

        <div className="calllock-grid">
          <div className="stack">
            <section className="card demo-panel" aria-labelledby="demo-controls-title">
              <div className="input-meta">
                <h2 className="section-title" id="demo-controls-title">
                  {t('callLock.controls')}
                </h2>
                <span className="badge badge--sim">{t('callLock.demoBadge')}</span>
              </div>

              <ol className="step-list small" aria-label={t('callLock.steps.title')}>
                <li>{t('callLock.steps.one')}</li>
                <li>{t('callLock.steps.two')}</li>
                <li>{t('callLock.steps.three')}</li>
              </ol>

              <div className="stack" style={{ marginTop: 16 }}>
                <div>
                  <p className="field-name small" id="detection-label">
                    {t('callLock.detection')}
                  </p>
                  <div className="segmented" role="group" aria-labelledby="detection-label">
                    {(['SIMULATED', 'BROWSER_UNSUPPORTED'] as const).map((m) => (
                      <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} data-testid={`mode-${m}`}>
                        {t(`callLock.provider.${m}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="input-meta">
                  <span className="field-name small">{t('callLock.callState')}</span>
                  <span className={`call-state call-state--${callState}`} data-testid="call-state" data-state={callState}>
                    <span className="call-state__dot" aria-hidden="true" />
                    {t(`callLock.state.${callState}`)}
                  </span>
                </p>

                <div className="btn-row btn-row--2">
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={startCall}
                    disabled={mode !== 'SIMULATED' || callState === 'ACTIVE'}
                    data-testid="simulate-call"
                  >
                    <PhoneCall size={20} aria-hidden="true" />
                    {t('callLock.simulateCall')}
                  </button>
                  <button
                    type="button"
                    className="btn btn--dark"
                    onClick={endCall}
                    disabled={mode !== 'SIMULATED' || callState !== 'ACTIVE'}
                    data-testid="end-call"
                  >
                    <PhoneOff size={20} aria-hidden="true" />
                    {t('callLock.endCall')}
                  </button>
                </div>
                <button type="button" className="btn btn--ghost" onClick={restart} data-testid="restart">
                  <RotateCcw size={20} aria-hidden="true" />
                  {t('callLock.restart')}
                </button>
              </div>
            </section>

            <section className="card" aria-labelledby="scenario-title">
              <h2 className="section-title" id="scenario-title">
                {t('callLock.scenarioTitle')}
              </h2>
              <p style={{ marginBottom: 12 }}>{t('callLock.scenario')}</p>
              <p className="small muted">{t('callLock.callerLabel')}</p>
              <blockquote className="quote" style={{ margin: '8px 0 0' }}>
                {t('callLock.callerQuote')}
              </blockquote>
            </section>

            <section className="card" aria-labelledby="timeline-title">
              <h2 className="section-title" id="timeline-title">
                {t('callLock.timeline.title')}
              </h2>
              {timeline.length === 0 ? (
                <p className="muted small">—</p>
              ) : (
                <ol className="timeline" data-testid="timeline" aria-live="polite">
                  {timeline.map((entry) => {
                    const Icon = TIMELINE_ICON[entry.key];
                    return (
                      <li key={entry.id} data-key={entry.key}>
                        <Icon size={22} aria-hidden="true" />
                        <span>
                          {t(`callLock.timeline.${entry.key}`)}
                          <time dateTime={entry.at.toISOString()}>{entry.at.toLocaleTimeString()}</time>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>

          <section aria-label={t('callLock.phoneLabel')}>
            <div className="phone" data-testid="phone">
              <div className="phone__top" aria-hidden="true">
                <span>09:41</span>
                <span>Mukuru</span>
              </div>
              {callState === 'ACTIVE' && (
                <div className="call-banner" role="status" data-testid="call-banner">
                  <Phone size={20} aria-hidden="true" />
                  <span>
                    {t('callLock.banner')}
                    <small>{t('callLock.bannerCaller')}</small>
                  </span>
                </div>
              )}
              <div className="phone__app-bar">
                <Send size={20} aria-hidden="true" />
                {t('callLock.send.title')}
              </div>
              <div className="phone__body" data-testid="tx-status" data-status={tx.status}>
                {mode === 'BROWSER_UNSUPPORTED' && (
                  <p className="report-count small" data-testid="unknown-notice">
                    <Info size={20} aria-hidden="true" />
                    <span>{t('callLock.unknownNotice')}</span>
                  </p>
                )}
                <PhoneBody
                  tx={tx}
                  draft={draft}
                  setDraft={setDraft}
                  onSubmit={submit}
                  onConfirm={confirm}
                  onCancel={cancel}
                  onRestart={restart}
                  acknowledged={acknowledged}
                  setAcknowledged={setAcknowledged}
                  amountLabel={amountLabel}
                  lang={lang}
                  proofIdInput={proofIdInput}
                  setProofIdInput={setProofIdInput}
                  verifyPhase={verifyPhase}
                  verification={verification}
                  onVerifyRecipient={verifyRecipient}
                />
              </div>
              <div className="money-status">
                <span>{t('callLock.moneySent')}</span>
                <span
                  className={`money-status__value--${tx.status === 'SENT' ? 'yes' : 'no'}`}
                  data-testid="money-sent"
                  data-sent={tx.status === 'SENT'}
                >
                  {tx.status === 'SENT' ? t('callLock.yes') : t('callLock.no')}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

interface BodyProps {
  tx: TxState;
  draft: TransactionDraft;
  setDraft: (d: TransactionDraft) => void;
  onSubmit: (e: FormEvent) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onRestart: () => void;
  acknowledged: boolean;
  setAcknowledged: (v: boolean) => void;
  amountLabel: string;
  lang: ReturnType<typeof useI18n>['lang'];
  proofIdInput: string;
  setProofIdInput: (v: string) => void;
  verifyPhase: 'idle' | 'checking' | 'error';
  verification: RecipientVerification | null;
  onVerifyRecipient: () => void;
}

function PhoneBody(props: BodyProps) {
  const { t } = useI18n();
  const { tx, draft, setDraft } = props;

  if (tx.status === 'EDITING') {
    return (
      <form className="stack" onSubmit={props.onSubmit} data-testid="send-form">
        <div className="field">
          <span className="field-name">{t('callLock.send.recipient')}</span>
          <div className="recipient">
            <span className="avatar" aria-hidden="true">
              SM
            </span>
            <strong className="break-anywhere">{draft.recipientName}</strong>
            {draft.recipientIsNew && <span className="badge badge--new">{t('callLock.send.newRecipient')}</span>}
          </div>
        </div>
        {draft.recipientIsNew && <RecipientVerificationPanel {...props} />}
        <div className="field">
          <label htmlFor="tx-amount">{t('callLock.send.amount')}</label>
          <input
            id="tx-amount"
            className="text-input"
            type="number"
            inputMode="decimal"
            min={1}
            max={1000000}
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
        <div className="field">
          <label htmlFor="tx-purpose">{t('callLock.send.purpose')}</label>
          <select
            id="tx-purpose"
            className="select"
            value={draft.purpose}
            onChange={(e) => setDraft({ ...draft, purpose: e.target.value as PaymentPurpose })}
          >
            {PAYMENT_PURPOSES.map((p) => (
              <option key={p} value={p}>
                {t(`callLock.send.purposes.${p}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tx-reference">{t('callLock.send.reference')}</label>
          <input
            id="tx-reference"
            className="text-input"
            maxLength={140}
            value={draft.reference}
            onChange={(e) => setDraft({ ...draft, reference: e.target.value })}
          />
        </div>
        <button
          type="submit"
          className="btn btn--primary btn--block"
          data-testid="send-button"
          disabled={props.verification?.status === 'MISMATCH'}
        >
          <Send size={22} aria-hidden="true" />
          {t('callLock.send.submit', { amount: props.amountLabel })}
        </button>
      </form>
    );
  }

  if (tx.status === 'PAUSED_ON_CALL') {
    return (
      <div className="pause-screen" role="alert" data-testid="paused-screen">
        <span className="pause-screen__icon" aria-hidden="true">
          <PhoneOff size={40} />
        </span>
        <h3>{t('callLock.paused.title')}</h3>
        <p>
          <strong>{t('callLock.paused.line1')}</strong>
        </p>
        <p>{t('callLock.paused.line2')}</p>
        <p>{t('callLock.paused.line3')}</p>
        <span className="badge" data-testid="paused-status">
          {t('callLock.paused.status')}
        </span>
        {/* Deliberately NO "continue anyway" button. Cancelling is always allowed. */}
        <button type="button" className="btn btn--ghost btn--block" onClick={props.onCancel}>
          {t('callLock.review.cancel')}
        </button>
      </div>
    );
  }

  if (tx.status === 'CHECKING') {
    return (
      <div className="checking" role="status" data-testid="rechecking">
        <LoaderCircle size={28} className="spin" aria-hidden="true" />
        {t('callLock.checking')}
      </div>
    );
  }

  if (tx.status === 'REVIEW' || tx.status === 'BLOCKED') {
    return <ReviewScreen {...props} result={tx.result} txDraft={tx.draft} blocked={tx.status === 'BLOCKED'} />;
  }

  if (tx.status === 'SENT') {
    return (
      <div className="pause-screen" data-testid="sent-screen">
        <span className="pause-screen__icon" style={{ background: 'var(--official-bg)', color: 'var(--official)' }} aria-hidden="true">
          <BadgeCheck size={40} />
        </span>
        <h3 style={{ color: 'var(--official)' }}>{t('callLock.sent.title')}</h3>
        <p>{t('callLock.sent.body')}</p>
        <button type="button" className="btn btn--outline btn--block" onClick={props.onRestart}>
          <RotateCcw size={20} aria-hidden="true" />
          {t('callLock.restart')}
        </button>
      </div>
    );
  }

  return (
    <div className="pause-screen" data-testid="cancelled-screen">
      <span className="pause-screen__icon" style={{ background: 'var(--official-bg)', color: 'var(--official)' }} aria-hidden="true">
        <ShieldCheck size={40} />
      </span>
      <h3 style={{ color: 'var(--official)' }}>{t('callLock.cancelled.title')}</h3>
      <p>{t('callLock.cancelled.body')}</p>
      <button type="button" className="btn btn--outline btn--block" onClick={props.onRestart}>
        <RotateCcw size={20} aria-hidden="true" />
        {t('callLock.restart')}
      </button>
    </div>
  );
}

/**
 * The missing connection between Send Money and MukuruProof: for a new
 * recipient, lets the customer verify who actually owns the account before
 * the normal CallLock/TrustShield risk check runs.
 */
function RecipientVerificationPanel(props: BodyProps) {
  const { t } = useI18n();
  const { verification, verifyPhase } = props;

  if (verification?.status === 'VERIFIED') {
    return (
      <div className="field" data-testid="recipient-verified" data-status="VERIFIED">
        <p className="status-msg status-msg--ok">
          <BadgeCheck size={20} aria-hidden="true" />
          {t('callLock.send.verify.verifiedHeading')}
        </p>
        <p className="small muted">{t('callLock.send.verify.verifiedBody')}</p>
        <ClaimsList claims={verification.proof.claims} />
      </div>
    );
  }

  if (verification?.status === 'MISMATCH') {
    return (
      <div className="field" data-testid="recipient-mismatch" data-status="MISMATCH">
        <p className="status-msg status-msg--error" role="alert">
          <ShieldX size={20} aria-hidden="true" />
          {t('callLock.send.verify.mismatchHeading')}
        </p>
        <p className="small">{t('callLock.send.verify.mismatchBody')}</p>
        <p className="small">
          {t('callLock.send.verify.holderLabel')}: <strong>{verification.proof.holder.displayName}</strong>
        </p>
        <span className="badge badge--new" data-testid="do-not-send">
          {t('callLock.send.verify.doNotSend')}
        </span>
      </div>
    );
  }

  return (
    <div className="field">
      <span className="field-name small">{t('callLock.send.verify.title')}</span>
      <p className="small muted">{t('callLock.send.verify.prompt', { name: props.draft.recipientName })}</p>
      <div className="btn-row">
        <input
          className="text-input"
          placeholder={t('callLock.send.verify.placeholder')}
          value={props.proofIdInput}
          onChange={(e) => props.setProofIdInput(e.target.value)}
          data-testid="verify-recipient-input"
        />
        <button
          type="button"
          className="btn btn--outline"
          onClick={props.onVerifyRecipient}
          disabled={verifyPhase === 'checking'}
          data-testid="verify-recipient-button"
        >
          {verifyPhase === 'checking' ? (
            <LoaderCircle size={18} className="spin" aria-hidden="true" />
          ) : (
            <BadgeCheck size={18} aria-hidden="true" />
          )}
          {t('callLock.send.verify.button')}
        </button>
      </div>
      {verifyPhase === 'error' && (
        <p className="status-msg status-msg--error" data-testid="verify-recipient-error">
          {t('callLock.send.verify.error')}
        </p>
      )}
      <span className="badge" data-testid="recipient-verification-status">
        {t('callLock.send.verify.notVerified')}
      </span>
    </div>
  );
}

function ReviewScreen(props: BodyProps & { result: TransactionRisk; txDraft: TransactionDraft; blocked: boolean }) {
  const { t } = useI18n();
  const { result, txDraft, blocked, lang } = props;
  const reasons = result.signals.map((s) => presentReason(lang, s));
  const headline = result.verdict ? presentResult(lang, result.verdict, result.signals).headline : t('callLock.review.noWarnings');
  const canSend = result.risk !== 'CAUTION' || props.acknowledged;

  return (
    <div className="stack" data-testid="review-screen" data-risk={result.risk}>
      <h3 className="subhead">{blocked ? t('callLock.blocked.title') : t('callLock.review.title')}</h3>
      <dl className="summary-rows">
        <div>
          <dt>{t('callLock.send.recipient')}</dt>
          <dd>
            {txDraft.recipientName}
            {txDraft.recipientIsNew && (
              <>
                {' '}
                <span className="badge badge--new">{t('callLock.send.newRecipient')}</span>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>{t('callLock.send.amount')}</dt>
          <dd data-testid="review-amount">R{props.amountLabel}</dd>
        </div>
        <div>
          <dt>{t('callLock.send.purpose')}</dt>
          <dd>{t(`callLock.send.purposes.${txDraft.purpose}`)}</dd>
        </div>
      </dl>

      {result.verdict ? (
        <VerdictCard verdict={result.verdict} testId="tx-verdict">
          <p className="verdict__headline">{headline}</p>
          <ReasonList reasons={reasons} showCodes />
        </VerdictCard>
      ) : (
        <div className="stack">
          <p className="status-msg status-msg--ok">
            <CircleCheck size={22} aria-hidden="true" />
            {headline}
          </p>
          {reasons.length > 0 && <ReasonList reasons={reasons} showCodes />}
        </div>
      )}

      {blocked ? (
        <>
          <p className="status-msg status-msg--error" data-testid="not-sent">
            <ShieldX size={22} aria-hidden="true" />
            {t('callLock.blocked.body')}
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn--dark btn--block" onClick={props.onCancel} data-testid="cancel-payment">
              {t('callLock.blocked.cancel')}
            </button>
            <a className="btn btn--ghost btn--block" href={OFFICIAL_CHANNELS.callHref}>
              <Phone size={20} aria-hidden="true" />
              {t('callLock.blocked.callMukuru')}
            </a>
          </div>
        </>
      ) : (
        <>
          <p className="small muted" data-testid="not-sent">
            {t('callLock.review.notSent')}
          </p>
          {result.risk === 'CAUTION' && (
            <label className="checkbox">
              <input type="checkbox" checked={props.acknowledged} onChange={(e) => props.setAcknowledged(e.target.checked)} />
              <span>{t('callLock.review.acknowledge')}</span>
            </label>
          )}
          <div className="btn-row">
            <button type="button" className="btn btn--primary btn--block" onClick={props.onConfirm} disabled={!canSend} data-testid="confirm-send">
              {t('callLock.review.confirm', { amount: props.amountLabel })}
            </button>
            <button type="button" className="btn btn--ghost btn--block" onClick={props.onCancel} data-testid="cancel-payment">
              {t('callLock.review.cancel')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
