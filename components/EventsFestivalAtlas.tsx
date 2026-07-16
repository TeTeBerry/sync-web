'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { EventCard } from './EventCard';
import { getActivityStartYmd } from '../lib/activity-date';
import { getFestivalAtmosphere } from '../lib/festival-atmosphere';
import type { Locale } from '../lib/i18n';
import type { Activity } from '../lib/types';

type AtlasMood = 'all' | 'ready' | 'lineup' | 'soon';

type MoodLens = {
  id: Exclude<AtlasMood, 'all'>;
  title: string;
  eyebrow: string;
  lead: string;
  chapterTitle: string;
  chapterLead: string;
  seasonTitle: string;
};

type EventsFestivalAtlasProps = {
  locale: Locale;
  activities: Activity[];
  labels: {
    eyebrow: string;
    title: string;
    lead: string;
    all: string;
    allLead: string;
    openingEyebrow: string;
    openingTitle: string;
    openingLead: string;
    seasonEyebrow: string;
    seasonTitle: string;
    reasons: {
      travel: string;
      lineup: string;
      lineupCount: string;
      soon: string;
      default: string;
    };
    handoff: {
      eyebrow: string;
      title: string;
      lead: string;
      cta: string;
      href: string;
    };
  };
  moods: MoodLens[];
};

function artistCount(activity: Activity): number {
  return activity.artists?.length ?? activity.lineup?.length ?? 0;
}

function dateValue(activity: Activity): string {
  return getActivityStartYmd(activity) ?? activity.date ?? '9999-12-31';
}

function monthKey(activity: Activity): string {
  const ymd = getActivityStartYmd(activity);
  return ymd ? ymd.slice(0, 7) : '9999-12';
}

function monthLabel(month: string, locale: Locale): string {
  if (month === '9999-12') return locale === 'zh' ? '随后抵达' : 'Still to come';

  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00Z`));
}

function orderActivities(activities: Activity[], mood: AtlasMood): Activity[] {
  return [...activities].sort((left, right) => {
    if (mood === 'ready') {
      const leftReady = Number(Boolean(left.travelGuideSupported)) + Number(Boolean(left.lineupPublished));
      const rightReady = Number(Boolean(right.travelGuideSupported)) + Number(Boolean(right.lineupPublished));
      if (rightReady !== leftReady) return rightReady - leftReady;
    }

    if (mood === 'lineup') {
      const lineupDelta = artistCount(right) - artistCount(left);
      if (lineupDelta !== 0) return lineupDelta;
    }

    if (mood === 'all') {
      const hotDelta = Number(Boolean(right.hot)) - Number(Boolean(left.hot));
      if (hotDelta !== 0) return hotDelta;
    }

    const dateDelta = dateValue(left).localeCompare(dateValue(right));
    if (dateDelta !== 0) return dateDelta;
    return left.legacyId - right.legacyId;
  });
}

function activityReason(
  activity: Activity,
  mood: AtlasMood,
  locale: Locale,
  labels: EventsFestivalAtlasProps['labels']['reasons'],
): string {
  const artists = artistCount(activity);

  if (mood === 'ready' && activity.travelGuideSupported) return labels.travel;
  if (mood === 'lineup' && artists > 0) return labels.lineupCount.replace('{count}', String(artists));
  if (mood === 'soon' && getActivityStartYmd(activity)) return labels.soon;
  if (activity.lineupPublished && artists > 0) return labels.lineupCount.replace('{count}', String(artists));
  if (activity.travelGuideSupported) return labels.travel;
  if (locale === 'zh' && activity.hot) return '这一季正在聚拢目光。';
  if (activity.hot) return labels.default;
  return labels.lineup;
}

export function EventsFestivalAtlas({ locale, activities, labels, moods }: EventsFestivalAtlasProps) {
  const [activeMood, setActiveMood] = useState<AtlasMood>('all');
  const activeLens = activeMood === 'all' ? undefined : moods.find((mood) => mood.id === activeMood);
  const orderedActivities = useMemo(
    () => orderActivities(activities, activeMood),
    [activities, activeMood],
  );
  const openingActivities = orderedActivities.slice(0, 3);
  const openingTitle = activeLens?.chapterTitle ?? labels.openingTitle;
  const openingLead = activeLens?.chapterLead ?? labels.openingLead;
  const seasonTitle = activeLens?.seasonTitle ?? labels.seasonTitle;
  const seasonChapters = useMemo(() => {
    const chapters = new Map<string, Activity[]>();

    orderedActivities.slice(openingActivities.length).forEach((activity) => {
      const key = monthKey(activity);
      const chapter = chapters.get(key) ?? [];
      chapter.push(activity);
      chapters.set(key, chapter);
    });

    return [...chapters.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [openingActivities.length, orderedActivities]);

  return (
    <section className="events-atlas" aria-labelledby="events-atlas-heading">
      <div className="events-atlas__intro">
        <div>
          <p>{labels.eyebrow}</p>
          <h2 id="events-atlas-heading">{labels.title}</h2>
        </div>
        <p>{labels.lead}</p>
      </div>

      <div className="events-atlas__lenses" aria-label={labels.eyebrow}>
        <button
          type="button"
          className={`events-atlas__lens${activeMood === 'all' ? ' is-active' : ''}`}
          aria-pressed={activeMood === 'all'}
          onClick={() => setActiveMood('all')}
        >
          {labels.all}
        </button>
        {moods.map((mood) => (
          <button
            type="button"
            className={`events-atlas__lens${activeMood === mood.id ? ' is-active' : ''}`}
            aria-pressed={activeMood === mood.id}
            onClick={() => setActiveMood(mood.id)}
            key={mood.id}
          >
            {mood.title}
          </button>
        ))}
      </div>

      <div className="events-atlas__lens-note" aria-live="polite">
        <span>{activeLens?.eyebrow ?? labels.all}</span>
        <p>{activeLens?.lead ?? labels.allLead}</p>
      </div>

      {openingActivities.length > 0 ? (
        <section className="events-atlas__opening" aria-labelledby="events-atlas-opening-heading">
          <div className="events-atlas__chapter-copy">
            <p>{labels.openingEyebrow}</p>
              <h3 id="events-atlas-opening-heading">{openingTitle}</h3>
            <span>{openingLead}</span>
          </div>
          <div className="events-atlas__opening-posters">
            {openingActivities.map((activity) => (
              <EventCard
                activity={activity}
                locale={locale}
                variant="poster"
                priorityImage={false}
                reason={activityReason(activity, activeMood, locale, labels.reasons)}
                key={activity.legacyId}
              />
            ))}
          </div>
        </section>
      ) : null}

      {seasonChapters.length > 0 ? (
        <section className="events-atlas__season" aria-labelledby="events-atlas-season-heading">
          <div className="events-atlas__chapter-copy events-atlas__chapter-copy--season">
            <p>{labels.seasonEyebrow}</p>
            <h3 id="events-atlas-season-heading">{seasonTitle}</h3>
          </div>

          <div className="events-atlas__chapters">
            {seasonChapters.map(([month, chapter]) => (
              <section
                className="events-atlas__chapter"
                aria-labelledby={`events-atlas-${month}`}
                data-atmosphere={getFestivalAtmosphere(chapter[0])}
                key={month}
              >
                <div className="events-atlas__month-mark">
                  <span aria-hidden />
                  <h4 id={`events-atlas-${month}`}>{monthLabel(month, locale)}</h4>
                </div>
                <div className="events-atlas__chapter-posters">
                  {chapter.map((activity) => (
                    <EventCard
                      activity={activity}
                      locale={locale}
                      variant="poster"
                      priorityImage={false}
                      reason={activityReason(activity, activeMood, locale, labels.reasons)}
                      key={activity.legacyId}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : null}

      <div className="events-atlas__handoff">
        <p>{labels.handoff.eyebrow}</p>
        <h3>{labels.handoff.title}</h3>
        <span>{labels.handoff.lead}</span>
        <Link className="events-atlas__handoff-link" href={labels.handoff.href}>
          {labels.handoff.cta}
          <ArrowRight size={16} strokeWidth={1.8} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
