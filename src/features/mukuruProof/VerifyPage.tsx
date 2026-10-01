import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, LoaderCircle, ShieldX, TimerOff } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { lookupProof } from '../../api/client';
import type { ProofLookup } from '../../api/client';
import { Link } from '../../app/router';
import { ClaimsList, NeverShared } from './ProofClaims';
import { formatClock, useCountdown } from './useCountdown';

/** What a payer sees after scanning the QR: four facts, a countdown, nothing else. */
export default function VerifyPage({ proofId }: { proofId: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<ProofLookup | 'loading' | 'error'>('loading');
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await lookupProof(proofId);
      if (data.serverTime) setOffset(Date.parse(data.serverTime) - Date.now());
      setState(data);
    } catch {
      setState('error');
    }
  }, [proofId]);

  useEffect(() => {
    void load();
  }, [load]);

  const valid = typeof state === 'object' && state.status === 'VALID' ? state : null;
  const secondsLeft = useCountdown(valid?.expiresAt ?? null, offset);

  // When the clock runs out, ask the server again — it is the authority on expiry.
  useEffect(() => {
    if (valid && secondsLeft === 0) void load();
  }, [valid, secondsLeft, load]);

  return (
    <div className="page page--narrow">
      <section className="card stack" aria-live="polite" data-testid="verifier" data-status={typeof state === 'string' ? state : state.status}>
        {state === 'loading' && (
          <div className="checking" role="status">
            <LoaderCircle size={28} className="spin" aria-hidden="true" />
            {t('verify.loading')}
          </div>
        )}

        {valid && (
          <>
            <div className="verifier-hero">
              <p className="eyebrow">{t('verify.eyebrow')}</p>
              <span className="verifier-hero__icon" aria-hidden="true">
                <BadgeCheck size={44} />
              </span>
              <h1 className="verdict__title">{t('verify.heading')}</h1>
              <span className="badge badge--sim">{t('proof.simulated')}</span>
            </div>
            <div className="recipient">
              <span className="avatar" aria-hidden="true">
                {valid.holder.displayName
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)}
              </span>
              <span>
                <span className="contact-label">{t('verify.proofFor')}</span>
                <strong>{valid.holder.displayName}</strong>
                <span className="contact-label">{valid.holder.accountHint}</span>
              </span>
            </div>
            <ClaimsList claims={valid.claims} />
            <p className="countdown" data-testid="verify-countdown">
              {t('verify.expiresIn', { time: formatClock(secondsLeft) })}
            </p>
            <p className="reminder">
              <BadgeCheck size={22} aria-hidden="true" />
              <span>{t('verify.minimum')}</span>
            </p>
            <NeverShared />
            <p className="source-line">{t('verify.checkedBy')}</p>
          </>
        )}

        {typeof state === 'object' && (state.status === 'EXPIRED' || state.status === 'REVOKED') && (
          <div className="verifier-hero" data-testid="proof-expired">
            <span className="verifier-hero__icon verifier-hero__icon--bad" aria-hidden="true">
              <TimerOff size={44} />
            </span>
            <h1 className="verdict__title">{t('verify.expired.title')}</h1>
            <p>{t('verify.expired.body')}</p>
          </div>
        )}

        {(state === 'error' || (typeof state === 'object' && (state.status === 'NOT_FOUND' || state.status === 'INVALID'))) && (
          <div className="verifier-hero" data-testid="proof-not-found">
            <span className="verifier-hero__icon verifier-hero__icon--bad" aria-hidden="true">
              <ShieldX size={44} />
            </span>
            <h1 className="verdict__title">{t('verify.notFound.title')}</h1>
            <p>{t('verify.notFound.body')}</p>
          </div>
        )}

        <Link to="/" className="btn btn--outline">
          {t('verify.back')}
        </Link>
      </section>
    </div>
  );
}
