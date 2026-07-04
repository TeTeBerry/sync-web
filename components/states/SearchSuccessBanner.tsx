import Link from 'next/link';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import type { Locale } from '../../lib/i18n';

type SearchSuccessBannerProps = {
  locale: Locale;
  query: string;
  country: string;
  continent: string;
  count: number;
  eventsPath: string;
  waitlistPath: string;
  labels: {
    title: string;
    titleWithQuery: string;
    lead: string;
    planCta: string;
    clearCta: string;
  };
};

function buildFilterSummary(query: string, country: string, continent: string): string | null {
  const parts = [query, country, continent].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export function SearchSuccessBanner({
  query,
  country,
  continent,
  count,
  eventsPath,
  waitlistPath,
  labels,
}: SearchSuccessBannerProps) {
  const filterSummary = buildFilterSummary(query, country, continent);
  const title = query
    ? labels.titleWithQuery.replace('{count}', String(count)).replace('{query}', query)
    : labels.title.replace('{count}', String(count));

  return (
    <div className="search-success state-enter" role="status" aria-live="polite">
      <div className="search-success__glow" aria-hidden="true" />
      <div className="search-success__icon" aria-hidden="true">
        <Search size={18} strokeWidth={2} />
      </div>
      <div className="search-success__copy">
        <p className="search-success__title">{title}</p>
        <p className="search-success__lead">
          {filterSummary ? `${labels.lead} · ${filterSummary}` : labels.lead}
        </p>
      </div>
      <div className="search-success__actions">
        <Link className="search-success__action search-success__action--primary" href={waitlistPath}>
          <Sparkles size={14} strokeWidth={2} aria-hidden />
          <span>{labels.planCta}</span>
          <ArrowRight size={13} strokeWidth={2.25} aria-hidden />
        </Link>
        <Link className="search-success__action" href={eventsPath}>
          {labels.clearCta}
        </Link>
      </div>
    </div>
  );
}
