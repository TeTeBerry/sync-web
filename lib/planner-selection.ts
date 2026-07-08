import type { ScheduleDj, SchedulePerformance } from './api';
import { timetableSlotSelectionId } from './lineup-selection';

export function resolveSelectedArtistNames(
  selectionIds: string[],
  djs: ScheduleDj[],
  performances: SchedulePerformance[] = [],
): string[] {
  if (!selectionIds.length) return [];

  const djById = new Map(djs.map((dj) => [dj.id, dj.name]));
  const performanceBySlot = new Map(
    performances.map((performance) => [
      timetableSlotSelectionId(performance.artistId, performance.startMinutes),
      performance.artistName,
    ]),
  );

  const names: string[] = [];
  const seen = new Set<string>();

  for (const id of selectionIds) {
    const slotName = performanceBySlot.get(id);
    const artistId = id.includes('@') ? id.split('@')[0] : id;
    const name = slotName ?? djById.get(artistId) ?? djById.get(id);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }

  return names;
}
