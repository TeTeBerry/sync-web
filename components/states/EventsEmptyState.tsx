import Link from 'next/link';
import { ArrowRight, RefreshCw, SearchX, Sparkles, WifiOff } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { RefreshRetryButton } from './RefreshRetryButton';
import { TrackedLink } from '../TrackedLink';
import { localizedPath, type Locale } from '../../lib/i18n';

export type EventsEmptyVariant = 'search' | 'catalog' | 'error';

type EventsEmptyStateProps = {
  locale: Locale;
  eventsPath: string;
  variant: EventsEmptyVariant;
  hasActiveFilters?: boolean;
  labels: {
    searchTitle: string;
    searchLead: string;
    catalogTitle: string;
    catalogLead: string;
    errorTitle: string;
    errorLead: string;
    searchAction: string;
    errorRetry: string;
    suggestionsLabel: string;
    suggestions: readonly string[];
    aiBridgeCta: string;
    waitlistCta: string;
  };
};

export function EventsEmptyState({
  locale,
  eventsPath,
  variant,
  hasActiveFilters = false,
  labels,
}: EventsEmptyStateProps) {
  if (variant === 'error') {
    return (
      <EmptyState
        className="events-empty"
        icon={WifiOff}
        title={labels.errorTitle}
        lead={labels.errorLead}
        variant="panel"
        tone="error"
        graphic="none"
        actions={
          <>
            <RefreshRetryButton className="button" label={labels.errorRetry}>
              <RefreshCw size={15} strokeWidth={2} aria-hidden />
              <span>{labels.errorRetry}</span>
            </RefreshRetryButton>
            <TrackedLink
              className="empty-state__secondary-link"
              href={localizedPath(locale, '/waitlist')}
              eventName="home_plan_click"
              eventProperties={{ locale, source: 'events-error' }}
            >
              {labels.waitlistCta}
            </TrackedLink>
          </>
        }
      />
    );
  }

  if (variant === 'catalog') {
    return (
      <EmptyState
        className="events-empty"
        icon={Sparkles}
        title={labels.catalogTitle}
        lead={labels.catalogLead}
        variant="panel"
        tone="accent"
        graphic="glow"
        actions={
          <>
            <TrackedLink
              className="button button--glow"
              href={localizedPath(locale, '/waitlist')}
              eventName="home_plan_click"
              eventProperties={{ locale, source: 'events-catalog-empty' }}
            >
              <Sparkles size={14} strokeWidth={2} aria-hidden />
              <span>{labels.waitlistCta}</span>
              <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
            </TrackedLink>
            <Link className="empty-state__secondary-link" href={localizedPath(locale)}>
              {labels.aiBridgeCta}
            </Link>
          </>
        }
      />
    );
  }

  return (
    <EmptyState
      className="events-empty"
      icon={SearchX}
      title={labels.searchTitle}
      lead={labels.searchLead}
      variant="panel"
      tone="neutral"
      graphic="glow"
      suggestionsLabel={hasActiveFilters ? labels.suggestionsLabel : undefined}
      suggestions={hasActiveFilters ? labels.suggestions : undefined}
      actions={
        <>
          <Link className="button" href={eventsPath}>
            {labels.searchAction}
          </Link>
          <TrackedLink
            className="events-empty__ai-link"
            href={localizedPath(locale, '/waitlist')}
            eventName="home_plan_click"
            eventProperties={{ locale, source: 'events-empty' }}
          >
            <Sparkles size={14} strokeWidth={2} aria-hidden />
            <span>{labels.aiBridgeCta}</span>
            <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
          </TrackedLink>
        </>
      }
    />
  );
}
