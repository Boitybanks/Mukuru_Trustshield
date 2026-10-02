import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ExternalLink, LoaderCircle, QrCode, Timer, TriangleAlert } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { createProof } from '../../api/client';
import type { ProofCreated } from '../../api/client';
import { DEMO_CUSTOMER } from '../../domain/proof/accountVerification';
import { Link } from '../../app/router';
import { ClaimsList, NeverShared, ProofIntegritySummary } from './ProofClaims';
import { formatClock, useCountdown } from './useCountdown';

const DEMO_CLAIMS = {
  identity: 'VERIFIED',
  accountOwnership: 'VERIFIED',
  accountStatus: 'ACTIVE',
  canReceiveCredits: true,
} as const;

export default function ProofPage() {
  const { t } = useI18n();
  const [proof, setProof] = useState<ProofCreated | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const secondsLeft = useCountdown(proof?.expiresAt ?? null);
  const verifyUrl = proof ? `${window.location.origin}${proof.verifyPath}` : '';

  const generate = async (ttlSeconds?: number) => {
    setBusy(true);
    setError(false);
    setCopied(false);
    try {
      setProof(await createProof(ttlSeconds));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="page">
      <div className="stack">
        <section className="hero" aria-labelledby="proof-title">
          <h1 id="proof-title">{t('proof.title')}</h1>
          <p className="hero__lead">
{t('proof.question')}
          </p>
        </section>

        <div className="proof-grid">
          <section className="card stack" aria-labelledby="holder-title">
            <div className="input-meta">
              <h2 className="section-title" id="holder-title">
                {t('proof.holder')}
              </h2>
            </div>
            <div className="recipient">
              <span className="avatar" aria-hidden="true">
                BN
              </span>
              <span>
                <strong>{DEMO_CUSTOMER.displayName}</strong>
                <span className="contact-label">{DEMO_CUSTOMER.accountHint}</span>
              </span>
            </div>
            <ClaimsList claims={proof?.claims ?? DEMO_CLAIMS} />
            <ProofIntegritySummary integrity={proof?.integrity} />
            <dl className="claims">
              <div>
                <dt>{t('proof.rows.verifiedAt')}</dt>
                <dd className="claims__neutral">{proof ? new Date(proof.verifiedAt).toLocaleString() : '—'}</dd>
              </div>
              <div>
                <dt>{t('proof.rows.expires')}</dt>
                <dd className="claims__neutral">{proof ? formatClock(secondsLeft) : t('proof.values.tenMinutes')}</dd>
              </div>
            </dl>
            <NeverShared />
          </section>

          <section className="card stack" aria-labelledby="share-title" aria-live="polite">
            <h2 className="section-title" id="share-title">
              <QrCode size={22} aria-hidden="true" />
              {proof ? t('proof.ready') : t('proof.generate')}
            </h2>

            {!proof && (
              <button type="button" className="btn btn--primary btn--block" onClick={() => generate()} disabled={busy} data-testid="generate-proof">
                {busy ? <LoaderCircle size={22} className="spin" aria-hidden="true" /> : <QrCode size={22} aria-hidden="true" />}
                {busy ? t('proof.generating') : t('proof.generate')}
              </button>
            )}

            {error && (
              <p className="form-error" role="alert">
                <TriangleAlert size={20} aria-hidden="true" />
                {t('proof.failed')}
              </p>
            )}

            {proof && (
              <>
                <div className="qr-box">
                  <QRCodeSVG value={verifyUrl} size={220} level="M" marginSize={2} title={t('proof.qrLabel')} data-testid="proof-qr" />
                  <p className="small">{t('proof.scan')}</p>
                  <p className="link-box" data-testid="verify-url">
                    {verifyUrl}
                  </p>
                  {secondsLeft > 0 ? (
                    <p className="countdown" data-testid="proof-countdown">
                      <Timer size={22} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-4px' }} />{' '}
                      {t('proof.expiresIn', { time: formatClock(secondsLeft) })}
                    </p>
                  ) : (
                    <p className="form-error">{t('proof.expiredHere')}</p>
                  )}
                </div>
                <div className="btn-row btn-row--2">
                  <button type="button" className="btn btn--outline" onClick={copy}>
                    <Copy size={20} aria-hidden="true" />
                    {copied ? t('proof.copied') : t('proof.copy')}
                  </button>
                  <Link to={proof.verifyPath} className="btn btn--dark" data-testid="open-verifier">
                    <ExternalLink size={20} aria-hidden="true" />
                    {t('proof.open')}
                  </Link>
                </div>
                <button type="button" className="btn btn--ghost" onClick={() => generate()} disabled={busy}>
                  {t('proof.another')}
                </button>
              </>
            )}

          </section>
        </div>
      </div>
    </div>
  );
}
