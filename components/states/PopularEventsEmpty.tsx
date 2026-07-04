import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { TrackedLink } from '../TrackedLink';
import { localizedPath, type Locale } from '../../lib/i18n';

type PopularEventsEmptyProps = {
  locale: Locale;
  labels: {
    title: string;
    lead: string;
    browseAction: string;
    waitlistAction: string;
  };
};

export function PopularEventsEmpty({ locale, labels }: PopularEventsEmptyProps) {
  return (
    <EmptyState
      className="popular-events-empty"
      icon={CalendarDays}
      title={labels.title}
      lead={labels.lead}
      variant="compact"
      tone="accent"
      graphic="glow"
      actions={
        <>
          <Link className="button button--compact" href={localizedPath(locale, '/events')}>
            <span>{labels.browseAction}</span>
            <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
          </Link>
          <TrackedLink
            className="empty-state__secondary-link"
            href={localizedPath(locale, '/waitlist')}
            eventName="home_plan_click"
            eventProperties={{ locale, source: 'popular-empty' }}
          >
            {labels.waitlistAction}
          </TrackedLink>
        </>
      }
    />
  );
}
