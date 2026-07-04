import Link from 'next/link';
import { RefreshCw, WifiOff } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { RefreshRetryButton } from './RefreshRetryButton';
import { TrackedLink } from '../TrackedLink';
import { localizedPath, type Locale } from '../../lib/i18n';

type PopularEventsErrorProps = {
  locale: Locale;
  labels: {
    title: string;
    lead: string;
    retry: string;
    waitlist: string;
    browse: string;
  };
};

export function PopularEventsError({ locale, labels }: PopularEventsErrorProps) {
  return (
    <EmptyState
      className="popular-events-empty"
      icon={WifiOff}
      title={labels.title}
      lead={labels.lead}
      variant="compact"
      tone="error"
      graphic="none"
      actions={
        <>
          <RefreshRetryButton className="button button--compact" label={labels.retry}>
            <RefreshCw size={14} strokeWidth={2} aria-hidden />
            <span>{labels.retry}</span>
          </RefreshRetryButton>
          <Link className="empty-state__secondary-link" href={localizedPath(locale, '/events')}>
            {labels.browse}
          </Link>
          <TrackedLink
            className="empty-state__secondary-link"
            href={localizedPath(locale, '/waitlist')}
            eventName="home_plan_click"
            eventProperties={{ locale, source: 'popular-error' }}
          >
            {labels.waitlist}
          </TrackedLink>
        </>
      }
    />
  );
}
