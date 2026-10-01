import { lazy, Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { CheckerPage } from '../features/checker/CheckerPage';
import { useI18n } from '../i18n/I18nProvider';
import { Link, useRouter } from './router';

// The checker is the core and ships in the first bundle; the rest loads on demand.
const CallLockPage = lazy(() => import('../features/callLock/CallLockPage'));
const ProofPage = lazy(() => import('../features/mukuruProof/ProofPage'));
const VerifyPage = lazy(() => import('../features/mukuruProof/VerifyPage'));

function Loading() {
  const { t } = useI18n();
  return (
    <div className="page">
      <div className="card checking" role="status">
        <LoaderCircle size={28} className="spin" aria-hidden="true" />
        {t('app.loading')}
      </div>
    </div>
  );
}

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="page page--narrow">
      <div className="card stack">
        <h1 className="verdict__title">{t('errors.notFound')}</h1>
        <Link to="/" className="btn btn--outline">
          {t('errors.goHome')}
        </Link>
      </div>
    </div>
  );
}

export function App() {
  const { path } = useRouter();
  const verify = /^\/verify\/([^/]+)\/?$/.exec(path);

  let page;
  if (path === '/' || path === '') page = <CheckerPage />;
  else if (path.replace(/\/$/, '') === '/calllock') page = <CallLockPage />;
  else if (path.replace(/\/$/, '') === '/proof') page = <ProofPage />;
  else if (verify?.[1]) page = <VerifyPage proofId={decodeURIComponent(verify[1])} />;
  else page = <NotFound />;

  return (
    <AppShell>
      <Suspense fallback={<Loading />}>{page}</Suspense>
    </AppShell>
  );
}
