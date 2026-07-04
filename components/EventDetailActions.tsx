'use client';

import { BookmarkButton } from './BookmarkButton';
import { TrackedLink } from './TrackedLink';
import { getMessages, localizedPath, type Locale } from '../lib/i18n';

type EventDetailActionsProps = {
  legacyId: number;
  eventTitle: string;
  locale: Locale;
  externalUrl?: string;
  subscribeEventProperties: Record<string, string>;
};

export function EventDetailActions({
  legacyId,
  eventTitle,
  locale,
  externalUrl,
  subscribeEventProperties,
}: EventDetailActionsProps) {
  const t = getMessages(locale);

  return (
    <div className="detail-hero__actions">
      <TrackedLink
        className="button"
        href={`${localizedPath(locale, '/waitlist')}?event=${encodeURIComponent(eventTitle)}`}
        eventName="event_subscribe_click"
        eventProperties={subscribeEventProperties}
      >
        {t.eventDetail.planCta}
      </TrackedLink>
      <BookmarkButton
        legacyId={legacyId}
        eventTitle={eventTitle}
        locale={locale}
        variant="hero"
        labels={t.states.bookmark}
        eventsPath={localizedPath(locale, '/events')}
        waitlistPath={`${localizedPath(locale, '/waitlist')}?event=${encodeURIComponent(eventTitle)}`}
      />
      {externalUrl ? (
        <a className="button secondary" href={externalUrl} target="_blank" rel="noopener noreferrer">
          {t.eventDetail.externalUrl}
        </a>
      ) : null}
    </div>
  );
}
