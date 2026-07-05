import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { notFound, permanentRedirect } from 'next/navigation';
import { Breadcrumbs } from '../../../../components/Breadcrumbs';
import { EventAiSummary } from '../../../../components/EventAiSummary';
import { EventCard } from '../../../../components/EventCard';
import { EventLoadError } from '../../../../components/states/EventLoadError';
import { EventUnavailableState } from '../../../../components/states/EventUnavailableState';
import { LineupEmptyState } from '../../../../components/states/LineupEmptyState';
import { LineupErrorState } from '../../../../components/states/LineupErrorState';
import { EmptyState } from '../../../../components/states/EmptyState';
import { RelatedEventsError } from '../../../../components/states/RelatedEventsError';
import { EventDetailActions } from '../../../../components/EventDetailActions';
import { DetailLineupContent } from '../../../../components/lineup/DetailLineupContent';
import { TrackedLink } from '../../../../components/TrackedLink';
import { EventImage } from '../../../../components/EventImage';
import {
  fetchActivities,
  fetchActivitySchedule,
  getActivity,
  getActivityImage,
  getActivityTitle,
} from '../../../../lib/api';
import { buildEventAiSummary } from '../../../../lib/event-ai-summary';
import {
  buildLineupTimetable,
  countTimetableStats,
  hasLineupTimetable,
} from '../../../../lib/lineup-timetable';
import { groupByBroadGenre, otherGenreLabel } from '../../../../lib/lineup-genre';
import { buildEventJsonLd, buildEventMetadata } from '../../../../lib/seo';
import { cityPath } from '../../../../lib/seo-cities';
import {
  eventPath,
  eventSlugMatches,
  parseEventLegacyId,
} from '../../../../lib/event-slug';
import { getActivityContinent } from '../../../../lib/activity-continent';
import { getSiteUrl } from '../../../../lib/site';
import {
  activityMetaForLocale,
  DEFAULT_LOCALE,
  getActivityTypeLabel,
  getContinentLabel,
  getMessages,
  isLocale,
  localizeActivities,
  localizeActivity,
  localizedPath,
  type Locale,
} from '../../../../lib/i18n';

type EventDetailProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: EventDetailProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const legacyId = parseEventLegacyId(slug);
  if (!legacyId) return {};

  const activityResult = await getActivity(legacyId);
  if (!activityResult.activity) return {};

  return buildEventMetadata(activityResult.activity, locale);
}

export default async function EventDetailPage({ params }: EventDetailProps) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const legacyId = parseEventLegacyId(slug);
  if (!legacyId) notFound();

  const activityResult = await getActivity(legacyId);

  if (activityResult.status === 'error') {
    return <EventLoadError locale={locale} />;
  }

  if (activityResult.status === 'not_found' || !activityResult.activity) {
    return <EventUnavailableState locale={locale} />;
  }

  const rawActivity = activityResult.activity;
  const activity = localizeActivity(rawActivity, locale);
  const continent = getActivityContinent(activity);
  const continentLabel = getContinentLabel(locale, continent);

  if (!eventSlugMatches(slug, rawActivity, locale)) {
    permanentRedirect(eventPath(locale, activity));
  }

  const siteUrl = getSiteUrl();
  const [activitiesResult, scheduleResult] = await Promise.all([
    fetchActivities(),
    fetchActivitySchedule(activity.legacyId),
  ]);
  const allActivities = localizeActivities(activitiesResult.activities, locale);
  const image = getActivityImage(activity);
  const related = allActivities.filter((item) => item.legacyId !== activity.legacyId).slice(0, 3);
  const relatedFetchFailed = activitiesResult.status === 'error';

  const schedule = scheduleResult.schedule;
  const djs = schedule?.djs ?? [];
  const lineupFetchFailed = scheduleResult.status === 'error';
  const showTimetable = hasLineupTimetable(schedule);
  const timetableDays = showTimetable && schedule ? buildLineupTimetable(schedule) : [];
  const timetableStats = timetableDays.length ? countTimetableStats(timetableDays) : null;
  const genreGroups = groupByBroadGenre(djs, locale);
  const genreKeys = [...genreGroups.keys()].sort((a, b) => {
    const otherLabel = otherGenreLabel(locale);
    if (a === otherLabel) return 1;
    if (b === otherLabel) return -1;
    return (genreGroups.get(b)?.djs.length ?? 0) - (genreGroups.get(a)?.djs.length ?? 0);
  });
  const genreGroupData = genreKeys.map((genreLabel) => {
    const group = genreGroups.get(genreLabel)!;
    return {
      genreLabel,
      color: group.color,
      djs: group.djs,
    };
  });
  const aiSummary = buildEventAiSummary(activity, djs, locale);
  const eventTitle = getActivityTitle(activity);
  const metaLine = activityMetaForLocale(activity, locale);
  const [metaDate, ...metaLocationParts] = metaLine.split(' · ');
  const metaLocation = metaLocationParts.join(' · ');
  const subscribeEventProperties = {
    event: String(activity.legacyId),
    sourcePath: eventPath(locale, activity),
    locale,
  };
  const breadcrumbItems = [
    { name: t.breadcrumbs.home, url: `${siteUrl}${localizedPath(locale)}` },
    { name: t.breadcrumbs.events, url: `${siteUrl}${localizedPath(locale, '/events')}` },
    { name: eventTitle },
  ];
  const jsonLd = buildEventJsonLd(activity, djs, locale, breadcrumbItems);

  return (
    <main className="detail-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <section className="detail-hero" data-reveal>
        <div className="container">
          <Breadcrumbs
            ariaLabel={t.breadcrumbs.ariaLabel}
            items={[
              { label: t.breadcrumbs.home, href: localizedPath(locale) },
              { label: t.breadcrumbs.events, href: localizedPath(locale, '/events') },
              { label: eventTitle },
            ]}
          />
          <div className="detail-hero__media">
            {image ? (
              <EventImage
                src={image}
                alt={eventTitle}
                className="detail-hero__photo"
                priority
                sizes="(max-width: 1200px) 100vw, 1100px"
              />
            ) : null}
            <div className="detail-hero__scrim" aria-hidden="true" />
            <div className="detail-hero__body">
              <div className="detail-hero__tags">
                {activity.activityType && (
                  <span className="pill pill--secondary">
                    {getActivityTypeLabel(locale, activity.activityType)}
                  </span>
                )}
                {continentLabel ? (
                  <span className="pill pill--accent">
                    {continentLabel}
                  </span>
                ) : null}
                {activity.hot && <span className="pill pill--primary">{t.eventCard.hot}</span>}
              </div>
              <h1 className="detail-hero__title">{eventTitle}</h1>
              <div className="detail-hero__meta">
                {metaDate ? <span>{metaDate}</span> : null}
                {metaLocation ? <span>{metaLocation}</span> : null}
                {activity.city ? (
                  <Link className="detail-hero__city-link" href={cityPath(locale, activity.city)}>
                    {t.eventDetail.cityEventsLink.replace('{city}', activity.city)}
                  </Link>
                ) : null}
              </div>
              <EventDetailActions
                legacyId={activity.legacyId}
                eventTitle={eventTitle}
                locale={locale}
                externalUrl={activity.externalUrl}
                subscribeEventProperties={subscribeEventProperties}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section section--detail-tight" data-reveal style={{ '--reveal-delay': '0.08s' } as CSSProperties}>
        <div className="container">
          <EventAiSummary
            summary={aiSummary}
            locale={locale}
            eventTitle={eventTitle}
            labels={t.eventDetail.aiSummary}
            subscribeEventProperties={subscribeEventProperties}
          />
        </div>
      </section>

      <section className="section section--detail-body" data-reveal style={{ '--reveal-delay': '0.12s' } as CSSProperties}>
        <div className="container detail-layout detail-layout--lineup">
          <article className="detail-lineup">
            <header className="detail-lineup__header">
              <div>
                <h2 className="detail-lineup__title">
                  {showTimetable ? t.eventDetail.lineupTimetableTitle : t.eventDetail.lineupTitle}
                </h2>
                <p className="detail-lineup__lead">
                  {showTimetable ? t.eventDetail.lineupTimetableLead : t.eventDetail.lineupLead}
                </p>
              </div>
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

            {lineupFetchFailed ? (
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
            )}
          </article>

          <aside className="detail-rail">
            <article className="detail-panel detail-panel--compact">
              <h2 className="detail-panel__title">{t.eventDetail.aboutTitle}</h2>
              {activity.description ? (
                <p className="detail-panel__description">{activity.description}</p>
              ) : (
                <p className="detail-panel__description detail-panel__description--empty">
                  {t.eventDetail.aboutEmpty}
                </p>
              )}
              <dl className="detail-facts">
                <div className="detail-facts__row">
                  <dt>{t.eventDetail.type}</dt>
                  <dd>
                    {activity.activityType
                      ? getActivityTypeLabel(locale, activity.activityType)
                      : getActivityTypeLabel(locale, 'festival')}
                  </dd>
                </div>
                <div className="detail-facts__row">
                  <dt>{t.eventDetail.region}</dt>
                  <dd>{continentLabel ?? '-'}</dd>
                </div>
                {activity.infoSource ? (
                  <div className="detail-facts__row">
                    <dt>{t.eventDetail.infoSource}</dt>
                    <dd>{activity.infoSource}</dd>
                  </div>
                ) : null}
              </dl>
            </article>

            <article className="detail-cta-card">
              <h2 className="detail-cta-card__title">{t.eventDetail.ctaTitle}</h2>
              <p className="detail-cta-card__copy">{t.eventDetail.ctaCopy}</p>
              <TrackedLink
                className="button button--glow detail-cta-card__button"
                href={`${localizedPath(locale, '/waitlist')}?event=${encodeURIComponent(eventTitle)}`}
                eventName="event_subscribe_click"
                eventProperties={subscribeEventProperties}
              >
                {t.eventDetail.join}
              </TrackedLink>
            </article>
          </aside>
        </div>
      </section>

      {relatedFetchFailed ? (
        <section className="section section--detail-related" data-reveal>
          <div className="container">
            <RelatedEventsError
              locale={locale}
              labels={{
                title: t.eventDetail.relatedErrorTitle,
                lead: t.eventDetail.relatedErrorLead,
                retry: t.eventDetail.relatedErrorRetry,
                browse: t.eventDetail.relatedErrorBrowse,
              }}
            />
          </div>
        </section>
      ) : related.length ? (
        <section className="section section--detail-related" data-reveal>
          <div className="container">
            <div className="section__header">
              <div>
                <h2 className="section__title">{t.eventDetail.moreTitle}</h2>
              </div>
            </div>
            <div className="event-grid" data-reveal-stagger>
              {related.map((item, index) => (
                <EventCard
                  activity={item}
                  locale={locale}
                  key={item.legacyId}
                  style={{ '--card-index': index } as CSSProperties}
                />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="section section--detail-related" data-reveal>
          <div className="container">
            <EmptyState
              className="related-events-empty"
              icon={Sparkles}
              title={t.eventDetail.relatedEmptyTitle}
              lead={t.eventDetail.relatedEmptyLead}
              variant="compact"
              tone="accent"
              graphic="glow"
              actions={
                <TrackedLink
                  className="button button--compact"
                  href={`${localizedPath(locale, '/waitlist')}?event=${encodeURIComponent(eventTitle)}`}
                  eventName="event_subscribe_click"
                  eventProperties={{ ...subscribeEventProperties, source: 'related-empty' }}
                >
                  <span>{t.eventDetail.relatedEmptyAction}</span>
                  <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
                </TrackedLink>
              }
            />
          </div>
        </section>
      )}
    </main>
  );
}
