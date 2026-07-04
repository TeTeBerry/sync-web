import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { RefreshRetryButton } from './RefreshRetryButton';
import { getMessages, localizedPath, type Locale } from '../../lib/i18n';

type EventLoadErrorProps = {
  locale: Locale;
};

export function EventLoadError({ locale }: EventLoadErrorProps) {
  const t = getMessages(locale);

  return (
    <main className="page-state">
      <div className="page-state__panel state-enter">
        <div className="page-state__icon page-state__icon--error" aria-hidden="true">
          <AlertCircle size={24} strokeWidth={1.75} />
        </div>
        <h1 className="page-state__title">{t.eventDetail.loadErrorTitle}</h1>
        <p className="page-state__lead">{t.eventDetail.loadErrorLead}</p>
        <div className="page-state__actions">
          <RefreshRetryButton className="button" label={t.eventDetail.loadErrorRetry}>
            {t.eventDetail.loadErrorRetry}
          </RefreshRetryButton>
          <Link className="button secondary" href={localizedPath(locale, '/events')}>
            {t.eventDetail.loadErrorBrowse}
          </Link>
        </div>
        <Link className="page-state__secondary" href={localizedPath(locale)}>
          {t.states.errorBackHome}
        </Link>
      </div>
    </main>
  );
}
