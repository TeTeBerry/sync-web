'use client';

import { useEffect } from 'react';
import { getLineupClashCopy, formatClashTemplate } from '../../lib/lineup-clash-copy';
import type { Locale } from '../../lib/i18n';
import { useLineupSelection } from './LineupSelectionContext';

type LineupSelectionBarProps = {
  locale: Locale;
  hint: string;
  countLabel: string;
  clearLabel: string;
};

/**
 * Persistent night-route whisper — not a shopping cart or status dashboard.
 */
export function LineupSelectionBar({
  locale,
  hint,
  countLabel,
  clearLabel,
}: LineupSelectionBarProps) {
  const {
    count,
    clear,
    hydrated,
    conflictSummary,
    openConflictCenter,
    toast,
    dismissToast,
    keepToastForLater,
  } = useLineupSelection();
  const copy = getLineupClashCopy(locale);

  const clashCount =
    conflictSummary.hard + conflictSummary.partial + conflictSummary.tightTransfer;
  const hasIssues = clashCount > 0 || conflictSummary.schedulePending > 0;
  const hasToastClash = (toast?.newConflictCount ?? 0) > 0;

  useEffect(() => {
    if (!toast || hasToastClash) return;
    const timeout = window.setTimeout(dismissToast, 4200);
    return () => window.clearTimeout(timeout);
  }, [dismissToast, hasToastClash, toast]);

  if (!hydrated || count === 0) return null;

  const routeLine = hasIssues
    ? clashCount > 0
      ? formatClashTemplate(copy.routeTension, { count: clashCount })
      : formatClashTemplate(copy.routePending, {
          count: conflictSummary.schedulePending,
        })
    : formatClashTemplate(copy.routeCalm, { count });

  return (
    <aside
      className={`lineup-selection-bar lineup-selection-bar--active${hasIssues ? ' lineup-selection-bar--clash' : ''}${toast ? ' lineup-selection-bar--toast' : ''}`}
      aria-label={copy.myLineup}
    >
      <span className="lineup-selection-bar__glow" aria-hidden="true" />
      {toast ? (
        <div className="lineup-selection-bar__toast lineup-clash-toast__body" role="status" aria-live="polite">
          <p className="lineup-clash-toast__eyebrow">{copy.addedTitle}</p>
          {toast.artistName ? (
            <p className="lineup-clash-toast__title">{toast.artistName}</p>
          ) : null}
          <p className="lineup-clash-toast__lead">
            {hasToastClash
              ? formatClashTemplate(copy.addedClash, { count: toast.newConflictCount })
              : copy.addedOk}
          </p>
        </div>
      ) : (
        <div className="lineup-selection-bar__copy">
          <p className="lineup-selection-bar__title">{copy.myLineup}</p>
          <p className="lineup-selection-bar__meta">
            <span className="lineup-selection-bar__count">{routeLine}</span>
            {!hasIssues ? (
              <>
                <span className="lineup-selection-bar__divider" aria-hidden="true" />
                <span className="lineup-selection-bar__hint">{hint}</span>
              </>
            ) : null}
          </p>
          <span className="visually-hidden">
            {countLabel.replace('{count}', String(count))}
          </span>
        </div>
      )}
      <div className="lineup-selection-bar__actions">
        {toast && hasToastClash ? (
          <>
            <button
              type="button"
              className="lineup-selection-bar__quiet lineup-selection-bar__review lineup-selection-bar__clash"
              onClick={() => {
                openConflictCenter(toast.conflictIds[0]);
                dismissToast();
              }}
            >
              {copy.resolveClash}
            </button>
            <button
              type="button"
              className="lineup-selection-bar__keep"
              onClick={keepToastForLater}
            >
              {copy.keepForLater}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`lineup-selection-bar__quiet lineup-selection-bar__review${hasIssues ? ' lineup-selection-bar__clash' : ''}`}
            onClick={() => openConflictCenter()}
          >
            {hasIssues ? copy.review : copy.reviewQuiet}
          </button>
        )}
        <button className="lineup-selection-bar__clear" type="button" onClick={clear}>
          {clearLabel}
        </button>
      </div>
    </aside>
  );
}
