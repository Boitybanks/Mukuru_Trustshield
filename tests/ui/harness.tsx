import { render } from '@testing-library/react';
import { vi } from 'vitest';
import type { ReactElement } from 'react';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import { RouterProvider } from '../../src/app/router';
import type { Language } from '../../src/domain/types';
import { createCheckHandler, createProofHandler, createReportHandler, createTransactionHandler } from '../../server/handlers';
import { testDeps } from '../api/helpers';

/**
 * Routes the browser's fetch() straight into the real server handlers with
 * in-memory persistence, so UI tests exercise UI → API → rules engine.
 */
export function installApi() {
  // Real time: the browser countdown and the server clock must agree.
  const env = testDeps({}, new Date());
  const handlers = {
    check: createCheckHandler(env.deps),
    report: createReportHandler(env.deps),
    proof: createProofHandler(env.deps),
    tx: createTransactionHandler(env.deps),
  };
  const calls: string[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push(url);
    const req = new Request(`https://trustshield.test${url}`, init);
    if (url === '/api/check') return handlers.check(req);
    if (url === '/api/report') return handlers.report(req);
    if (url.startsWith('/api/proof/')) {
      const id = url.split('/').pop()!;
      return handlers.proof(req, { params: { id: decodeURIComponent(id) } });
    }
    if (url === '/api/transaction/check') return handlers.tx(req);
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { ...env, fetchMock, calls };
}

export function stubBrowser() {
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  try {
    window.localStorage.clear();
  } catch {
    /* storage may be unavailable */
  }
}

export function renderWithProviders(ui: ReactElement, { lang = 'en', path = '/' }: { lang?: Language; path?: string } = {}) {
  window.history.replaceState(null, '', path);
  return render(
    <I18nProvider initial={lang}>
      <RouterProvider initialPath={path}>{ui}</RouterProvider>
    </I18nProvider>,
  );
}
