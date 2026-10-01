import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CircleAlert, Link2, MapPin, MessageSquareText, Phone, SearchCheck, ShieldCheck, X } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { checkInput } from '../../api/client';
import type { CheckView } from '../../api/client';
import { MAX_INPUT_CHARS } from '../../domain/normalisation/text';
import { DEMO_SCENARIOS } from '../../data/demoScenarios';
import { ResultCard } from './ResultCard';
import { KnowTheSigns, OfficialContacts } from './OfficialContacts';

const HINTS = [
  { icon: Phone, key: 'home.hints.phone' },
  { icon: Link2, key: 'home.hints.link' },
  { icon: MapPin, key: 'home.hints.location' },
  { icon: MessageSquareText, key: 'home.hints.message' },
] as const;

export function CheckerPage() {
  const { t, lang } = useI18n();
  const [input, setInput] = useState('');
  const [checkedInput, setCheckedInput] = useState('');
  const [result, setResult] = useState<CheckView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const officialRef = useRef<HTMLElement>(null);

  const run = async (value: string) => {
    const text = value.trim();
    if (!text) {
      setError(t('home.empty'));
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setBusy(true);
    setResult(null);
    try {
      const view = await checkInput(text, lang);
      setCheckedInput(text);
      setResult(view);
    } catch {
      setError(t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(input);
  };

  const reset = () => {
    setResult(null);
    setInput('');
    setError(null);
    inputRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showOfficial = () => {
    officialRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    officialRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="page">
      <div className="layout layout--checker">
        <div className="stack">
          <section className="hero" aria-labelledby="page-title">
            <p className="eyebrow">{t('home.eyebrow')}</p>
            <h1 id="page-title">{t('home.title')}</h1>
            <p className="hero__lead">{t('home.subtitle')}</p>

            <form className="checker-form" onSubmit={onSubmit} noValidate>
              <label className="field-label" htmlFor="check-input">
                {t('home.inputLabel')}
              </label>
              <textarea
                id="check-input"
                ref={inputRef}
                className="big-input"
                value={input}
                maxLength={MAX_INPUT_CHARS}
                placeholder={t('home.placeholder')}
                onChange={(e) => setInput(e.target.value)}
                rows={4}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-describedby="check-hints"
                aria-invalid={error ? true : undefined}
                data-testid="check-input"
              />
              <div className="input-meta" id="check-hints">
                <span className="sr-only">{t('home.hintsLabel')}</span>
                <ul className="hints" aria-label={t('home.hintsLabel')}>
                  {HINTS.map(({ icon: Icon, key }) => (
                    <li key={key}>
                      <Icon size={16} aria-hidden="true" />
                      {t(key)}
                    </li>
                  ))}
                </ul>
                {input && (
                  <button type="button" className="btn btn--small btn--ghost" onClick={reset}>
                    <X size={18} aria-hidden="true" />
                    {t('home.clear')}
                  </button>
                )}
              </div>
              {error && (
                <p className="form-error" role="alert">
                  <CircleAlert size={20} aria-hidden="true" />
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn--primary btn--block" disabled={busy} data-testid="check-button">
                <SearchCheck size={24} aria-hidden="true" />
                {busy ? t('home.checking') : t('home.cta')}
              </button>
            </form>
          </section>

          <section aria-labelledby="demo-title">
            <h2 className="subhead" id="demo-title">
              {t('home.demoTitle')}
            </h2>
            <div className="chips">
              {DEMO_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="chip"
                  data-testid={`demo-${s.id}`}
                  onClick={() => {
                    setInput(s.input);
                    void run(s.input);
                  }}
                >
                  {t(s.labelKey)}
                </button>
              ))}
            </div>
          </section>

          {busy && (
            <div className="card checking" role="status" aria-live="polite">
              <ShieldCheck size={32} aria-hidden="true" />
              {t('home.checking')}
            </div>
          )}

          {result && (
            <>
              {result.truncated && <p className="small muted">{t('home.truncated')}</p>}
              <ResultCard result={result} input={checkedInput} onCheckAnother={reset} onShowOfficial={showOfficial} />
            </>
          )}
        </div>

        <aside className="stack" aria-label={t('official.title')}>
          <OfficialContacts ref={officialRef} />
          <KnowTheSigns />
        </aside>
      </div>
    </div>
  );
}
