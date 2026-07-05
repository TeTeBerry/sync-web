export const LINEUP_SELECTION_STORAGE_PREFIX = 'sync-lineup-picks';

export function lineupSelectionStorageKey(activityLegacyId: number): string {
  return `${LINEUP_SELECTION_STORAGE_PREFIX}:${activityLegacyId}`;
}

export function readLineupSelection(activityLegacyId: number): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(lineupSelectionStorageKey(activityLegacyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
  } catch {
    return [];
  }
}

export function writeLineupSelection(activityLegacyId: number, ids: string[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      lineupSelectionStorageKey(activityLegacyId),
      JSON.stringify(ids),
    );
  } catch {
    // localStorage unavailable
  }
}

export function timetableSlotSelectionId(artistId: string, startMinutes: number): string {
  return `${artistId}@${startMinutes}`;
}
