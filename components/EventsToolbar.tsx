'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { CountrySelect } from './CountrySelect';
import type { ActivityRegion } from '../lib/types';

type SortOption = 'popular' | 'upcoming' | 'name';

type EventsToolbarProps = {
  basePath: string;
  query: string;
  country: string;
  region: ActivityRegion | '';
  sort: SortOption;
  countries: string[];
  labels: {
    searchPlaceholder: string;
    allCountries: string;
    search: string;
    sortPopular: string;
    sortUpcoming: string;
    sortName: string;
    sortLabel: string;
    regionAll: string;
    regionDomestic: string;
    regionOverseas: string;
    regionHmt: string;
    clearFilters: string;
  };
};

function buildEventsHref(
  basePath: string,
  params: { q?: string; country?: string; region?: string; sort?: string },
): string {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set('q', params.q.trim());
  if (params.country?.trim()) search.set('country', params.country.trim());
  if (params.region?.trim()) search.set('region', params.region.trim());
  if (params.sort && params.sort !== 'popular') search.set('sort', params.sort);
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function EventsToolbar({
  basePath,
  query,
  country,
  region,
  sort,
  countries,
  labels,
}: EventsToolbarProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const hasFilters = Boolean(query || country || region || sort !== 'popular');

  const regionOptions: Array<{ value: ActivityRegion | ''; label: string }> = [
    { value: '', label: labels.regionAll },
    { value: 'domestic', label: labels.regionDomestic },
    { value: 'overseas', label: labels.regionOverseas },
    { value: 'hmt', label: labels.regionHmt },
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
        region: region || undefined,
        sort: nextSort,
      }),
    );
  }

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
          {region ? <input type="hidden" name="region" value={region} /> : null}
          {sort !== 'popular' ? <input type="hidden" name="sort" value={sort} /> : null}
          <button className="button button--inverse button--compact events-toolbar__submit" type="submit">
            {labels.search}
          </button>
        </div>

        <div className="events-toolbar__controls">
          <div className="events-toolbar__filters" role="group" aria-label={labels.sortLabel}>
            <span className="events-toolbar__filters-label">
              <SlidersHorizontal size={14} strokeWidth={1.75} aria-hidden />
            </span>
            <div className="events-filter-chips">
              {regionOptions.map((option) => (
                <Link
                  key={option.value || 'all'}
                  href={buildEventsHref(basePath, {
                    q: query || undefined,
                    country: country || undefined,
                    region: option.value || undefined,
                    sort,
                  })}
                  className={`events-filter-chip${region === option.value ? ' is-active' : ''}`}
                  aria-current={region === option.value ? 'true' : undefined}
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
              <Link className="events-toolbar__clear" href={basePath}>
                <X size={14} strokeWidth={2} aria-hidden />
                <span>{labels.clearFilters}</span>
              </Link>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}
