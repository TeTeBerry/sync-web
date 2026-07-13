export const LINEUP_SELECTION_STORAGE_PREFIX = "sync-lineup-picks";

export function lineupSelectionStorageKey(
  activityLegacyId: number,
  scope?: string,
): string {
  return `${LINEUP_SELECTION_STORAGE_PREFIX}:${activityLegacyId}${scope ? `:${scope}` : ""}`;
}

export function readLineupSelection(
  activityLegacyId: number,
  scope?: string,
): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(
      lineupSelectionStorageKey(activityLegacyId, scope),
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    );
  } catch {
    return [];
  }
}

export function writeLineupSelection(
  activityLegacyId: number,
  ids: string[],
  scope?: string,
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      lineupSelectionStorageKey(activityLegacyId, scope),
      JSON.stringify(ids),
    );
  } catch {
    // localStorage unavailable
  }
}

export function timetableSlotSelectionId(
  artistId: string,
  startMinutes: number,
): string {
  return `${artistId}@${startMinutes}`;
}
