import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { EventsToolbar } from '../../../components/EventsToolbar';
import { EventCard } from '../../../components/EventCard';
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
type MoodPath = 'ready' | 'lineup' | 'soon';

type EventsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    q?: string;
    country?: string;
    continent?: string;
    sort?: string;
    mood?: string;
  }>;
};

function isSortOption(value: string | undefined): value is SortOption {
  return value === 'popular' || value === 'upcoming' || value === 'name';
}

function normalizeMoodPath(value: string | undefined): MoodPath | undefined {
  if (value === 'ready' || value === 'lineup' || value === 'soon') return value;
  return value === 'lights' ? 'ready' : undefined;
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

function activitiesForMood(activities: Activity[], mood: MoodPath): Activity[] {
  if (mood === 'ready') {
    const journeyReady = activities.filter(
      (activity) => activity.travelGuideSupported || (activity.lineupPublished && artistCount(activity) > 0),
    );
    return sortForFeaturedJourney(journeyReady.length > 0 ? journeyReady : activities);
  }

  if (mood === 'lineup') {
    const withLineup = activities.filter((activity) => artistCount(activity) > 0);
    return [...(withLineup.length > 0 ? withLineup : activities)].sort(
      (left, right) => artistCount(right) - artistCount(left),
    );
  }

  return sortActivities(activities, mood === 'soon' ? 'upcoming' : 'popular');
}

export async function generateMetadata({ params }: EventsPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = getMessages(locale);
  const url = absoluteLocalizedUrl(locale, '/events');

  return {
    title: { absolute: t.events.seoTitle },
    description: t.events.description,
    alternates: {
      canonical: url,
      languages: absoluteAlternateLanguages('/events'),
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
  const rawMood = queryParams.mood?.trim();
  const mood = normalizeMoodPath(rawMood);
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
  // Mood paths should feel like a curated shelf, not a 4-card dead end.
  const filtered = mood ? activitiesForMood(utilityFiltered, mood).slice(0, 12) : utilityFiltered;
  const hasUtilityFilters = Boolean(query || country || continent || sort !== 'popular');
  const hasActiveFilters = hasUtilityFilters || Boolean(mood);
  const emptyVariant =
    fetchStatus === 'error' ? 'error' : activities.length === 0 ? 'catalog' : 'search';
  const featuredActivity = mood ? filtered[0] : sortForFeaturedJourney(utilityFiltered)[0];
  const collectionActivities = featuredActivity
    ? filtered.filter((activity) => activity.legacyId !== featuredActivity.legacyId).slice(0, 8)
    : [];
  const seasonActivities = sortActivities(filtered, 'upcoming')
    .filter((activity) => activity.legacyId !== featuredActivity?.legacyId)
    .slice(0, 5);
  const moodDefinitions = [
    {
      id: 'ready' as const,
      title: t.events.pathReady,
      lead: t.events.pathReadyLead,
      eyebrow: t.events.pathReadyEyebrow,
    },
    {
      id: 'lineup' as const,
      title: t.events.pathLineup,
      lead: t.events.pathLineupLead,
      eyebrow: t.events.pathLineupEyebrow,
    },
    {
      id: 'soon' as const,
      title: t.events.pathSoonest,
      lead: t.events.pathSoonestLead,
      eyebrow: t.events.pathSoonestEyebrow,
    },
  ];
  const usedMoodActivities = new Set<number>(featuredActivity ? [featuredActivity.legacyId] : []);
  const moodJourneys = moodDefinitions.flatMap((definition) => {
    const activity = activitiesForMood(utilityFiltered, definition.id).find(
      (candidate) => !usedMoodActivities.has(candidate.legacyId),
    );
    if (!activity) return [];
    usedMoodActivities.add(activity.legacyId);
    return [{ ...definition, activity }];
  });
  const activeMood = moodDefinitions.find((definition) => definition.id === mood);
  const heroActivity = !hasUtilityFilters ? featuredActivity : undefined;
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
                <p>{activeMood?.eyebrow ?? t.events.featuredEyebrow}</p>
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
                    mood={mood}
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
                    waitlistPath={localizedPath(locale, '/waitlist')}
                    labels={{
                      title: t.events.searchSuccessTitle,
                      titleWithQuery: t.events.searchSuccessTitleWithQuery,
                      lead: t.events.searchSuccessLead,
                      planCta: t.events.searchSuccessPlan,
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
            ) : mood && activeMood ? (
              <section className="events-mood-results" aria-labelledby="events-mood-results-heading">
                <div className="events-chapter-heading" data-reveal>
                  <div>
                    <p>{activeMood.eyebrow}</p>
                    <h2 id="events-mood-results-heading">{activeMood.title}</h2>
                  </div>
                  <Link className="events-mood-results__back" href={eventsPath}>
                    {t.events.allJourneys}
                    <ArrowRight size={15} strokeWidth={2} aria-hidden />
                  </Link>
                </div>
                <p className="events-mood-results__lead" data-reveal>{activeMood.lead}</p>
                <div className="events-poster-rail" data-reveal-stagger>
                  {filtered.map((activity, index) => (
                    <EventCard
                      activity={activity}
                      locale={locale}
                      variant="poster"
                      priorityImage={index === 0}
                      key={activity.legacyId}
                      style={{ '--card-index': index } as CSSProperties}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <>
                {collectionActivities.length > 0 ? (
                  <section className="events-collection" aria-labelledby="events-collection-heading">
                    <div className="events-chapter-heading" data-reveal>
                      <div>
                        <p>{t.events.collectionEyebrow}</p>
                        <h2 id="events-collection-heading">{t.events.collectionTitle}</h2>
                      </div>
                      <span>{t.events.collectionLead}</span>
                    </div>
                    <div className="events-poster-rail" data-reveal-stagger>
                      {collectionActivities.map((activity, index) => (
                        <EventCard
                          activity={activity}
                          locale={locale}
                          variant="poster"
                          priorityImage={false}
                          key={activity.legacyId}
                          style={{ '--card-index': index } as CSSProperties}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}

                {moodJourneys.length > 0 ? (
                  <section className="events-mood" aria-labelledby="events-mood-heading">
                    <div className="events-chapter-heading" data-reveal>
                      <div>
                        <p>{t.events.moodEyebrow}</p>
                        <h2 id="events-mood-heading">{t.events.moodTitle}</h2>
                      </div>
                      <span>{t.events.moodChapterLead}</span>
                    </div>
                    <div className="events-mood__paths" data-reveal-stagger>
                      {moodJourneys.map(({ activity, ...path }) => {
                        const image = getActivityImage(activity);

                        return (
                          <Link
                            className="events-mood__path"
                            href={`${eventsPath}?mood=${path.id}`}
                            key={activity.legacyId}
                            data-atmosphere={getFestivalAtmosphere(activity)}
                          >
                            <div className="events-mood__media">
                              {image ? (
                                <EventImage
                                  src={image}
                                  alt={getActivityTitle(activity)}
                                  className="events-mood__photo"
                                  sizes="(max-width: 760px) 100vw, 33vw"
                                />
                              ) : null}
                            </div>
                            <div className="events-mood__shade" aria-hidden />
                            <div className="events-mood__content">
                              <span>{path.eyebrow}</span>
                              <h3>{path.title}</h3>
                              <p>{path.lead}</p>
                              <strong>{getActivityTitle(activity)}</strong>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {seasonActivities.length > 0 ? (
                  <section className="events-season" aria-labelledby="events-season-heading">
                    <div className="events-chapter-heading" data-reveal>
                      <div>
                        <p>{t.events.seasonEyebrow}</p>
                        <h2 id="events-season-heading">{t.events.seasonTitle}</h2>
                      </div>
                      <span>{t.events.seasonLead}</span>
                    </div>
                    <ol className="events-season__timeline" data-reveal-stagger>
                      {seasonActivities.map((activity, index) => (
                        <li key={activity.legacyId}>
                          <Link href={eventPath(locale, activity)}>
                            <span className="events-season__number">0{index + 1}</span>
                            <strong>{getActivityTitle(activity)}</strong>
                            <span>
                              {artistCount(activity) > 0
                                ? t.events.signalArtists.replace('{count}', String(artistCount(activity)))
                                : t.events.signalSoon}
                              {' · '}
                              {activityMeta(activity)}
                            </span>
                            <ArrowRight size={16} strokeWidth={1.8} aria-hidden />
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </section>
                ) : null}
              </>
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
                  mood={mood}
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
                  waitlistCta: t.events.emptyWaitlistCta,
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
                mood={mood}
                countries={countries}
                labels={toolbarLabels}
              />
            </details>
          ) : null}

          <div className="events-ai-bridge" data-reveal>
            <p>{t.events.aiBridge}</p>
            <TrackedLink
              className="events-ai-bridge__link"
              href={localizedPath(locale, '/waitlist')}
              eventName="home_plan_click"
              eventProperties={{ locale, source: 'events-bridge' }}
            >
              <span>{t.events.aiBridgeCta}</span>
              <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
            </TrackedLink>
          </div>
        </div>
      </section>
    </main>
  );
}
