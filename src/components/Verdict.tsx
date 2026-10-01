import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { BadgeCheck, CircleHelp, ShieldCheck, ShieldX, TriangleAlert, Info } from 'lucide-react';
import type { Verdict } from '../domain/types';
import type { PresentedReason } from '../i18n/present';
import { useI18n } from '../i18n/I18nProvider';

const VERDICT_ICON = { OFFICIAL: ShieldCheck, NOT_OFFICIAL: ShieldX, CANT_CONFIRM: CircleHelp } as const;

/** Big, glanceable verdict card: icon + words + colour (never colour alone). */
export const VerdictCard = forwardRef<HTMLHeadingElement, { verdict: Verdict; children: ReactNode; testId?: string }>(
  function VerdictCard({ verdict, children, testId }, headingRef) {
    const { t } = useI18n();
    const Icon = VERDICT_ICON[verdict];
    return (
      <article className={`verdict verdict--${verdict}`} data-testid={testId ?? 'verdict'} data-verdict={verdict}>
        <div className="verdict__band">
          <span className="verdict__icon" aria-hidden="true">
            <Icon size={34} strokeWidth={2.4} />
          </span>
          <h2 className="verdict__title" ref={headingRef} tabIndex={-1}>
            {t(`verdict.${verdict}.title`)}
          </h2>
        </div>
        <div className="verdict__body">{children}</div>
      </article>
    );
  },
);

export function ReasonList({ reasons, showCodes = false }: { reasons: PresentedReason[]; showCodes?: boolean }) {
  return (
    <ul className="reason-list" data-testid="reasons">
      {reasons.map((r) => {
        const tone = r.severity === 'positive' ? 'good' : r.severity === 'info' ? 'info' : 'bad';
        const Icon = tone === 'good' ? BadgeCheck : tone === 'info' ? Info : TriangleAlert;
        return (
          <li key={r.code} className={`reason--${tone}`} data-code={r.code}>
            <Icon size={22} aria-hidden="true" />
            <span className="break-anywhere">
              {r.text}
              {showCodes && <span className="reason__code">{r.code}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
