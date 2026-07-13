'use client';

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
  } = useLineupSelection();
  const copy = getLineupClashCopy(locale);

  if (!hydrated || count === 0) return null;

  const clashCount =
    conflictSummary.hard + conflictSummary.partial + conflictSummary.tightTransfer;
  const hasIssues = clashCount > 0 || conflictSummary.schedulePending > 0;

  const routeLine = hasIssues
    ? clashCount > 0
      ? formatClashTemplate(copy.routeTension, { count: clashCount })
      : formatClashTemplate(copy.routePending, {
          count: conflictSummary.schedulePending,
        })
    : formatClashTemplate(copy.routeCalm, { count });

  return (
    <div
      className={`lineup-selection-bar lineup-selection-bar--active${hasIssues ? ' lineup-selection-bar--clash' : ''}`}
      role="status"
      aria-live="polite"
    >
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
      <div className="lineup-selection-bar__actions">
        <button
          type="button"
          className={`lineup-selection-bar__quiet lineup-selection-bar__review${hasIssues ? ' lineup-selection-bar__clash' : ''}`}
          onClick={() => openConflictCenter()}
        >
          {hasIssues ? copy.review : copy.reviewQuiet}
        </button>
        <button className="lineup-selection-bar__clear" type="button" onClick={clear}>
          {clearLabel}
        </button>
      </div>
    </div>
  );
}
