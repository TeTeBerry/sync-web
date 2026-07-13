'use client';

import {
  formatClashTemplate,
  getLineupClashCopy,
} from '../../lib/lineup-clash-copy';
import type { ArtistScheduleStatus } from '../../lib/lineup-clash';
import type { Locale } from '../../lib/i18n';

type LineupScheduleBadgeProps = {
  locale: Locale;
  status: ArtistScheduleStatus;
  className?: string;
};

/**
 * Lightweight route status — text label, not color-only.
 */
export function LineupScheduleBadge({
  locale,
  status,
  className,
}: LineupScheduleBadgeProps) {
  const copy = getLineupClashCopy(locale);
  if (status === 'not-selected') return null;
  const label = copy.status[status];
  if (!label) return null;

  return (
    <span
      className={[
        'lineup-schedule-badge',
        `lineup-schedule-badge--${status}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-status={status}
    >
      <span className="lineup-schedule-badge__mark" aria-hidden="true">
        {status === 'fits-route'
          ? '○'
          : status === 'hard-clash'
            ? '✕'
            : status === 'partial-clash'
              ? '◐'
              : status === 'tight-transfer'
                ? '↗'
                : '…'}
      </span>
      <span className="lineup-schedule-badge__label">{label}</span>
    </span>
  );
}

export function moodConflictLead(
  locale: Locale,
  conflictingName: string,
): string {
  return formatClashTemplate(getLineupClashCopy(locale).moodConflict, {
    name: conflictingName,
  });
}
