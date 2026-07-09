import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LineupExperience } from '../../../../../components/lineup/LineupExperience';
import { LineupHeroScene } from '../../../../../components/lineup/LineupHeroScene';
import { EventLoadError } from '../../../../../components/states/EventLoadError';
import { EventUnavailableState } from '../../../../../components/states/EventUnavailableState';
import { LineupEmptyState } from '../../../../../components/states/LineupEmptyState';
import { LineupErrorState } from '../../../../../components/states/LineupErrorState';
import { getActivity, getActivityImage } from '../../../../../lib/api';
import { loadEventPageData } from '../../../../../lib/event-page';
import { getFestivalAtmosphere } from '../../../../../lib/festival-atmosphere';
import { buildFestivalFlow } from '../../../../../lib/lineup-flow';
import { buildFeaturedArtists } from '../../../../../lib/lineup-preview';
import { buildLineupChapterVoice } from '../../../../../lib/lineup-voice';
import {
  eventLineupPath,
  eventPath,
  eventPlanPath,
  parseEventLegacyId,
} from '../../../../../lib/event-slug';
import { buildLineupJsonLd, buildLineupMetadata } from '../../../../../lib/seo';
import { getSiteUrl } from '../../../../../lib/site';
import {
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
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

  return buildLineupMetadata(activityResult.activity, locale);
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
    stageLabels,
    schedulePublished,
  } = pageData;

  const siteUrl = getSiteUrl();
  const planHref = eventPlanPath(locale, activity, { from: 'lineup' });
  const eventHref = eventPath(locale, activity);
  const lineupHref = eventLineupPath(locale, activity);
  const image = getActivityImage(activity);
  const atmosphere = getFestivalAtmosphere(activity, aiSummary.genres[0]);
  const voice = buildLineupChapterVoice(activity, locale, atmosphere, aiSummary.genres);
  const subscribeEventProperties = {
    event: String(activity.legacyId),
    sourcePath: lineupHref,
    locale,
  };
  const breadcrumbItems = [
    { name: t.breadcrumbs.home, url: `${siteUrl}${localizedPath(locale)}` },
    { name: t.breadcrumbs.events, url: `${siteUrl}${localizedPath(locale, '/events')}` },
    { name: eventTitle, url: `${siteUrl}${eventHref}` },
    { name: t.eventDetail.lineupPage.title, url: `${siteUrl}${lineupHref}` },
  ];
  const jsonLd = buildLineupJsonLd(activity, djs, locale, breadcrumbItems);

  const stageCount =
    timetableStats?.stageCount ?? (stageLabels.length > 0 ? stageLabels.length : 0);
  const soundLine = aiSummary.genres.slice(0, 3).join(' · ');
  const reasonByName = new Map(
    aiSummary.mustSee.map((artist) => [artist.name.toLowerCase(), artist.reason]),
  );
  const spotlightArtists = buildFeaturedArtists(djs, locale, {
    stagesPublished: schedulePublished,
    limit: 5,
  }).map((artist) => ({
    ...artist,
    reason: reasonByName.get(artist.name.toLowerCase()) ?? artist.reason,
  }));
  const flowDays =
    showTimetable && timetableDays.length > 0
      ? buildFestivalFlow(timetableDays, locale)
      : [];
  const hasLineupContent =
    (showTimetable && timetableDays.length > 0) || djs.length > 0;

  const lineupBody = lineupFetchFailed ? (
    <section className="lineup-scene" data-reveal>
      <div className="container">
        <LineupErrorState
          locale={locale}
          labels={{
            title: t.eventDetail.lineupErrorTitle,
            lead: t.eventDetail.lineupErrorLead,
            retry: t.eventDetail.lineupErrorRetry,
            browse: t.eventDetail.lineupEmptyBrowse,
          }}
        />
      </div>
    </section>
  ) : hasLineupContent ? (
    <LineupExperience
      locale={locale}
      activityLegacyId={activity.legacyId}
      showTimetable={showTimetable && flowDays.length > 0}
      flowDays={flowDays}
      genreGroups={genreGroupData}
      featuredArtists={spotlightArtists}
      genres={aiSummary.genres}
      stageLabels={stageLabels}
      stagesPublished={schedulePublished}
      soundLine={soundLine}
      voice={voice}
      planHref={planHref}
      subscribeEventProperties={subscribeEventProperties}
      labels={{
        spotlight: t.eventDetail.lineupPage.spotlight,
        genres: t.eventDetail.lineupPage.genres,
        map: t.eventDetail.lineupPage.map,
        planner: t.eventDetail.lineupPage.planner,
        selection: {
          hint: t.eventDetail.lineupPickHint,
          count: t.eventDetail.lineupPickCount,
          clear: t.eventDetail.lineupPickClear,
        },
      }}
    />
  ) : (
    <section className="lineup-scene" data-reveal>
      <div className="container">
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
      </div>
    </section>
  );

  return (
    <main
      className="detail-page detail-page--experience detail-page--lineup"
      data-atmosphere={atmosphere}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <LineupHeroScene
        eventTitle={eventTitle}
        invite={aiSummary.vibe}
        image={image}
        artistCount={aiSummary.artistCount}
        stageCount={stageCount}
        genreCount={aiSummary.genreCount}
        breadcrumbsAriaLabel={t.breadcrumbs.ariaLabel}
        breadcrumbs={[
          { label: t.breadcrumbs.home, href: localizedPath(locale) },
          { label: t.breadcrumbs.events, href: localizedPath(locale, '/events') },
          { label: eventTitle, href: eventHref },
          { label: t.eventDetail.lineupPage.title },
        ]}
        labels={{
          eyebrow: t.eventDetail.lineupPage.eyebrow,
          headlineFallback: t.eventDetail.lineupPage.headlineFallback,
          lead: t.eventDetail.lineupPage.lead,
          artistsUnit: t.eventDetail.lineupStatsArtists,
          stagesUnit: t.eventDetail.lineupTimetableStages,
          genresUnit: t.eventDetail.lineupStatsGenres,
        }}
      />

      {lineupBody}
    </main>
  );
}
