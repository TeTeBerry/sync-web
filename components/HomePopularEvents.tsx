import type { CSSProperties } from 'react';
import { fetchActivities } from '../lib/api';
import { EventCard } from './EventCard';
import { PopularEventsEmpty } from './states/PopularEventsEmpty';
import { PopularEventsError } from './states/PopularEventsError';
import { getMessages, localizeActivities, type Locale } from '../lib/i18n';
import type { Activity } from '../lib/types';

type HomePopularEventsProps = {
  locale: Locale;
};

function pickPopularEvents(activities: Activity[]): Activity[] {
  return [...activities]
    .sort((left, right) => {
      const hotDelta = Number(Boolean(right.hot)) - Number(Boolean(left.hot));
      if (hotDelta !== 0) return hotDelta;
      const attendeeDelta = (right.attendees ?? 0) - (left.attendees ?? 0);
      if (attendeeDelta !== 0) return attendeeDelta;
      return left.legacyId - right.legacyId;
    })
    .slice(0, 3);
}

export async function HomePopularEvents({ locale }: HomePopularEventsProps) {
  const t = getMessages(locale);
  const { activities: rawActivities, status } = await fetchActivities();

  if (status === 'error') {
    return (
      <PopularEventsError
        locale={locale}
        labels={{
          title: t.events.emptyErrorTitle,
          lead: t.events.emptyErrorLead,
          retry: t.states.popularErrorRetry,
          browse: t.states.popularEmptyBrowse,
          waitlist: t.states.popularEmptyWaitlist,
        }}
      />
    );
  }

  const activities = localizeActivities(rawActivities, locale);
  const popular = pickPopularEvents(activities);

  if (!popular.length) {
    return (
      <PopularEventsEmpty
        locale={locale}
        labels={{
          title: t.states.popularEmptyTitle,
          lead: t.states.popularEmptyLead,
          browseAction: t.states.popularEmptyBrowse,
          waitlistAction: t.states.popularEmptyWaitlist,
        }}
      />
    );
  }

  return (
    <div className="event-showcase state-enter" data-reveal-stagger>
      {popular.map((activity, index) => (
        <EventCard
          activity={activity}
          locale={locale}
          featured={index === 0}
          priorityImage={index < 3}
          key={activity.legacyId}
          style={{ '--card-index': index } as CSSProperties}
        />
      ))}
    </div>
  );
}
