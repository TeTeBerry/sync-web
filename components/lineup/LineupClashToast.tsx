'use client';

import { useEffect } from 'react';
import {
  formatClashTemplate,
  getLineupClashCopy,
} from '../../lib/lineup-clash-copy';
import type { Locale } from '../../lib/i18n';
import { useLineupSelection } from './LineupSelectionContext';

type LineupClashToastProps = {
  locale: Locale;
};

/**
 * Immediate post-save feedback — never success-only when a clash exists.
 */
export function LineupClashToast({ locale }: LineupClashToastProps) {
  const {
    toast,
    dismissToast,
    keepToastForLater,
    openConflictCenter,
  } = useLineupSelection();
  const copy = getLineupClashCopy(locale);
  const hasClash = (toast?.newConflictCount ?? 0) > 0;

  useEffect(() => {
    if (!toast || hasClash) return;
    const timeout = window.setTimeout(dismissToast, 4200);
    return () => window.clearTimeout(timeout);
  }, [dismissToast, hasClash, toast]);

  if (!toast) return null;

  return (
    <aside
      className={`lineup-clash-toast${hasClash ? ' lineup-clash-toast--clash' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="lineup-clash-toast__body">
        <p className="lineup-clash-toast__eyebrow">{copy.addedTitle}</p>
        {toast.artistName ? (
          <p className="lineup-clash-toast__title">{toast.artistName}</p>
        ) : null}
        <p className="lineup-clash-toast__lead">
          {hasClash
            ? formatClashTemplate(copy.addedClash, {
                count: toast.newConflictCount,
              })
            : copy.addedOk}
        </p>
      </div>
      <div className="lineup-clash-toast__actions">
        {hasClash ? (
          <>
            <button
              type="button"
              className="button button--glow"
              onClick={() => {
                openConflictCenter(toast.conflictIds[0]);
                dismissToast();
              }}
            >
              {copy.resolveClash}
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={keepToastForLater}
            >
              {copy.keepForLater}
            </button>
          </>
        ) : null}
      </div>
    </aside>
  );
}
