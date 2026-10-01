import { useState } from 'react';
import { CircleCheck, Flag, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiError, reportInput } from '../../api/client';
import { reporterId } from '../../app/storage';

type Phase = 'idle' | 'confirm' | 'sending' | 'done' | 'already' | 'refused' | 'error';

/**
 * The working "Report this" flow. It asks first, explains exactly what is
 * stored (only the number/link/place), and shows the persisted count.
 */
export function ReportPanel({ input, onReported }: { input: string; onReported: (count: number) => void }) {
  const { t, lang } = useI18n();
  const [phase, setPhase] = useState<Phase>('idle');

  const submit = async () => {
    setPhase('sending');
    try {
      const res = await reportInput(input, reporterId(), lang);
      onReported(res.reportCount);
      setPhase(res.alreadyReported ? 'already' : 'done');
    } catch (err) {
      setPhase(err instanceof ApiError && err.code === 'OFFICIAL_ENTITY' ? 'refused' : 'error');
    }
  };

  if (phase === 'idle') {
    return (
      <button type="button" className="btn btn--danger btn--block" onClick={() => setPhase('confirm')} data-testid="report-button">
        <Flag size={20} aria-hidden="true" />
        {t('result.report')}
      </button>
    );
  }

  if (phase === 'confirm' || phase === 'sending') {
    return (
      <div className="confirm-box" role="group" aria-labelledby="report-title">
        <p className="subhead" id="report-title">
          {t('report.title')}
        </p>
        <p className="small">{t('report.body')}</p>
        <div className="btn-row btn-row--2">
          <button type="button" className="btn btn--danger" onClick={submit} disabled={phase === 'sending'} data-testid="report-confirm">
            {phase === 'sending' ? <LoaderCircle size={20} className="spin" aria-hidden="true" /> : <Flag size={20} aria-hidden="true" />}
            {phase === 'sending' ? t('report.sending') : t('report.confirm')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setPhase('idle')} disabled={phase === 'sending'}>
            {t('report.cancel')}
          </button>
        </div>
      </div>
    );
  }

  const ok = phase === 'done' || phase === 'already';
  const message = { done: 'report.thanks', already: 'report.already', refused: 'report.officialRefused', error: 'report.failed' }[phase];
  return (
    <div className={`status-msg ${ok ? 'status-msg--ok' : 'status-msg--error'}`} role="status" data-testid="report-status">
      {ok ? <CircleCheck size={22} aria-hidden="true" /> : <TriangleAlert size={22} aria-hidden="true" />}
      <span>{t(message)}</span>
      {phase === 'error' && (
        <button type="button" className="btn btn--small btn--ghost" onClick={submit}>
          {t('result.tryAgain')}
        </button>
      )}
    </div>
  );
}
