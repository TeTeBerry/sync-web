import Link from 'next/link';
import { Music2 } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { localizedPath, type Locale } from '../../lib/i18n';

type LineupEmptyStateProps = {
  locale: Locale;
  labels: {
    title: string;
    lead: string;
    browseAction: string;
  };
};

export function LineupEmptyState({
  locale,
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
          <Link className="empty-state__secondary-link" href={localizedPath(locale, '/events')}>
            {labels.browseAction}
          </Link>
        </>
      }
    />
  );
}
