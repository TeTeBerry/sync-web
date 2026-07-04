'use client';

import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { track } from '@vercel/analytics';
import { ActionSuccessBanner } from './states/ActionSuccessBanner';
import { useBookmarks } from '../hooks/useBookmarks';
import type { Locale } from '../lib/i18n';

type BookmarkButtonProps = {
  legacyId: number;
  eventTitle: string;
  locale: Locale;
  variant?: 'hero' | 'card';
  labels: {
    save: string;
    saved: string;
    successTitle: string;
    successLead: string;
    successBrowse: string;
    successPlan: string;
    dismiss: string;
  };
  eventsPath: string;
  waitlistPath: string;
};

export function BookmarkButton({
  legacyId,
  eventTitle,
  locale,
  variant = 'hero',
  labels,
  eventsPath,
  waitlistPath,
}: BookmarkButtonProps) {
  const { hydrated, isBookmarked, toggleBookmark } = useBookmarks();
  const [showSuccess, setShowSuccess] = useState(false);
  const saved = hydrated && isBookmarked(legacyId);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = window.setTimeout(() => setShowSuccess(false), 5200);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const added = toggleBookmark(legacyId);
    track('event_bookmark_toggle', {
      event: String(legacyId),
      action: added ? 'add' : 'remove',
      locale,
      source: variant,
    });

    if (added) {
      setShowSuccess(true);
    } else {
      setShowSuccess(false);
    }
  }

  return (
    <div className={`bookmark-control bookmark-control--${variant}`}>
      <button
        className={`bookmark-button${saved ? ' is-saved' : ''}`}
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={saved ? labels.saved : labels.save}
      >
        {saved ? (
          <BookmarkCheck size={variant === 'hero' ? 16 : 14} strokeWidth={2.25} aria-hidden />
        ) : (
          <Bookmark size={variant === 'hero' ? 16 : 14} strokeWidth={2.25} aria-hidden />
        )}
        <span>{saved ? labels.saved : labels.save}</span>
      </button>

      {showSuccess ? (
        <ActionSuccessBanner
          className="bookmark-control__success"
          icon={BookmarkCheck}
          title={labels.successTitle.replace('{event}', eventTitle)}
          lead={labels.successLead}
          actions={
            <>
              <a className="action-success__link" href={waitlistPath}>
                {labels.successPlan}
              </a>
              <a className="action-success__link action-success__link--muted" href={eventsPath}>
                {labels.successBrowse}
              </a>
            </>
          }
          dismissible
          dismissLabel={labels.dismiss}
          onDismiss={() => setShowSuccess(false)}
        />
      ) : null}
    </div>
  );
}
