export const LINEUP_SELECTION_STORAGE_PREFIX = "sync-lineup-picks";

/** Tomorrowland Belgium — only festival we auto-drop cancelled picks for (set times already published). */
export const TOMORROWLAND_BELGIUM_ACTIVITY_LEGACY_ID = 7;

export function lineupSelectionStorageKey(
  activityLegacyId: number,
  scope?: string,
): string {
  return `${LINEUP_SELECTION_STORAGE_PREFIX}:${activityLegacyId}${scope ? `:${scope}` : ""}`;
}

export function artistIdFromSelectionId(raw: string): string {
  return raw.includes("@") ? raw.slice(0, raw.indexOf("@")) : raw;
}

/**
 * When a festival timetable is live, drop saved picks that are no longer on the bill
 * (e.g. cancelled duo "Dimitri Vegas & Like Mike" on TML Belgium).
 * Keeps true "waiting on set time" artists only when they still appear in performances
 * without times — those stay selected.
 */
export function pruneOffBillLineupSelection(input: {
  activityLegacyId: number;
  selectedIds: string[];
  performanceArtistIds: Iterable<string>;
  schedulePublished: boolean;
}): { kept: string[]; removed: string[] } {
  const { selectedIds, schedulePublished, activityLegacyId } = input;
  if (
    activityLegacyId !== TOMORROWLAND_BELGIUM_ACTIVITY_LEGACY_ID ||
    !schedulePublished
  ) {
    return { kept: [...selectedIds], removed: [] };
  }

  const onBill = new Set(
    [...input.performanceArtistIds].map((id) => id.trim()).filter(Boolean),
  );
  if (!onBill.size) {
    return { kept: [...selectedIds], removed: [] };
  }

  const kept: string[] = [];
  const removed: string[] = [];
  for (const id of selectedIds) {
    const artistId = artistIdFromSelectionId(id);
    if (onBill.has(artistId)) {
      kept.push(id);
    } else {
      removed.push(id);
    }
  }
  return { kept, removed };
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
