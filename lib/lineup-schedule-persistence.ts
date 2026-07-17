import type { LineupClashState } from './lineup-clash-state';

export type SavedLineupSchedule = {
  activityLegacyId: number;
  selectionScope?: string;
  selectedIds: string[];
  clashState: LineupClashState;
  savedAt: string;
};

const STORAGE_PREFIX = 'raven-saved-lineup-schedule';

export function savedLineupScheduleKey(activityLegacyId: number, scope?: string): string {
  return `${STORAGE_PREFIX}:${activityLegacyId}${scope ? `:${scope}` : ''}`;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function clashState(value: unknown): LineupClashState {
  const raw = value && typeof value === 'object' ? value as Partial<LineupClashState> : {};
  return {
    deferredArtistIds: stringList(raw.deferredArtistIds),
    journeyArtistIds: stringList(raw.journeyArtistIds),
    resolutions: Array.isArray(raw.resolutions) ? raw.resolutions : [],
  };
}

export function normalizeSavedLineupSchedule(
  raw: unknown,
  expectedActivityLegacyId: number,
  expectedScope?: string,
): SavedLineupSchedule | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const activityLegacyId = Number(value.activityLegacyId);
  if (!Number.isFinite(activityLegacyId) || activityLegacyId !== expectedActivityLegacyId) return null;
  const selectionScope = typeof value.selectionScope === 'string' ? value.selectionScope : undefined;
  if ((selectionScope ?? undefined) !== (expectedScope ?? undefined)) return null;
  const selectedIds = stringList(value.selectedIds).slice(0, 500);
  if (!selectedIds.length) return null;
  const savedAt = typeof value.savedAt === 'string' && !Number.isNaN(Date.parse(value.savedAt))
    ? value.savedAt
    : new Date().toISOString();
  return {
    activityLegacyId,
    selectionScope,
    selectedIds,
    clashState: clashState(value.clashState),
    savedAt,
  };
}

export function readLocalSavedLineupSchedule(
  activityLegacyId: number,
  scope?: string,
): SavedLineupSchedule | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(savedLineupScheduleKey(activityLegacyId, scope));
    return raw ? normalizeSavedLineupSchedule(JSON.parse(raw), activityLegacyId, scope) : null;
  } catch {
    return null;
  }
}

export function writeLocalSavedLineupSchedule(schedule: SavedLineupSchedule): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      savedLineupScheduleKey(schedule.activityLegacyId, schedule.selectionScope),
      JSON.stringify(schedule),
    );
  } catch {
    // Storage is a graceful fallback, never a reason to interrupt a route.
  }
}
