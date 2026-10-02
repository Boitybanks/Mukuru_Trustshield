import { BadgeCheck, EyeOff, ShieldCheck } from 'lucide-react';
import type { ProofClaims, ProofIntegrity } from '../../domain/proof/proof';
import { useI18n } from '../../i18n/I18nProvider';

/** The four minimum claims — the only facts MukuruProof ever discloses. */
export function ClaimsList({ claims }: { claims: ProofClaims }) {
  const { t } = useI18n();
  const rows = [
    { key: 'identity', label: t('proof.rows.identity'), value: claims.identity === 'VERIFIED' ? t('proof.values.verified') : t('proof.values.notVerified') },
    {
      key: 'ownership',
      label: t('proof.rows.ownership'),
      value: claims.accountOwnership === 'VERIFIED' ? t('proof.values.verified') : t('proof.values.notVerified'),
    },
    { key: 'status', label: t('proof.rows.status'), value: claims.accountStatus === 'ACTIVE' ? t('proof.values.active') : t('proof.values.inactive') },
    { key: 'credits', label: t('proof.rows.credits'), value: claims.canReceiveCredits ? t('proof.values.yes') : t('proof.values.no') },
  ];
  return (
    <dl className="claims" data-testid="claims">
      {rows.map((r) => (
        <div key={r.key} data-claim={r.key}>
          <dt>{r.label}</dt>
          <dd>
            <BadgeCheck size={20} aria-hidden="true" />
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function NeverShared() {
  const { t } = useI18n();
  const items = ['balance', 'transactions', 'statement', 'idDocument'] as const;
  return (
    <div>
      <h3 className="subhead">{t('proof.neverTitle')}</h3>
      <ul className="never-list" data-testid="never-shared">
        {items.map((k) => (
          <li key={k}>
            <EyeOff size={18} aria-hidden="true" />
            {t(`proof.never.${k}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shows that the proof carries a valid ML-DSA-65 (NIST FIPS 204) signature. */
export function ProofIntegritySummary({ integrity }: { integrity?: ProofIntegrity }) {
  const { t } = useI18n();
  if (!integrity?.verified) return null;
  return (
    <p className="reminder" data-testid="proof-integrity">
      <ShieldCheck size={22} aria-hidden="true" />
      <span>
        <strong>{t('proof.integrity.title')}</strong>
        <br />
        {t('proof.integrity.verified', { algorithm: integrity.algorithm, standard: integrity.standard })}
      </span>
    </p>
  );
}
