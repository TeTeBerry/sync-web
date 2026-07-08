import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { EventsToolbar } from '../../../components/EventsToolbar';
import { EventCard } from '../../../components/EventCard';
import { EventsEmptyState } from '../../../components/states/EventsEmptyState';
import { SearchSuccessBanner } from '../../../components/states/SearchSuccessBanner';
import { TrackedLink } from '../../../components/TrackedLink';
import { fetchActivities } from '../../../lib/api';
import { getActivityStartYmd } from '../../../lib/activity-date';
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

export const dynamic = 'force-dynamic';

type SortOption = 'popular' | 'upcoming' | 'name';

type EventsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    q?: string;
    country?: string;
    continent?: string;
    sort?: string;
  }>;
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

export async function generateMetadata({ params }: EventsPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = getMessages(locale);
  const url = absoluteLocalizedUrl(locale, '/events');

  return {
    title: {
      absolute: t.events.seoTitle,
    },
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
  const cityGroups = listCityGroups(rawActivities, locale).slice(0, 12);
  const eventsPath = localizedPath(locale, '/events');

  const countries = [...new Set(activities.map((item) => item.area).filter(Boolean))] as string[];
  const filtered = sortActivities(
    activities.filter((activity) => {
      const matchesQuery = query ? activitySearchText(activity).includes(query) : true;
      const matchesCountry = country ? activity.area === country : true;
      const matchesContinent = continent ? activityMatchesContinent(activity, continent) : true;
      return matchesQuery && matchesCountry && matchesContinent;
    }),
    sort,
  );

  const hasActiveFilters = Boolean(query || country || continent || sort !== 'popular');
  const emptyVariant =
    fetchStatus === 'error'
      ? 'error'
      : activities.length === 0
        ? 'catalog'
        : 'search';
  const featuredId =
    !hasActiveFilters && filtered.some((activity) => activity.hot)
      ? filtered.find((activity) => activity.hot)?.legacyId
      : undefined;
  const resultsLabel =
    filtered.length === 1 ? `1 ${t.events.resultsOne}` : `${filtered.length} ${t.events.resultsMany}`;

  return (
    <main className="events-page">
      <section className="events-hero" aria-labelledby="events-heading" data-reveal>
        <div className="ai-hero__atmosphere" aria-hidden="true">
          <div className="ai-hero__glow ai-hero__glow--warm" />
          <div className="ai-hero__glow ai-hero__glow--cool" />
        </div>
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
              <h1 id="events-heading">{t.events.heading}</h1>
              <p className="events-hero__lead">{t.events.lead}</p>
            </div>
            <div className="events-hero__stat stat-card" aria-label={resultsLabel}>
              <strong>{filtered.length}</strong>
              <span>{filtered.length === 1 ? t.events.resultsOne : t.events.resultsMany}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="events-discovery">
        <div className="container">
          <div data-reveal style={{ '--reveal-delay': '0.06s' } as CSSProperties}>
          <EventsToolbar
            basePath={eventsPath}
            query={query}
            country={country}
            continent={continent}
            sort={sort}
            countries={countries}
            labels={{
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
            }}
          />
          </div>

          {cityGroups.length > 0 ? (
            <div className="events-cities" aria-label={t.events.cityLinksTitle} data-reveal style={{ '--reveal-delay': '0.1s' } as CSSProperties}>
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

          {filtered.length > 0 ? (
            <>
              {hasActiveFilters ? (
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

              <div className="events-grid" data-reveal-stagger>
                {filtered.map((activity, index) => (
                  <EventCard
                    activity={activity}
                    locale={locale}
                    featured={activity.legacyId === featuredId}
                    priorityImage={index < 6 || activity.legacyId === featuredId}
                    key={activity.legacyId}
                    style={{ '--card-index': index } as CSSProperties}
                  />
                ))}
              </div>
            </>
          ) : (
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
          )}

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
