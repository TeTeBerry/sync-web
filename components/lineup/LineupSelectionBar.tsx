'use client';

import { useLineupSelection } from './LineupSelectionContext';

type LineupSelectionBarProps = {
  hint: string;
  countLabel: string;
  clearLabel: string;
};

/**
 * Utility chrome — only appears after the user has marked something.
 * Desire first; task UI later.
 */
export function LineupSelectionBar({ hint, countLabel, clearLabel }: LineupSelectionBarProps) {
  const { count, clear, hydrated } = useLineupSelection();

  if (!hydrated || count === 0) return null;

  return (
    <div className="lineup-selection-bar lineup-selection-bar--active" role="status" aria-live="polite">
      <p className="lineup-selection-bar__meta">
        <span className="lineup-selection-bar__count">
          {countLabel.replace('{count}', String(count))}
        </span>
        <span className="lineup-selection-bar__divider" aria-hidden="true" />
        <span className="lineup-selection-bar__hint">{hint}</span>
      </p>
      <button className="lineup-selection-bar__clear" type="button" onClick={clear}>
        {clearLabel}
      </button>
    </div>
  );
}
