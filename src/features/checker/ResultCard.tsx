import { useEffect, useRef, useState } from 'react';
import { Flag, RotateCcw, ShieldAlert, Smartphone } from 'lucide-react';
import type { CheckView } from '../../api/client';
import { presentResult } from '../../i18n/present';
import { useI18n } from '../../i18n/I18nProvider';
import { ReasonList, VerdictCard } from '../../components/Verdict';
import { ReportPanel } from '../reports/ReportPanel';

interface Props {
  result: CheckView;
  input: string;
  onCheckAnother: () => void;
  onShowOfficial: () => void;
}

/**
 * One strong result card — no five-screen journey. Text is derived from
 * reason codes in the current language, so switching EN/PT/SN re-renders
 * the same verdict instantly.
 */
export function ResultCard({ result, input, onCheckAnother, onShowOfficial }: Props) {
  const { t, lang } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  const [reportCount, setReportCount] = useState(result.reportCount);
  const presented = presentResult(lang, result.verdict, result.signals);
  const checked = result.matchedOfficialRecord?.value ?? result.entities.map((e) => e.display).join(' · ');

  useEffect(() => {
    setReportCount(result.reportCount);
    heading.current?.focus({ preventScroll: true });
    heading.current?.closest('article')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  return (
    <section aria-label={t('result.region')} aria-live="polite">
      <VerdictCard verdict={result.verdict} ref={heading}>
        <p className="verdict__headline" data-testid="headline">
          {presented.headline}
        </p>

        {checked && (
          <div className="checked-value">
            <div className="checked-value__label">{t('result.youChecked')}</div>
            <div className="checked-value__value" data-testid="checked-value">
              {checked}
            </div>
          </div>
        )}

        {result.verdict === 'OFFICIAL' && <p className="small">{t('result.officialMeaning')}</p>}

        <div className="reminder">
          <ShieldAlert size={22} aria-hidden="true" />
          <span>{t('result.reminder')}</span>
        </div>

        {presented.reasons.length > 0 && (
          <div>
            <h3 className="subhead">{t('result.why')}</h3>
            <ReasonList reasons={presented.reasons} />
          </div>
        )}

        <div>
          <h3 className="subhead">{t('result.whatToDo')}</h3>
          <ol className="step-list" data-testid="next-steps">
            {presented.nextSteps.slice(0, 3).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        {reportCount > 0 && (
          <div className="report-count" data-testid="report-count">
            <Flag size={22} aria-hidden="true" />
            <span>
              <strong>{t('result.reportedBy', { count: reportCount })}</strong>
              <span className="small muted">{t('result.reportsNote')}</span>
            </span>
          </div>
        )}

        {result.source === 'device' && (
          <p className="small muted status-msg">
            <Smartphone size={18} aria-hidden="true" />
            {t('result.offline')}
          </p>
        )}

        <div className="btn-row">
          {result.verdict !== 'OFFICIAL' && result.reportableKeys.length > 0 && (
            <ReportPanel key={input} input={input} onReported={setReportCount} />
          )}
          <div className="btn-row btn-row--2">
            <button type="button" className="btn btn--outline" onClick={onCheckAnother} data-testid="check-another">
              <RotateCcw size={20} aria-hidden="true" />
              {result.verdict === 'CANT_CONFIRM' ? t('result.tryAgain') : t('result.checkAnother')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onShowOfficial}>
              {t('result.officialOptions')}
            </button>
          </div>
        </div>

        {result.matchedOfficialRecord && (
          <p className="source-line">
            {t('result.source')}:{' '}
            <a href={result.matchedOfficialRecord.source} target="_blank" rel="noopener noreferrer">
              {result.matchedOfficialRecord.source.replace(/^https:\/\//, '')}
            </a>
          </p>
        )}
      </VerdictCard>
    </section>
  );
}
