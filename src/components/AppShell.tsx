import type { ReactNode } from 'react';
import { BadgeCheck, PhoneOff, SearchCheck, ShieldCheck } from 'lucide-react';
import { LANGUAGES } from '../domain/types';
import { useI18n } from '../i18n/I18nProvider';
import { Link, useRouter } from '../app/router';
import { BackgroundMotif } from './BackgroundMotif';

const SHORT = { en: 'EN', pt: 'PT', sn: 'SN' } as const;

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t('language.label')}>
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code === 'pt' ? 'pt-MZ' : code}
          aria-pressed={lang === code}
          aria-label={t(`language.${code}`)}
          onClick={() => setLang(code)}
        >
          <span className="lang-switch__short" aria-hidden="true">
            {SHORT[code]}
          </span>
          <span className="lang-switch__full" aria-hidden="true">
            {t(`language.${code}`)}
          </span>
        </button>
      ))}
    </div>
  );
}

const TABS = [
  { to: '/', key: 'nav.check', icon: SearchCheck },
  { to: '/calllock', key: 'nav.callLock', icon: PhoneOff },
  { to: '/proof', key: 'nav.proof', icon: BadgeCheck },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { path } = useRouter();
  const active = path.startsWith('/calllock') ? '/calllock' : path.startsWith('/proof') ? '/proof' : path.startsWith('/verify') ? '' : '/';

  return (
    <>
      <BackgroundMotif />
      <a className="skip-link" href="#main">
        {t('app.skip')}
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand" aria-label={t('app.name')}>
            <img className="brand__logo" src="/mukuru-logo.webp" alt={t('app.logoAlt')} width={107} height={34} />
            <span className="brand__divider" aria-hidden="true" />
            <span className="brand__product">
              <ShieldCheck size={20} aria-hidden="true" />
              <span>TrustShield</span>
            </span>
          </Link>
          <LanguageSwitcher />
        </div>
        <nav aria-label={t('nav.label')}>
          <div className="tabs">
            {TABS.map(({ to, key, icon: Icon }) => (
              <Link key={to} to={to} aria-current={active === to ? 'page' : undefined}>
                <Icon size={20} aria-hidden="true" />
                <span>{t(key)}</span>
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <strong>{t('app.footer')}</strong>
          <span>{t('app.footerData')}</span>
          <span>
            {t('app.name')} · {t('app.tagline')} · {t('app.version', { version: __APP_VERSION__ })}
          </span>
        </div>
      </footer>
    </>
  );
}
