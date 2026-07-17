import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { EventsToolbar } from '../../../components/EventsToolbar';
import { EventCard } from '../../../components/EventCard';
import { EventsFestivalAtlas } from '../../../components/EventsFestivalAtlas';
import { EventImage } from '../../../components/EventImage';
import { EventsEmptyState } from '../../../components/states/EventsEmptyState';
import { SearchSuccessBanner } from '../../../components/states/SearchSuccessBanner';
import { TrackedLink } from '../../../components/TrackedLink';
import { fetchActivities, getActivityImage, getActivityTitle } from '../../../lib/api';
import { getActivityStartYmd } from '../../../lib/activity-date';
import { activityMeta } from '../../../lib/format';
import { eventPath } from '../../../lib/event-slug';
import { getFestivalAtmosphere } from '../../../lib/festival-atmosphere';
import { listCityGroups, cityPath } from '../../../lib/seo-cities';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import {
  getMessages,
  DEFAULT_LOCALE,
  getContinentLabel,
  isLocale,
  localizeActivities,
  localizedPath,
  type Locale,
} from '../../../lib/i18n';
import {
  absoluteAlternateLanguages,
  absoluteLocalizedUrl,
  buildSocialMetadata,
} from '../../../lib/seo';
import {
  activityMatchesContinent,
  isActivityContinent,
  type ActivityContinent,
} from '../../../lib/activity-continent';
import type { Activity } from '../../../lib/types';

export const revalidate = 300;

type SortOption = 'popular' | 'upcoming' | 'name';

type EventsSearchParams = {
  q?: string;
  country?: string;
  continent?: string;
  sort?: string;
  mood?: string;
};

type EventsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<EventsSearchParams>;
};

function isSortOption(value: string | undefined): value is SortOption {
  return value === 'popular' || value === 'upcoming' || value === 'name';
}

function activitySearchText(activity: Activity): string {
  return [activity.name, activity.title, activity.location, activity.city, activity.area, activity.code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function sortActivities(activities: Activity[], sort: SortOption): Activity[] {
  const items = [...activities];

  if (sort === 'name') {
    return items.sort((left, right) =>
      (left.title ?? left.name).localeCompare(right.title ?? right.name, undefined, {
        sensitivity: 'base',
      }),
    );
  }

  if (sort === 'upcoming') {
    return items.sort((left, right) => {
      const leftDate = getActivityStartYmd(left) ?? left.date ?? '';
      const rightDate = getActivityStartYmd(right) ?? right.date ?? '';
      if (leftDate && rightDate) return leftDate.localeCompare(rightDate);
      if (leftDate) return -1;
      if (rightDate) return 1;
      return left.legacyId - right.legacyId;
    });
  }

  return items.sort((left, right) => {
    const hotDelta = Number(Boolean(right.hot)) - Number(Boolean(left.hot));
    if (hotDelta !== 0) return hotDelta;
    const attendeeDelta = (right.attendees ?? 0) - (left.attendees ?? 0);
    if (attendeeDelta !== 0) return attendeeDelta;
    return left.legacyId - right.legacyId;
  });
}

function artistCount(activity: Activity): number {
  return activity.artists?.length ?? activity.lineup?.length ?? 0;
}

function editorialScore(activity: Activity): number {
  const lineupSignal = Math.min(artistCount(activity), 24) / 6;
  const dateSignal = getActivityStartYmd(activity) ? 1 : 0;

  return (
    (activity.lineupPublished ? 3 : 0) +
    (activity.travelGuideSupported ? 2 : 0) +
    lineupSignal +
    dateSignal +
    (activity.hot ? 1 : 0)
  );
}

function sortForFeaturedJourney(activities: Activity[]): Activity[] {
  return [...activities].sort((left, right) => {
    const scoreDelta = editorialScore(right) - editorialScore(left);
    if (scoreDelta !== 0) return scoreDelta;
    const attendeeDelta = (right.attendees ?? 0) - (left.attendees ?? 0);
    if (attendeeDelta !== 0) return attendeeDelta;
    return left.legacyId - right.legacyId;
  });
}

function featuredReason(
  activity: Activity,
  labels: { travel: string; lineup: string; season: string },
): string {
  if (activity.travelGuideSupported) return labels.travel;
  if (activity.lineupPublished && artistCount(activity) > 0) {
    return labels.lineup.replace('{count}', String(artistCount(activity)));
  }
  return labels.season;
}

export async function generateMetadata({ params, searchParams }: EventsPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = getMessages(locale);
  const url = absoluteLocalizedUrl(locale, '/events');
  const queryParams = (await searchParams) ?? {};
  const hasFilterParams = Object.values(queryParams).some((value) => Boolean(value?.trim()));

  return {
    title: { absolute: t.events.seoTitle },
    description: t.events.description,
    alternates: {
      canonical: url,
      languages: absoluteAlternateLanguages('/events'),
    },
    robots: {
      index: !hasFilterParams,
      follow: true,
    },
    ...buildSocialMetadata({
      title: t.events.seoTitle,
      description: t.events.description,
      url,
      locale,
    }),
  };
}

export default async function EventsPage({ params: routeParams, searchParams }: EventsPageProps) {
  const { locale: rawLocale } = await routeParams;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const queryParams = (await searchParams) ?? {};
  const { activities: rawActivities, status: fetchStatus } = await fetchActivities();
  const activities = localizeActivities(rawActivities, locale);
  const query = queryParams.q?.trim().toLowerCase() ?? '';
  const country = queryParams.country?.trim() ?? '';
  const rawContinent = queryParams.continent?.trim() ?? '';
  const continent: ActivityContinent | '' = isActivityContinent(rawContinent) ? rawContinent : '';
  const rawSort = queryParams.sort?.trim();
  const sort: SortOption = isSortOption(rawSort) ? rawSort : 'popular';
  const cityGroups = listCityGroups(rawActivities, locale).slice(0, 12);
  const eventsPath = localizedPath(locale, '/events');
  const countries = [...new Set(activities.map((item) => item.area).filter(Boolean))] as string[];
  const utilityFiltered = sortActivities(
    activities.filter((activity) => {
      const matchesQuery = query ? activitySearchText(activity).includes(query) : true;
      const matchesCountry = country ? activity.area === country : true;
      const matchesContinent = continent ? activityMatchesContinent(activity, continent) : true;
      return matchesQuery && matchesCountry && matchesContinent;
    }),
    sort,
  );
  const filtered = utilityFiltered;
  const hasUtilityFilters = Boolean(query || country || continent || sort !== 'popular');
  const hasActiveFilters = hasUtilityFilters;
  const emptyVariant =
    fetchStatus === 'error' ? 'error' : activities.length === 0 ? 'catalog' : 'search';
  const featuredActivity = sortForFeaturedJourney(utilityFiltered)[0];
  const moodDefinitions = [
    {
      id: 'ready' as const,
      title: t.events.pathReady,
      lead: t.events.pathReadyLead,
      eyebrow: t.events.pathReadyEyebrow,
      chapterTitle: t.events.pathReadyChapterTitle,
      chapterLead: t.events.pathReadyChapterLead,
      seasonTitle: t.events.pathReadySeasonTitle,
    },
    {
      id: 'lineup' as const,
      title: t.events.pathLineup,
      lead: t.events.pathLineupLead,
      eyebrow: t.events.pathLineupEyebrow,
      chapterTitle: t.events.pathLineupChapterTitle,
      chapterLead: t.events.pathLineupChapterLead,
      seasonTitle: t.events.pathLineupSeasonTitle,
    },
    {
      id: 'soon' as const,
      title: t.events.pathSoonest,
      lead: t.events.pathSoonestLead,
      eyebrow: t.events.pathSoonestEyebrow,
      chapterTitle: t.events.pathSoonestChapterTitle,
      chapterLead: t.events.pathSoonestChapterLead,
      seasonTitle: t.events.pathSoonestSeasonTitle,
    },
  ];
  const heroActivity = !hasUtilityFilters ? featuredActivity : undefined;
  const atlasActivities = heroActivity
    ? filtered.filter((activity) => activity.legacyId !== heroActivity.legacyId)
    : filtered;
  const heroReason = heroActivity
    ? featuredReason(heroActivity, {
        travel: t.events.featuredReasonTravel,
        lineup: t.events.featuredReasonLineup,
        season: t.events.featuredReasonSeason,
      })
    : undefined;
  const resultsLabel =
    filtered.length === 1 ? `1 ${t.events.resultsOne}` : `${filtered.length} ${t.events.resultsMany}`;
  const toolbarLabels = {
    searchPlaceholder: t.events.searchPlaceholder,
    allCountries: t.events.allCountries,
    search: t.events.search,
    sortPopular: t.events.sortPopular,
    sortUpcoming: t.events.sortUpcoming,
    sortName: t.events.sortName,
    sortLabel: t.events.sortLabel,
    continentAll: t.events.continentAll,
    continentAsia: t.events.continentAsia,
    continentEurope: t.events.continentEurope,
    continentNorthAmerica: t.events.continentNorthAmerica,
    continentMiddleEast: t.events.continentMiddleEast,
    continentFilterLabel: t.events.continentFilterLabel,
    clearFilters: t.events.clearFilters,
    refineSearch: t.events.refineSearch,
  };
  const hasSearchContext = Boolean(query || country || continent);

  return (
    <main className="events-page">
      <section
        className={`events-hero${heroActivity ? ' events-hero--festival' : ''}`}
        aria-labelledby="events-heading"
        data-reveal
        data-atmosphere={heroActivity ? getFestivalAtmosphere(heroActivity) : undefined}
      >
        {heroActivity ? (
          <>
            <div className="events-hero__media">
              {getActivityImage(heroActivity) ? (
                <EventImage
                  src={getActivityImage(heroActivity)!}
                  alt={getActivityTitle(heroActivity)}
                  className="events-hero__photo"
                  priority
                  sizes="100vw"
                />
              ) : null}
            </div>
            <div className="events-hero__shade" aria-hidden />
          </>
        ) : (
          <div className="ai-hero__atmosphere" aria-hidden="true">
            <div className="ai-hero__glow ai-hero__glow--warm" />
            <div className="ai-hero__glow ai-hero__glow--cool" />
          </div>
        )}
        <div className="container">
          <Breadcrumbs
            ariaLabel={t.breadcrumbs.ariaLabel}
            items={[
              { label: t.breadcrumbs.home, href: localizedPath(locale) },
              { label: t.breadcrumbs.events },
            ]}
          />
          <div className="events-hero__inner">
            <div className="events-hero__copy">
              <p className="events-hero__eyebrow">{t.events.heroEyebrow}</p>
              <h1 id="events-heading">{t.events.heading}</h1>
              <p className="events-hero__lead">{t.events.lead}</p>
            </div>
            {heroActivity ? (
              <Link className="events-hero__festival" href={eventPath(locale, heroActivity)}>
                <p>{t.events.featuredEyebrow}</p>
                <h2>{getActivityTitle(heroActivity)}</h2>
                <span>{activityMeta(heroActivity)}</span>
                {heroReason ? <em className="events-hero__reason">{heroReason}</em> : null}
                <strong>
                  {t.events.featuredCta}
                  <ArrowRight size={17} strokeWidth={2} aria-hidden />
                </strong>
              </Link>
            ) : (
              <p className="events-hero__signal" aria-label={resultsLabel}>
                <span>{filtered.length}</span> {t.events.heroSignal}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="events-discovery">
        <div className="container">
          {filtered.length > 0 ? (
            hasUtilityFilters ? (
              <section className="events-search-chapter" aria-label={t.events.findLabel}>
                <div data-reveal>
                  <EventsToolbar
                    basePath={eventsPath}
                    query={query}
                    country={country}
                    continent={continent}
                    sort={sort}
                    countries={countries}
                    labels={toolbarLabels}
                    compactControls
                  />
                </div>
                {hasSearchContext ? (
                  <SearchSuccessBanner
                    locale={locale}
                    query={query}
                    country={country}
                    continent={continent ? getContinentLabel(locale, continent) ?? '' : ''}
                    count={filtered.length}
                    eventsPath={eventsPath}
                    labels={{
                      title: t.events.searchSuccessTitle,
                      titleWithQuery: t.events.searchSuccessTitleWithQuery,
                      lead: t.events.searchSuccessLead,
                      clearCta: t.events.searchSuccessClear,
                    }}
                  />
                ) : null}
                <div className="events-results-list" data-reveal-stagger>
                  {filtered.map((activity, index) => (
                    <EventCard
                      activity={activity}
                      locale={locale}
                      variant="list"
                      priorityImage={index < 3}
                      key={activity.legacyId}
                      style={{ '--card-index': index } as CSSProperties}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <EventsFestivalAtlas
                locale={locale}
                activities={atlasActivities}
                labels={{
                  eyebrow: t.events.atlasEyebrow,
                  title: t.events.atlasTitle,
                  lead: t.events.atlasLead,
                  all: t.events.atlasAll,
                  allLead: t.events.atlasAllLead,
                  openingEyebrow: t.events.atlasOpeningEyebrow,
                  openingTitle: t.events.atlasOpeningTitle,
                  openingLead: t.events.atlasOpeningLead,
                  seasonEyebrow: t.events.atlasSeasonEyebrow,
                  seasonTitle: t.events.atlasSeasonTitle,
                  reasons: {
                    travel: t.events.atlasReasonTravel,
                    lineup: t.events.atlasReasonLineup,
                    lineupCount: t.events.atlasReasonLineupCount,
                    soon: t.events.atlasReasonSoon,
                    default: t.events.atlasReasonDefault,
                  },
                  handoff: {
                    eyebrow: t.events.atlasHandoffEyebrow,
                    title: t.events.atlasHandoffTitle,
                    lead: t.events.atlasHandoffLead,
                    cta: t.events.atlasHandoffCta,
                    href: eventsPath,
                  },
                }}
                moods={moodDefinitions}
              />
            )
          ) : (
            <>
              <div className="events-search-chapter" data-reveal>
                <EventsToolbar
                  basePath={eventsPath}
                  query={query}
                  country={country}
                  continent={continent}
                  sort={sort}
                  countries={countries}
                  labels={toolbarLabels}
                />
              </div>
              <EventsEmptyState
                locale={locale}
                eventsPath={eventsPath}
                variant={emptyVariant}
                hasActiveFilters={hasActiveFilters}
                labels={{
                  searchTitle: t.events.emptySearchTitle,
                  searchLead: t.events.emptySearchLead,
                  catalogTitle: t.events.emptyCatalogTitle,
                  catalogLead: t.events.emptyCatalogLead,
                  errorTitle: t.events.emptyErrorTitle,
                  errorLead: t.events.emptyErrorLead,
                  searchAction: t.events.emptySearchAction,
                  errorRetry: t.events.emptyErrorRetry,
                  suggestionsLabel: t.states.emptySuggestionsLabel,
                  suggestions: t.states.emptySuggestions,
                  aiBridgeCta: t.events.aiBridgeCta,
                }}
              />
            </>
          )}

          {!hasActiveFilters && filtered.length > 0 ? (
            <details className="events-find" data-reveal>
              <summary>{t.events.findLabel}</summary>
              {cityGroups.length > 0 ? (
                <div className="events-find__cities" aria-label={t.events.cityLinksTitle}>
                  <span className="events-cities__label">{t.events.cityLinksTitle}</span>
                  <div className="events-cities__track">
                    {cityGroups.map((group) => (
                      <Link className="events-cities__pill" href={cityPath(locale, group.city)} key={group.slug}>
                        {group.city}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
              <EventsToolbar
                basePath={eventsPath}
                query={query}
                country={country}
                continent={continent}
                sort={sort}
                countries={countries}
                labels={toolbarLabels}
              />
            </details>
          ) : null}

          {hasActiveFilters ? <div className="events-ai-bridge" data-reveal>
            <p>{t.events.aiBridge}</p>
            <TrackedLink
              className="events-ai-bridge__link"
              href={eventsPath}
              eventName="events_browse_click"
              eventProperties={{ locale, source: 'events-bridge' }}
            >
              <span>{t.events.aiBridgeCta}</span>
              <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
            </TrackedLink>
          </div> : null}
        </div>
      </section>
    </main>
  );
}
