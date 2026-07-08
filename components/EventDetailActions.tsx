'use client';

import { BookmarkButton } from './BookmarkButton';
import { TrackedLink } from './TrackedLink';
import { getMessages, localizedPath, type Locale } from '../lib/i18n';

type EventDetailActionsProps = {
  legacyId: number;
  eventTitle: string;
  locale: Locale;
  planHref: string;
  externalUrl?: string;
  subscribeEventProperties: Record<string, string>;
};

export function EventDetailActions({
  legacyId,
  eventTitle,
  locale,
  planHref,
  externalUrl,
  subscribeEventProperties,
}: EventDetailActionsProps) {
  const t = getMessages(locale);

  return (
    <div className="detail-hero__actions">
      <TrackedLink
        className="button"
        href={planHref}
        eventName="event_plan_click"
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
