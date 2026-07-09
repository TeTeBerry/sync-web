'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { type ActivityContinent } from '../lib/activity-continent';
import { CountrySelect } from './CountrySelect';

type SortOption = 'popular' | 'upcoming' | 'name';

type EventsToolbarProps = {
  basePath: string;
  query: string;
  country: string;
  continent: ActivityContinent | '';
  sort: SortOption;
  mood?: string;
  countries: string[];
  compactControls?: boolean;
  labels: {
    searchPlaceholder: string;
    allCountries: string;
    search: string;
    sortPopular: string;
    sortUpcoming: string;
    sortName: string;
    sortLabel: string;
    continentAll: string;
    continentAsia: string;
    continentEurope: string;
    continentNorthAmerica: string;
    continentMiddleEast: string;
    continentFilterLabel: string;
    clearFilters: string;
    refineSearch: string;
  };
};

function buildEventsHref(
  basePath: string,
  params: { q?: string; country?: string; continent?: string; sort?: string; mood?: string },
): string {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set('q', params.q.trim());
  if (params.country?.trim()) search.set('country', params.country.trim());
  if (params.continent?.trim()) search.set('continent', params.continent.trim());
  if (params.sort && params.sort !== 'popular') search.set('sort', params.sort);
  if (params.mood) search.set('mood', params.mood);
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function EventsToolbar({
  basePath,
  query,
  country,
  continent,
  sort,
  mood,
  countries,
  compactControls = false,
  labels,
}: EventsToolbarProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const hasFilters = Boolean(query || country || continent || sort !== 'popular');

  const continentOptions: Array<{ value: ActivityContinent | ''; label: string }> = [
    { value: '', label: labels.continentAll },
    { value: 'asia', label: labels.continentAsia },
    { value: 'europe', label: labels.continentEurope },
    { value: 'north_america', label: labels.continentNorthAmerica },
    { value: 'middle_east', label: labels.continentMiddleEast },
  ];

  function handleSortChange(nextSort: string) {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const q = String(data.get('q') ?? '');
    const nextCountry = String(data.get('country') ?? '');
    router.push(
      buildEventsHref(basePath, {
        q,
        country: nextCountry,
        continent: continent || undefined,
        sort: nextSort,
        mood,
      }),
    );
  }

  const controls = (
    <div className="events-toolbar__controls">
      <div
        className="events-toolbar__filters"
        role="group"
        aria-label={labels.continentFilterLabel}
      >
        <span className="events-toolbar__filters-label">
          <SlidersHorizontal size={14} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="events-filter-chips">
          {continentOptions.map((option) => (
            <Link
              key={option.value || 'all'}
              href={buildEventsHref(basePath, {
                q: query || undefined,
                country: country || undefined,
                continent: option.value || undefined,
                sort,
                mood,
              })}
              className={`events-filter-chip${continent === option.value ? ' is-active' : ''}`}
              aria-current={continent === option.value ? 'true' : undefined}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="events-toolbar__actions">
        <CountrySelect
          name="country"
          value={country}
          options={countries}
          placeholder={labels.allCountries}
        />

        <label className="events-sort">
          <span className="visually-hidden">{labels.sortLabel}</span>
          <select
            name="sort"
            className="events-sort__select"
            value={sort}
            onChange={(event) => handleSortChange(event.target.value)}
          >
            <option value="popular">{labels.sortPopular}</option>
            <option value="upcoming">{labels.sortUpcoming}</option>
            <option value="name">{labels.sortName}</option>
          </select>
        </label>

        {hasFilters ? (
          <Link className="events-toolbar__clear" href={buildEventsHref(basePath, { mood })}>
            <X size={14} strokeWidth={2} aria-hidden />
            <span>{labels.clearFilters}</span>
          </Link>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="events-toolbar">
      <form className="events-toolbar__form" action={basePath} method="get" ref={formRef}>
        <div className="events-toolbar__search">
          <Search className="events-toolbar__search-icon" size={18} strokeWidth={1.75} aria-hidden />
          <input
            name="q"
            type="search"
            className="events-toolbar__input"
            placeholder={labels.searchPlaceholder}
            defaultValue={query}
            autoComplete="off"
            enterKeyHint="search"
          />
          {continent ? <input type="hidden" name="continent" value={continent} /> : null}
          {sort !== 'popular' ? <input type="hidden" name="sort" value={sort} /> : null}
          {mood ? <input type="hidden" name="mood" value={mood} /> : null}
          <button className="button button--inverse button--compact events-toolbar__submit" type="submit">
            {labels.search}
          </button>
        </div>

        {compactControls ? (
          <details className="events-toolbar__refine">
            <summary>
              <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden />
              {labels.refineSearch}
            </summary>
            {controls}
          </details>
        ) : controls}
      </form>
    </div>
  );
}
