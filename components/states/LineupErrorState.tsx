import Link from 'next/link';
import { RefreshCw, WifiOff } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { RefreshRetryButton } from './RefreshRetryButton';
import { localizedPath, type Locale } from '../../lib/i18n';

type LineupErrorStateProps = {
  locale: Locale;
  labels: {
    title: string;
    lead: string;
    retry: string;
    browse: string;
  };
};

export function LineupErrorState({ locale, labels }: LineupErrorStateProps) {
  return (
    <EmptyState
      className="lineup-empty lineup-empty--error"
      icon={WifiOff}
      title={labels.title}
      lead={labels.lead}
      variant="panel"
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
        </>
      }
    />
  );
}
