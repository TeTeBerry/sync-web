import Link from 'next/link';
import { Bell, Music2 } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { TrackedLink } from '../TrackedLink';
import { localizedPath, type Locale } from '../../lib/i18n';

type LineupEmptyStateProps = {
  locale: Locale;
  eventTitle: string;
  subscribeEventProperties: Record<string, string>;
  labels: {
    title: string;
    lead: string;
    action: string;
    browseAction: string;
  };
};

export function LineupEmptyState({
  locale,
  eventTitle,
  subscribeEventProperties,
  labels,
}: LineupEmptyStateProps) {
  return (
    <EmptyState
      className="lineup-empty"
      icon={Music2}
      title={labels.title}
      lead={labels.lead}
      variant="panel"
      tone="accent"
      graphic="orbit"
      actions={
        <>
          <TrackedLink
            className="button button--compact"
            href={`${localizedPath(locale, '/waitlist')}?event=${encodeURIComponent(eventTitle)}`}
            eventName="event_subscribe_click"
            eventProperties={{ ...subscribeEventProperties, source: 'lineup-empty' }}
          >
            <Bell size={14} strokeWidth={2} aria-hidden />
            <span>{labels.action}</span>
          </TrackedLink>
          <Link className="empty-state__secondary-link" href={localizedPath(locale, '/events')}>
            {labels.browseAction}
          </Link>
        </>
      }
    />
  );
}
