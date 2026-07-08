import type { ActivitySchedule, SchedulePerformance } from './api';
import {
  formatTimetableGenreLabel,
  genreColorForBroad,
  MISSING_GENRE_LABEL,
  resolveCatalogGenreDisplay,
  resolveTimetableBroadGenre,
  sanitizeTimetableArtistName,
} from './lineup-genre';
import { localizeSessionLabel, localizeStageLabel } from './lineup-display';
import type { Locale } from './i18n';

export type LineupTimetableSlot = {
  artistId: string;
  artistName: string;
  genreLabel: string;
  genreColor?: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
};

export type LineupTimetableStage = {
  stageKey: string;
  stageLabel: string;
  slots: LineupTimetableSlot[];
};

export type LineupTimetableDay = {
  dateKey: string;
  label: string;
  bannerDateLabel: string;
  stages: LineupTimetableStage[];
};

function hasTimedStageSlot(performance: SchedulePerformance): boolean {
  const stage = performance.stageLabel?.trim() || performance.stage?.trim();
  const startTime = performance.startTime?.trim();
  return Boolean(stage && startTime);
}

export function hasLineupTimetable(schedule?: ActivitySchedule | null): boolean {
  if (!schedule?.schedulePublished) return false;
  const performances = schedule.performances ?? [];
  return performances.some(hasTimedStageSlot);
}

function toSlot(
  performance: SchedulePerformance,
  stageLabel: string,
  locale: Locale,
): LineupTimetableSlot {
  const broadGenre = resolveTimetableBroadGenre(performance);
  const catalogGenre = resolveCatalogGenreDisplay(
    {
      genre: performance.genre,
      genreLabel: performance.genreLabel,
    },
    locale,
  );
  const genreLabel =
    catalogGenre || formatTimetableGenreLabel(broadGenre) || MISSING_GENRE_LABEL;

  return {
    artistId: performance.artistId,
    artistName: sanitizeTimetableArtistName(performance.artistName, stageLabel),
    genreLabel,
    genreColor: broadGenre
      ? genreColorForBroad(broadGenre, performance.genreColor)
      : performance.genreColor,
    startTime: performance.startTime,
    endTime: performance.endTime,
    startMinutes: performance.startMinutes,
  };
}

function stageKeyFor(performance: SchedulePerformance): string {
  return performance.stage?.trim() || performance.stageLabel?.trim() || 'stage';
}

function stageLabelFor(performance: SchedulePerformance, locale: Locale): string {
  return localizeStageLabel(locale, performance.stageLabel) ?? '';
}

function stageSortMinutes(
  performances: SchedulePerformance[],
  stageKey: string,
): number {
  const first = performances
    .filter((performance) => stageKeyFor(performance) === stageKey)
    .sort((a, b) => a.startMinutes - b.startMinutes)[0];
  return first?.startMinutes ?? Number.MAX_SAFE_INTEGER;
}

export function buildLineupTimetable(
  schedule: ActivitySchedule,
  locale: Locale,
): LineupTimetableDay[] {
  const performances = (schedule.performances ?? []).filter(hasTimedStageSlot);
  if (!performances.length) return [];

  const byDateKey = new Map<string, SchedulePerformance[]>();
  for (const performance of performances) {
    const list = byDateKey.get(performance.dateKey) ?? [];
    list.push(performance);
    byDateKey.set(performance.dateKey, list);
  }

  const sessionMeta = new Map(
    (schedule.sessions ?? []).map((session) => [session.dateKey, session]),
  );

  const dateKeys =
    schedule.sessions?.map((session) => session.dateKey) ??
    [...byDateKey.keys()];

  return dateKeys
    .map((dateKey) => {
      const dayPerformances = [...(byDateKey.get(dateKey) ?? [])].sort(
        (a, b) => a.startMinutes - b.startMinutes,
      );
      if (!dayPerformances.length) return null;

      const stageKeys = [
        ...new Set(dayPerformances.map((performance) => stageKeyFor(performance))),
      ].sort(
        (a, b) =>
          stageSortMinutes(dayPerformances, a) - stageSortMinutes(dayPerformances, b),
      );

      const stages: LineupTimetableStage[] = stageKeys
        .map((stageKey) => {
          const stagePerformances = dayPerformances
            .filter((performance) => stageKeyFor(performance) === stageKey)
            .sort((a, b) => a.startMinutes - b.startMinutes);
          const label = stageLabelFor(stagePerformances[0]!, locale);
          if (!label) {
            return null;
          }

          return {
            stageKey,
            stageLabel: label,
            slots: stagePerformances.map((performance) =>
              toSlot(performance, label, locale),
            ),
          };
        })
        .filter((stage): stage is LineupTimetableStage => stage !== null);

      const session = sessionMeta.get(dateKey);
      const rawLabel = session?.label ?? dayPerformances[0]?.dateLabel ?? dateKey;
      const rawBanner =
        session?.bannerDateLabel ?? session?.label ?? dayPerformances[0]?.dateLabel ?? dateKey;
      return {
        dateKey,
        label: localizeSessionLabel(locale, rawLabel),
        bannerDateLabel: localizeSessionLabel(locale, rawBanner),
        stages,
      };
    })
    .filter((day): day is LineupTimetableDay => day !== null);
}

export function formatLineupTimeRange(startTime: string, endTime: string): string {
  const start = startTime.trim();
  const end = endTime.trim();
  if (!start && !end) return '';
  if (!end || start === end) return start;
  return `${start} – ${end}`;
}

export function countTimetableStats(days: LineupTimetableDay[]): {
  setCount: number;
  stageCount: number;
} {
  const stageNames = new Set<string>();
  let setCount = 0;

  for (const day of days) {
    for (const stage of day.stages) {
      const name = stage.stageLabel.trim().toLowerCase();
      if (name) stageNames.add(name);
      setCount += stage.slots.length;
    }
  }

  return {
    setCount,
    stageCount: stageNames.size,
  };
}
