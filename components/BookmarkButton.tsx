'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { track } from '@vercel/analytics';
import { ActionSuccessBanner } from './states/ActionSuccessBanner';
import { useBookmarks } from '../hooks/useBookmarks';
import { useAuthSession } from '../hooks/useAuthSession';
import { ensureAuthCsrf } from '../lib/auth/client';
import type { Locale } from '../lib/i18n';
import { openRavenAuthModal } from '../lib/auth/modal';

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
  planPath: string;
};

export function BookmarkButton({
  legacyId,
  eventTitle,
  locale,
  variant = 'hero',
  labels,
  eventsPath,
  planPath,
}: BookmarkButtonProps) {
  const { bookmarks, hydrated, isBookmarked, toggleBookmark } = useBookmarks();
  const auth = useAuthSession();
  const pathname = usePathname();
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const saved = hydrated && isBookmarked(legacyId);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = window.setTimeout(() => setShowSuccess(false), 5200);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  useEffect(() => {
    if (!auth.signedIn || !hydrated) return;
    const pending = Number(window.localStorage.getItem('raven_pending_festival_favorite'));
    if (pending !== legacyId || isBookmarked(legacyId)) return;
    void saveFavorite();
  // The callback is intentionally replayed only for the matching festival.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.signedIn, hydrated, legacyId]);

  async function saveFavorite() {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    const added = toggleBookmark(legacyId);
    const nextIds = added
      ? [...bookmarks, legacyId]
      : [...bookmarks].filter((id) => id !== legacyId);
    try {
      const csrf = await ensureAuthCsrf();
      const response = await fetch('/api/me/profile', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({ favoriteFestivalIds: nextIds.map(String) }),
      });
      if (!response.ok) throw new Error('favorite failed');
      window.localStorage.removeItem('raven_pending_festival_favorite');
      if (added) setShowSuccess(true); else setShowSuccess(false);
    } catch {
      toggleBookmark(legacyId);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (saving) return;

    // Auth.js loads client-side. In development, the mock session often
    // resolves just after the first interaction; wait for that result instead
    // of briefly opening a sign-in modal for an already authenticated raver.
    const session = auth.loading ? await auth.refresh() : auth.session;
    if (!session?.signedIn) {
      window.localStorage.setItem('raven_pending_festival_favorite', String(legacyId));
      openRavenAuthModal('profile', pathname);
      return;
    }
    window.localStorage.removeItem('raven_pending_festival_favorite');
    void saveFavorite();
    const added = !saved;
    track('event_bookmark_toggle', {
      event: String(legacyId),
      action: added ? 'add' : 'remove',
      locale,
      source: variant,
    });

    if (!added) setShowSuccess(false);
  }

  return (
    <div className={`bookmark-control bookmark-control--${variant}`}>
      <button
        className={`bookmark-button${saved ? ' is-saved' : ''}`}
        type="button"
        onClick={(event) => void handleClick(event)}
        aria-pressed={saved}
        aria-label={saved ? labels.saved : labels.save}
        aria-busy={saving}
        disabled={saving}
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
              <a className="action-success__link" href={planPath}>
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
