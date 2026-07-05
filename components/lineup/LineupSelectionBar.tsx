'use client';

import { useLineupSelection } from './LineupSelectionContext';

type LineupSelectionBarProps = {
  hint: string;
  countLabel: string;
  clearLabel: string;
};

export function LineupSelectionBar({ hint, countLabel, clearLabel }: LineupSelectionBarProps) {
  const { count, clear, hydrated } = useLineupSelection();

  if (!hydrated) return null;

  return (
    <div className="lineup-selection-bar" role="status" aria-live="polite">
      <p className="lineup-selection-bar__meta">
        {count > 0 ? (
          <>
            <span className="lineup-selection-bar__count">
              {countLabel.replace('{count}', String(count))}
            </span>
            <span className="lineup-selection-bar__divider" aria-hidden="true" />
          </>
        ) : null}
        <span className="lineup-selection-bar__hint">{hint}</span>
      </p>
      {count > 0 ? (
        <button className="lineup-selection-bar__clear" type="button" onClick={clear}>
          {clearLabel}
        </button>
      ) : null}
    </div>
  );
}
