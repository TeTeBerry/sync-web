'use client';

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

  if (!toast) return null;

  const hasClash = toast.newConflictCount > 0;

  return (
    <div
      className={`lineup-clash-toast${hasClash ? ' lineup-clash-toast--clash' : ''}`}
      role="status"
      aria-live="assertive"
    >
      <div className="lineup-clash-toast__body">
        <p className="lineup-clash-toast__title">{copy.addedTitle}</p>
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
        ) : (
          <button type="button" className="button button--secondary" onClick={dismissToast}>
            {copy.toastDismiss}
          </button>
        )}
      </div>
    </div>
  );
}
