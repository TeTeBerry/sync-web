'use client';

import type { LineupTimetableDay } from '../../lib/lineup-timetable';
import { LineupGenreBoard, type LineupGenreGroup } from './LineupGenreBoard';
import { LineupSelectionBar } from './LineupSelectionBar';
import { LineupSelectionProvider } from './LineupSelectionContext';
import { LineupTimetable } from '../LineupTimetable';
import type { Locale } from '../../lib/i18n';

type DetailLineupContentProps = {
  locale: Locale;
  activityLegacyId: number;
  showTimetable: boolean;
  timetableDays: LineupTimetableDay[];
  genreGroups: LineupGenreGroup[];
  timetableLabels: {
    time: string;
    artist: string;
    genre: string;
  };
  selectionLabels: {
    hint: string;
    count: string;
    clear: string;
  };
  stagesPublished: boolean;
};

export function DetailLineupContent({
  locale,
  activityLegacyId,
  showTimetable,
  timetableDays,
  genreGroups,
  timetableLabels,
  selectionLabels,
  stagesPublished,
}: DetailLineupContentProps) {
  return (
    <LineupSelectionProvider activityLegacyId={activityLegacyId}>
      <LineupSelectionBar
        hint={selectionLabels.hint}
        countLabel={selectionLabels.count}
        clearLabel={selectionLabels.clear}
      />
      {showTimetable ? (
        <LineupTimetable days={timetableDays} labels={timetableLabels} />
      ) : (
        <LineupGenreBoard
          groups={genreGroups}
          locale={locale}
          stagesPublished={stagesPublished}
        />
      )}
    </LineupSelectionProvider>
  );
}
