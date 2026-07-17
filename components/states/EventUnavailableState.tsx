import Link from 'next/link';
import { ArrowRight, MapPinOff } from 'lucide-react';
import { getMessages, localizedPath, type Locale } from '../../lib/i18n';

type EventUnavailableStateProps = {
  locale: Locale;
};

export function EventUnavailableState({ locale }: EventUnavailableStateProps) {
  const t = getMessages(locale);

  return (
    <main className="page-state">
      <div className="page-state__panel state-enter">
        <div className="page-state__icon" aria-hidden="true">
          <MapPinOff size={24} strokeWidth={1.75} />
        </div>
        <h1 className="page-state__title">{t.eventDetail.unavailableTitle}</h1>
        <p className="page-state__lead">{t.eventDetail.unavailableLead}</p>
        <div className="page-state__actions">
          <Link className="button button--glow" href={localizedPath(locale, '/events')}>
            {t.eventDetail.unavailableBrowse}
            <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
          </Link>
        </div>
        <Link className="page-state__secondary" href={localizedPath(locale)}>
          {t.states.errorBackHome}
        </Link>
      </div>
    </main>
  );
}
