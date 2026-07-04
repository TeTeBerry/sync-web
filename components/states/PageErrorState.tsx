'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { getMessages, localizedPath, type Locale } from '../../lib/i18n';

type PageErrorStateProps = {
  locale: Locale;
  reset: () => void;
};

export function PageErrorState({ locale, reset }: PageErrorStateProps) {
  const t = getMessages(locale);

  return (
    <main className="page-state">
      <div className="page-state__panel state-enter">
        <div className="page-state__icon page-state__icon--error" aria-hidden="true">
          <AlertCircle size={24} strokeWidth={1.75} />
        </div>
        <h1 className="page-state__title">{t.states.errorTitle}</h1>
        <p className="page-state__lead">{t.states.errorLead}</p>
        <div className="page-state__actions">
          <button className="button" type="button" onClick={reset}>
            {t.states.errorRetry}
          </button>
          <Link className="button secondary" href={localizedPath(locale, '/events')}>
            {t.states.errorExploreEvents}
          </Link>
        </div>
        <Link className="page-state__secondary" href={localizedPath(locale)}>
          {t.states.errorBackHome}
        </Link>
      </div>
    </main>
  );
}
