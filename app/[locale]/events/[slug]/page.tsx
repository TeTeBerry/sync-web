import { type CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '../../../../components/Breadcrumbs';
import { FestivalSquadPreview } from '../../../../components/festival-squad/FestivalSquadPreview';
import { EventLoadError } from '../../../../components/states/EventLoadError';
import { EmptyState } from '../../../../components/states/EmptyState';
import { RelatedEventsError } from '../../../../components/states/RelatedEventsError';
import { EventDetailActions } from '../../../../components/EventDetailActions';
import { TasteAwareLineup } from '../../../../components/TasteAwareLineup';
import { TrackedLink } from '../../../../components/TrackedLink';
import { EventImage } from '../../../../components/EventImage';
import { OfficialFestivalLinks } from '../../../../components/OfficialFestivalLinks';
import {
  fetchActivities,
  getActivity,
  getActivityImage,
  getActivityTitle,
} from '../../../../lib/api';
import { loadEventPageData } from '../../../../lib/event-page';
import { getFestivalAtmosphere } from '../../../../lib/festival-atmosphere';
import { curateRelatedFestivals } from '../../../../lib/related-festivals';
import { buildEventJsonLd, buildEventMetadata } from '../../../../lib/seo';
import { cityPath } from '../../../../lib/seo-cities';
import {
  eventLineupPath,
  eventPath,
  eventPlanPath,
  eventSquadPath,
  resolveActivityBySlug,
} from '../../../../lib/event-slug';
import { getSiteUrl } from '../../../../lib/site';
import {
  activityMetaForLocale,
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  localizeActivities,
  localizedPath,
  type Locale,
} from '../../../../lib/i18n';

type EventDetailProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: EventDetailProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const activityResult = await resolveActivityBySlug(slug, locale);
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
  if (pageData === 'not_found') notFound();

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
  const related = curateRelatedFestivals(activity, allActivities, 2);
  const relatedFetchFailed = activitiesResult.status === 'error';
  const atmosphere = getFestivalAtmosphere(activity, aiSummary.genres[0]);
  const worldImage = image ? ({ src: image, kind: 'festival' as const }) : null;

  const metaLine = activityMetaForLocale(activity, locale);
  const [metaDate, ...metaLocationParts] = metaLine.split(' · ');
  const metaLocation = metaLocationParts.join(' · ');
  const subscribeEventProperties = {
    event: String(activity.legacyId),
    sourcePath: eventPath(locale, activity),
    locale,
  };
  const planHref = eventPlanPath(locale, activity, { from: 'event' });
  const lineupHref = eventLineupPath(locale, activity);
  const squadHref = eventSquadPath(locale, activity);
  const breadcrumbItems = [
    { name: t.breadcrumbs.home, url: `${siteUrl}${localizedPath(locale)}` },
    { name: t.breadcrumbs.events, url: `${siteUrl}${localizedPath(locale, '/events')}` },
    { name: eventTitle },
  ];
  const jsonLd = buildEventJsonLd(activity, pageData.djs, locale, breadcrumbItems);

  const budgetGuide = travelData.budget.items.tiers[1]?.estimate;
  const quietMeta = [metaDate, metaLocation].filter(Boolean).join(' · ');
  const placeSignal = activity.city ?? activity.area ?? metaLocation;
  const worldCaption = placeSignal
    ? placeSignal
    : t.eventDetail.experience.worldFestival;

  return (
    <main className="detail-page detail-page--experience" data-atmosphere={atmosphere}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* ── Festival Hero Scene ─────────────────────────────────────────────── */}
      <section className="detail-hero detail-hero--scene" aria-labelledby="event-heading" data-reveal>
        <div className="detail-hero__stage">
          {image ? (
            <EventImage
              src={image}
              alt={eventTitle}
              className="detail-hero__photo"
              priority
              sizes="100vw"
            />
          ) : null}
          <div className="detail-hero__atmosphere" aria-hidden="true">
            <div className="detail-hero__glow" />
            <div className="detail-hero__scrim" />
          </div>

          <div className="container detail-hero__frame">
            <Breadcrumbs
              ariaLabel={t.breadcrumbs.ariaLabel}
              items={[
                { label: t.breadcrumbs.home, href: localizedPath(locale) },
                { label: t.breadcrumbs.events, href: localizedPath(locale, '/events') },
                { label: eventTitle },
              ]}
            />

            <div className="detail-hero__body">
              {(continentLabel || quietMeta) && (
                <p className="detail-hero__eyebrow">
                  {[continentLabel, quietMeta].filter(Boolean).join(' · ')}
                </p>
              )}
              <h1 id="event-heading" className="detail-hero__title">
                {eventTitle}
              </h1>
              <p className="detail-hero__invite">{aiSummary.vibe}</p>
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

      {/* ── Festival Story — progresses beyond the hero hook ────────────────── */}
      <section
        className="detail-story"
        aria-labelledby="festival-story-heading"
        data-reveal
        style={{ '--reveal-delay': '0.04s' } as CSSProperties}
      >
        <div className="container">
          <div className="detail-story__inner">
            <h2 id="festival-story-heading" className="detail-story__headline">
              {t.eventDetail.experience.storyTitle}
            </h2>
            <p className="detail-story__narrative">{aiSummary.story}</p>
            {quietMeta ? <p className="detail-story__whisper">{quietMeta}</p> : null}
          </div>
        </div>
      </section>

      {/* ── Mid-page world — prefer a different visual than the hero ────────── */}
      {worldImage ? (
        <section
          className="detail-world detail-world--festival"
          aria-label={worldCaption}
          data-reveal
        >
          <div className="detail-world__frame">
            <EventImage
              src={worldImage.src}
              alt={eventTitle}
              className="detail-world__photo"
              sizes="100vw"
            />
            <div className="detail-world__veil" />
            <div className="detail-world__caption">
              {placeSignal ? <p className="detail-world__place">{placeSignal}</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Lineup + taste (client signals when available) ──────────────────── */}
      <section
        className="detail-lineup"
        data-reveal
        style={{ '--reveal-delay': '0.08s' } as CSSProperties}
      >
        <div className="container">
          <TasteAwareLineup
            activityLegacyId={activity.legacyId}
            artists={featuredArtists}
            genres={aiSummary.genres}
            stageLabels={stageLabels}
            artistCount={aiSummary.artistCount}
            lineupHref={lineupHref}
            labels={{
              ...t.eventDetail.lineupPreview,
              awaitingTitle: t.eventDetail.experience.awaitingTitle,
              awaitingLead: t.eventDetail.experience.awaitingLead,
            }}
            awaitingCopy={aiSummary.awaiting}
            subscribeEventProperties={subscribeEventProperties}
            locale={locale}
          />
        </div>
      </section>

      <OfficialFestivalLinks activity={activity} locale={locale} />

      {/* ── Plan chapter — arrival confidence into journey ─────────────────── */}
      <section
        className="detail-travel detail-plan-entry"
        aria-labelledby="plan-confidence-heading"
        data-reveal
        style={{ '--reveal-delay': '0.12s' } as CSSProperties}
      >
        <div className="container">
          <div className="detail-travel__inner">
            <p className="detail-plan-entry__kicker">{t.eventDetail.experience.planKicker}</p>
            <h2 id="plan-confidence-heading" className="detail-travel__title">
              {t.eventDetail.experience.travelTitle}
            </h2>

            <p className="detail-travel__story">{aiSummary.travel}</p>
            <p className="detail-plan-entry__invite">{t.eventDetail.experience.planInvite}</p>

            <ol className="detail-travel__arrival">
              <li>
                <span>{t.eventDetail.experience.arrivalLand}</span>
                <strong>{aiSummary.arrival.land}</strong>
              </li>
              <li>
                <span>{t.eventDetail.experience.arrivalSettle}</span>
                <strong>{aiSummary.arrival.settle}</strong>
              </li>
              <li>
                <span>{t.eventDetail.experience.arrivalGate}</span>
                <strong>{aiSummary.arrival.gate}</strong>
              </li>
            </ol>

            {budgetGuide ? (
              <p className="detail-travel__point detail-travel__point--budget">
                <span>{t.eventDetail.experience.budgetLabel}</span>
                <strong className="detail-travel__budget">{budgetGuide}</strong>
                {travelData.budget.insight ? <em>{travelData.budget.insight}</em> : null}
              </p>
            ) : null}

            <div className="detail-travel__actions">
              <TrackedLink
                className="button"
                href={planHref}
                eventName="event_plan_click"
                eventProperties={{ ...subscribeEventProperties, source: 'plan-entry' }}
              >
                <span>{t.eventDetail.travelPreview.exploreCta}</span>
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>

      {/* ── Festival Squad ──────────────────────────────────────────────────── */}
      <section
        className="detail-squad"
        data-reveal
        style={{ '--reveal-delay': '0.18s' } as CSSProperties}
      >
        <div className="container">
          <FestivalSquadPreview
            squadHref={squadHref}
            labels={t.festivalSquad.preview}
            eventProperties={subscribeEventProperties}
          />
        </div>
      </section>

      {/* ── Curated coda ────────────────────────────────────────────────────── */}
      {relatedFetchFailed ? (
        <section className="detail-related detail-related--quiet" data-reveal>
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
        <section className="detail-related detail-related--quiet" data-reveal>
          <div className="container">
            <p className="detail-related__kicker">{t.eventDetail.experience.relatedTitle}</p>
            <ul className="detail-related__links">
              {related.map((item) => (
                <li key={item.legacyId}>
                  <Link href={eventPath(locale, item)} className="detail-related__link">
                    <span>{getActivityTitle(item)}</span>
                    <ArrowRight size={14} strokeWidth={2} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            {activity.city ? (
              <Link className="detail-related__more" href={cityPath(locale, activity.city)}>
                {t.eventDetail.cityEventsLink.replace('{city}', activity.city)}
              </Link>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="detail-related detail-related--quiet" data-reveal>
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
