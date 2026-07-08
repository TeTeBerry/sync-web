import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '../../../../../components/Breadcrumbs';
import { DetailLineupContent } from '../../../../../components/lineup/DetailLineupContent';
import { EventLoadError } from '../../../../../components/states/EventLoadError';
import { EventUnavailableState } from '../../../../../components/states/EventUnavailableState';
import { LineupEmptyState } from '../../../../../components/states/LineupEmptyState';
import { LineupErrorState } from '../../../../../components/states/LineupErrorState';
import { TrackedLink } from '../../../../../components/TrackedLink';
import { getActivity, getActivityTitle } from '../../../../../lib/api';
import { loadEventPageData } from '../../../../../lib/event-page';
import {
  eventLineupPath,
  eventPath,
  eventPlanPath,
  parseEventLegacyId,
} from '../../../../../lib/event-slug';
import {
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  localizeActivity,
  localizedPath,
  type Locale,
} from '../../../../../lib/i18n';

type LineupPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: LineupPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const legacyId = parseEventLegacyId(slug);
  if (!legacyId) return {};

  const activityResult = await getActivity(legacyId);
  if (!activityResult.activity) return {};

  const activity = localizeActivity(activityResult.activity, locale);
  const t = getMessages(locale);
  const title = getActivityTitle(activity);

  return {
    title: `${title} — ${t.eventDetail.lineupPage.title} | Raven`,
    description: t.eventDetail.lineupLead,
  };
}

export default async function EventLineupPage({ params }: LineupPageProps) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const pageData = await loadEventPageData(locale, slug);

  if (pageData === 'error') return <EventLoadError locale={locale} />;
  if (pageData === 'not_found') return <EventUnavailableState locale={locale} />;

  const {
    activity,
    eventTitle,
    djs,
    lineupFetchFailed,
    showTimetable,
    timetableDays,
    timetableStats,
    genreGroupData,
    aiSummary,
  } = pageData;

  const planHref = eventPlanPath(locale, activity);
  const eventHref = eventPath(locale, activity);
  const subscribeEventProperties = {
    event: String(activity.legacyId),
    sourcePath: eventLineupPath(locale, activity),
    locale,
  };

  const lineupContent = lineupFetchFailed ? (
    <LineupErrorState
      locale={locale}
      labels={{
        title: t.eventDetail.lineupErrorTitle,
        lead: t.eventDetail.lineupErrorLead,
        retry: t.eventDetail.lineupErrorRetry,
        browse: t.eventDetail.lineupEmptyBrowse,
      }}
    />
  ) : (showTimetable && timetableDays.length > 0) || djs.length > 0 ? (
    <DetailLineupContent
      activityLegacyId={activity.legacyId}
      showTimetable={showTimetable && timetableDays.length > 0}
      timetableDays={timetableDays}
      genreGroups={genreGroupData}
      timetableLabels={{
        time: t.eventDetail.lineupTimetableTime,
        artist: t.eventDetail.lineupTimetableArtist,
        genre: t.eventDetail.lineupTimetableGenre,
      }}
      selectionLabels={{
        hint: t.eventDetail.lineupPickHint,
        count: t.eventDetail.lineupPickCount,
        clear: t.eventDetail.lineupPickClear,
      }}
    />
  ) : (
    <LineupEmptyState
      locale={locale}
      eventTitle={eventTitle}
      subscribeEventProperties={subscribeEventProperties}
      labels={{
        title: t.eventDetail.lineupEmptyTitle,
        lead: t.eventDetail.lineupEmptyLead,
        action: t.eventDetail.lineupEmptyAction,
        browseAction: t.eventDetail.lineupEmptyBrowse,
      }}
    />
  );

  return (
    <main className="detail-page detail-page--sub">
      <section className="detail-sub-hero" data-reveal>
        <div className="container">
          <Breadcrumbs
            ariaLabel={t.breadcrumbs.ariaLabel}
            items={[
              { label: t.breadcrumbs.home, href: localizedPath(locale) },
              { label: t.breadcrumbs.events, href: localizedPath(locale, '/events') },
              { label: eventTitle, href: eventHref },
              { label: t.eventDetail.lineupPage.title },
            ]}
          />
          <header className="detail-sub-hero__header">
            <div>
              <h1 className="detail-sub-hero__title">{t.eventDetail.lineupPage.title}</h1>
              <p className="detail-sub-hero__lead">
                {showTimetable ? t.eventDetail.lineupTimetableLead : t.eventDetail.lineupLead}
              </p>
            </div>
            <TrackedLink
              className="button button--compact"
              href={planHref}
              eventName="event_plan_click"
              eventProperties={{ ...subscribeEventProperties, source: 'lineup-page' }}
            >
              {t.eventDetail.planCta}
            </TrackedLink>
          </header>
        </div>
      </section>

      <section className="section section--detail-body" data-reveal style={{ '--reveal-delay': '0.08s' } as CSSProperties}>
        <div className="container">
          <article className="detail-lineup detail-lineup--full">
            <header className="detail-lineup__header">
              {showTimetable && timetableStats ? (
                <div className="detail-lineup__stats" aria-label={t.ui.lineupStats}>
                  <span>
                    <strong>{timetableStats.setCount}</strong> {t.eventDetail.lineupTimetableSets}
                  </span>
                  <span className="detail-lineup__stats-divider" aria-hidden="true" />
                  <span>
                    <strong>{timetableStats.stageCount}</strong> {t.eventDetail.lineupTimetableStages}
                  </span>
                </div>
              ) : djs.length > 0 ? (
                <div className="detail-lineup__stats" aria-label={t.ui.lineupStats}>
                  <span>
                    <strong>{aiSummary.artistCount}</strong> {t.eventDetail.lineupStatsArtists}
                  </span>
                  <span className="detail-lineup__stats-divider" aria-hidden="true" />
                  <span>
                    <strong>{aiSummary.genreCount}</strong> {t.eventDetail.lineupStatsGenres}
                  </span>
                </div>
              ) : null}
            </header>
            {lineupContent}
          </article>
        </div>
      </section>
    </main>
  );
}
