import { useEffect, useMemo, useReducer, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BadgeCheck,
  CircleCheck,
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
import { SimulatedCallSafetyProvider } from '../../domain/callLock/callSafety';
import type { CallSafetyProvider, CallState } from '../../domain/callLock/callSafety';
import { INITIAL_TX_STATE, transactionReducer } from '../../domain/callLock/transactionMachine';
import type { TxState } from '../../domain/callLock/transactionMachine';
import { PAYMENT_PURPOSES } from '../../domain/transaction/evaluateTransaction';
import type { PaymentPurpose, TransactionDraft, TransactionRisk } from '../../domain/transaction/evaluateTransaction';
import type { RecipientVerificationResult } from '../../domain/recipient/verifyRecipient';
import { checkTransaction } from '../../api/client';
import { OFFICIAL_CHANNELS } from '../../data/officialRegistry';
import { ReasonList, VerdictCard } from '../../components/Verdict';

const EMPTY_DRAFT: TransactionDraft = {
  recipientName: '',
  recipientIsNew: true,
  amount: 0,
  currency: 'ZAR',
  purpose: 'FAMILY_SUPPORT',
  reference: '',
};

const formatRand = (amount: number) => amount.toLocaleString('en-ZA', { maximumFractionDigits: 2 });

export default function CallLockPage() {
  const { t, lang } = useI18n();
  const simulated = useMemo(() => new SimulatedCallSafetyProvider('INACTIVE'), []);
  const provider: CallSafetyProvider = simulated;
  const [callState, setCallState] = useState<CallState>('INACTIVE');
  const [tx, dispatch] = useReducer(transactionReducer, INITIAL_TX_STATE);
  const [draft, setDraft] = useState<TransactionDraft>({ ...EMPTY_DRAFT });
  const [acknowledged, setAcknowledged] = useState(false);
  const [proofIdInput, setProofIdInput] = useState('');
  const [verifyPhase, setVerifyPhase] = useState<'idle' | 'checking' | 'error'>('idle');
  const [verification, setVerification] = useState<RecipientVerificationResult | null>(null);

  // A proof never carries over to a different recipient name.
  useEffect(() => {
    setVerification(null);
    setVerifyPhase('idle');
    setProofIdInput('');
    setDraft((current) => (current.recipientProofId ? { ...current, recipientProofId: undefined } : current));
  }, [draft.recipientName]);

  const checkRecipientProof = async (rawId: string) => {
    const id = rawId.trim();
    if (!id) {
      setVerifyPhase('error');
      setVerification({ status: 'INVALID' });
      return;
    }

    setVerifyPhase('checking');
    const candidate: TransactionDraft = { ...draft, recipientProofId: id };
    setDraft(candidate);
    const result = await checkTransaction(candidate, 'INACTIVE', lang);
    const serverVerification = result.recipientVerification ?? { status: 'UNAVAILABLE' as const };
    setVerification(serverVerification);
    setVerifyPhase(serverVerification.status === 'VERIFIED' || serverVerification.status === 'MISMATCH' ? 'idle' : 'error');
  };

  const verifyRecipient = async () => {
    await checkRecipientProof(proofIdInput);
  };

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
      if (!cancelled) {
        if (result.recipientVerification) setVerification(result.recipientVerification);
        dispatch({ type: 'CHECK_COMPLETED', result });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when a new check starts
  }, [tx]);

  const startCall = () => {
    if (callState !== 'ACTIVE') simulated.setCallState('ACTIVE');
  };

  const endCall = () => {
    if (callState === 'ACTIVE') simulated.setCallState('INACTIVE');
  };

  const restart = () => {
    simulated.setCallState('INACTIVE');
    dispatch({ type: 'RESET' });
    setDraft({ ...EMPTY_DRAFT });
    setAcknowledged(false);
    setProofIdInput('');
    setVerification(null);
    setVerifyPhase('idle');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SUBMIT', draft, callState });
  };

  const confirm = () => dispatch({ type: 'CONFIRM', callState, acknowledgedWarning: acknowledged, at: new Date().toISOString() });
  const cancel = () => dispatch({ type: 'CANCEL' });

  const amountLabel = formatRand('draft' in tx && tx.draft ? tx.draft.amount : draft.amount);

  return (
    <div className="page page--narrow">
      <div className="stack">
        <section className="intro" aria-labelledby="calllock-title">
          <h1 id="calllock-title">{t('callLock.title')}</h1>
          <p className="intro__lead">{t('callLock.intro')}</p>
        </section>

        <section className="call-bar" aria-label={t('callLock.controls')}>
          <span className={`call-state call-state--${callState}`} data-testid="call-state" data-state={callState}>
            <span className="call-state__dot" aria-hidden="true" />
            {t(`callLock.state.${callState}`)}
          </span>
          {callState === 'ACTIVE' ? (
            <button type="button" className="btn btn--small btn--dark" onClick={endCall} data-testid="end-call">
              <PhoneOff size={18} aria-hidden="true" />
              {t('callLock.endCall')}
            </button>
          ) : (
            <button type="button" className="btn btn--small btn--outline" onClick={startCall} data-testid="simulate-call">
              <PhoneCall size={18} aria-hidden="true" />
              {t('callLock.simulateCall')}
            </button>
          )}
        </section>

        <section className="card send-card" data-testid="phone" aria-label={t('callLock.send.title')}>
          {callState === 'ACTIVE' && (
            <div className="call-banner" role="status" data-testid="call-banner">
              <Phone size={20} aria-hidden="true" />
              <span>
                {t('callLock.banner')}
                <small>{t('callLock.bannerCaller')}</small>
              </span>
            </div>
          )}
          <div data-testid="tx-status" data-status={tx.status}>
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
        </section>
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
  verification: RecipientVerificationResult | null;
  onVerifyRecipient: () => void;
}

function PhoneBody(props: BodyProps) {
  const { t } = useI18n();
  const { tx, draft, setDraft } = props;

  if (tx.status === 'EDITING') {
    return (
      <form className="stack" onSubmit={props.onSubmit} data-testid="send-form">
        <div className="field">
          <label htmlFor="tx-recipient">{t('callLock.send.recipient')}</label>
          <input
            id="tx-recipient"
            className="text-input"
            maxLength={80}
            autoComplete="off"
            placeholder={t('callLock.send.recipientPlaceholder')}
            value={draft.recipientName}
            onChange={(e) => setDraft({ ...draft, recipientName: e.target.value })}
          />
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
            value={draft.amount || ''}
            onChange={(e) => setDraft({ ...draft, amount: Math.max(0, Number(e.target.value) || 0) })}
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
          disabled={props.verification?.status === 'MISMATCH' || !draft.recipientName.trim() || draft.amount <= 0}
        >
          <Send size={22} aria-hidden="true" />
          {draft.amount > 0 ? t('callLock.send.submit', { amount: props.amountLabel }) : t('callLock.send.title')}
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
 * Recipient verification is displayed here, but only the backend is allowed to
 * create a VERIFIED state. The browser submits an opaque proof ID and renders
 * the server's account-verification result.
 */
function RecipientVerificationPanel(props: BodyProps) {
  const { t } = useI18n();
  const { verification, verifyPhase } = props;

  if (verification?.status === 'VERIFIED') {
    const checks = verification.checks;
    return (
      <div className="field verification-card verification-card--ok" data-testid="recipient-verified" data-status="VERIFIED">
        <p className="status-msg status-msg--ok">
          <BadgeCheck size={20} aria-hidden="true" />
          {t('callLock.send.verify.verifiedHeading')}
        </p>
        <p className="small muted">{t('callLock.send.verify.verifiedBody')}</p>
        <div className="verification-checks">
          <span className="verification-check">✓ {t('callLock.send.verify.checks.accountExists')}</span>
          <span className="verification-check">✓ {t('callLock.send.verify.checks.identity')}</span>
          <span className="verification-check">✓ {t('callLock.send.verify.checks.ownership')}</span>
          <span className="verification-check">✓ {t('callLock.send.verify.checks.active')}</span>
          <span className="verification-check">✓ {t('callLock.send.verify.checks.credits')}</span>
        </div>
        {verification.holder && (
          <p className="small">
            {t('callLock.send.verify.holderLabel')}: <strong>{verification.holder.displayName}</strong>
          </p>
        )}
        {checks && !Object.values(checks).every(Boolean) && (
          <p className="status-msg status-msg--error">{t('callLock.send.verify.error')}</p>
        )}
      </div>
    );
  }

  if (verification?.status === 'MISMATCH') {
    return (
      <div className="field verification-card verification-card--danger" data-testid="recipient-mismatch" data-status="MISMATCH">
        <p className="status-msg status-msg--error" role="alert">
          <ShieldX size={20} aria-hidden="true" />
          {t('callLock.send.verify.mismatchHeading')}
        </p>
        <p className="small">{t('callLock.send.verify.mismatchBody')}</p>
        {verification.holder && (
          <p className="small">
            {t('callLock.send.verify.holderLabel')}: <strong>{verification.holder.displayName}</strong>
          </p>
        )}
        <span className="badge badge--new" data-testid="do-not-send">
          {t('callLock.send.verify.doNotSend')}
        </span>
      </div>
    );
  }

  const failureStatus =
    verification && verification.status !== 'REQUIRED' && verification.status !== 'NOT_REQUIRED'
      ? verification.status
      : null;

  return (
    <div className="field verification-card">
      <span className="field-name small">{t('callLock.send.verify.title')}</span>
      <p className="small muted">{t('callLock.send.verify.prompt', { name: props.draft.recipientName.trim() || t('callLock.send.recipient') })}</p>
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
      {failureStatus ? (
        <p className="status-msg status-msg--error" data-testid="verify-recipient-error">
          {t('callLock.send.verify.cannotConfirmHeading')}: {t('callLock.send.verify.status.' + failureStatus)}
        </p>
      ) : verifyPhase === 'error' ? (
        <p className="status-msg status-msg--error" data-testid="verify-recipient-error">
          {t('callLock.send.verify.error')}
        </p>
      ) : (
        <span className="badge" data-testid="recipient-verification-status">
          {t('callLock.send.verify.notVerified')}
        </span>
      )}
    </div>
  );
}

function ReviewScreen(props: BodyProps & { result: TransactionRisk; txDraft: TransactionDraft; blocked: boolean }) {
  const { t } = useI18n();
  const { result, txDraft, blocked, lang } = props;
  const reasons = result.signals.map((s) => presentReason(lang, s));
  const headline = result.verdict ? presentResult(lang, result.verdict, result.signals).headline : t('callLock.review.noWarnings');
  const canSend = result.requiresConfirmation !== false && (result.risk !== 'CAUTION' || props.acknowledged);

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
          <ReasonList reasons={reasons} />
        </VerdictCard>
      ) : (
        <div className="stack">
          <p className="status-msg status-msg--ok">
            <CircleCheck size={22} aria-hidden="true" />
            {headline}
          </p>
          {reasons.length > 0 && <ReasonList reasons={reasons} />}
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
