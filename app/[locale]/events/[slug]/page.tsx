import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '../../../../components/Breadcrumbs';
import { EventCard } from '../../../../components/EventCard';
import { EventPlannerPromo } from '../../../../components/event-detail/EventPlannerPromo';
import { EventCountdown } from '../../../../components/event-detail/EventCountdown';
import { FestivalSnapshot } from '../../../../components/event-detail/FestivalSnapshot';
import { LineupPreview } from '../../../../components/event-detail/LineupPreview';
import { TravelPreview } from '../../../../components/event-detail/TravelPreview';
import { EventLoadError } from '../../../../components/states/EventLoadError';
import { EventUnavailableState } from '../../../../components/states/EventUnavailableState';
import { EmptyState } from '../../../../components/states/EmptyState';
import { RelatedEventsError } from '../../../../components/states/RelatedEventsError';
import { EventDetailActions } from '../../../../components/EventDetailActions';
import { TravelFAQ } from '../../../../components/travel/TravelFAQ';
import { TrackedLink } from '../../../../components/TrackedLink';
import { EventImage } from '../../../../components/EventImage';
import {
  fetchActivities,
  getActivity,
  getActivityImage,
} from '../../../../lib/api';
import { getActivityEndYmd, getActivityStartYmd } from '../../../../lib/activity-date';
import { resolveActivityTimezone } from '../../../../lib/activity-timezone';
import { loadEventPageData } from '../../../../lib/event-page';
import { buildEventJsonLd, buildEventMetadata, buildFaqJsonLd } from '../../../../lib/seo';
import { cityPath } from '../../../../lib/seo-cities';
import {
  eventLineupPath,
  eventPath,
  eventPlanPath,
  eventTravelPath,
  parseEventLegacyId,
} from '../../../../lib/event-slug';
import { getSiteUrl } from '../../../../lib/site';
import {
  activityMetaForLocale,
  DEFAULT_LOCALE,
  getActivityTypeLabel,
  getMessages,
  isLocale,
  localizeActivities,
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
  const pageData = await loadEventPageData(locale, slug);

  if (pageData === 'error') return <EventLoadError locale={locale} />;
  if (pageData === 'not_found') return <EventUnavailableState locale={locale} />;

  const {
    activity,
    eventTitle,
    continentLabel,
    aiSummary,
    travelData,
    featuredArtists,
    stageLabels,
  } = pageData;

  const siteUrl = getSiteUrl();
  const activitiesResult = await fetchActivities();
  const allActivities = localizeActivities(activitiesResult.activities, locale);
  const image = getActivityImage(activity);
  const related = allActivities.filter((item) => item.legacyId !== activity.legacyId).slice(0, 3);
  const relatedFetchFailed = activitiesResult.status === 'error';

  const metaLine = activityMetaForLocale(activity, locale);
  const [metaDate, ...metaLocationParts] = metaLine.split(' · ');
  const metaLocation = metaLocationParts.join(' · ');
  const subscribeEventProperties = {
    event: String(activity.legacyId),
    sourcePath: eventPath(locale, activity),
    locale,
  };
  const planHref = eventPlanPath(locale, activity);
  const lineupHref = eventLineupPath(locale, activity);
  const travelHref = eventTravelPath(locale, activity);
  const breadcrumbItems = [
    { name: t.breadcrumbs.home, url: `${siteUrl}${localizedPath(locale)}` },
    { name: t.breadcrumbs.events, url: `${siteUrl}${localizedPath(locale, '/events')}` },
    { name: eventTitle },
  ];
  const faqJsonLd = buildFaqJsonLd(travelData.faq);
  const jsonLd = faqJsonLd
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          ...buildEventJsonLd(activity, pageData.djs, locale, breadcrumbItems)['@graph'],
          faqJsonLd,
        ],
      }
    : buildEventJsonLd(activity, pageData.djs, locale, breadcrumbItems);

  return (
    <main className="detail-page detail-page--journey">
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
                  <span className="pill pill--accent">{continentLabel}</span>
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
                planHref={planHref}
                externalUrl={activity.externalUrl}
                subscribeEventProperties={subscribeEventProperties}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        className="section section--detail-countdown"
        data-reveal
        style={{ '--reveal-delay': '0.04s' } as CSSProperties}
      >
        <div className="container">
          <EventCountdown
            eventStartDate={getActivityStartYmd(activity)}
            eventEndDate={getActivityEndYmd(activity)}
            timezone={resolveActivityTimezone(activity)}
            location={metaLocation || activity.location || activity.city}
            displayDate={metaDate}
            labels={t.eventDetail.countdown}
          />
        </div>
      </section>

      <div className="detail-journey">
        <section
          className="section section--detail-tight"
          data-reveal
          style={{ '--reveal-delay': '0.06s' } as CSSProperties}
        >
          <div className="container">
            <FestivalSnapshot
              activity={activity}
              summary={aiSummary}
              metaDate={metaDate}
              metaLocation={metaLocation}
              labels={t.eventDetail.snapshot}
            />
          </div>
        </section>

        <section
          className="section section--detail-block"
          data-reveal
          style={{ '--reveal-delay': '0.1s' } as CSSProperties}
        >
          <div className="container">
            <LineupPreview
              artists={featuredArtists}
              genres={aiSummary.genres}
              stageLabels={stageLabels}
              artistCount={aiSummary.artistCount}
              lineupHref={lineupHref}
              labels={t.eventDetail.lineupPreview}
              subscribeEventProperties={subscribeEventProperties}
            />
          </div>
        </section>

        <section
          className="section section--detail-block"
          data-reveal
          style={{ '--reveal-delay': '0.14s' } as CSSProperties}
        >
          <div className="container">
            <TravelPreview
              data={travelData}
              travelHref={travelHref}
              labels={t.eventDetail.travelPreview}
              subscribeEventProperties={subscribeEventProperties}
            />
          </div>
        </section>

        <section
          className="section section--detail-block"
          data-reveal
          style={{ '--reveal-delay': '0.18s' } as CSSProperties}
        >
          <div className="container">
            <EventPlannerPromo
              planHref={planHref}
              labels={t.eventDetail.plannerPromo}
              subscribeEventProperties={subscribeEventProperties}
            />
          </div>
        </section>

        <section
          className="section section--detail-block"
          data-reveal
          style={{ '--reveal-delay': '0.22s' } as CSSProperties}
        >
          <div className="container">
            <TravelFAQ items={travelData.faq} title={t.eventDetail.faqTitle} />
          </div>
        </section>
      </div>

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
