import type { SchedulePerformance } from './api';
import { artistIdFromSelection, type LineupConflict } from './lineup-clash';
import { isInternalArtistId } from './lineup-artist-name';
import type { Activity } from './types';

export type NormalizedScheduleItem = {
  artistId: string;
  artistName: string;
  stageName: string;
  startTime?: string;
  endTime?: string;
  festivalDay?: string;
  startMinutes?: number;
  conflictGroupId?: string;
};

export type FestivalScheduleExportMeta = {
  festivalName: string;
  festivalSlug: string;
  venue?: string;
  timeZone: string;
  festivalDate?: string;
};

function isTimed(performance: SchedulePerformance | undefined): performance is SchedulePerformance {
  return Boolean(
    performance?.dateKey &&
      performance.startTime?.trim() &&
      performance.endTime?.trim() &&
      Number.isFinite(performance.startMinutes),
  );
}

function conflictForArtist(artistId: string, conflicts: LineupConflict[]): string | undefined {
  return conflicts.find(
    (conflict) =>
      conflict.type !== 'schedule-pending' &&
      (conflict.artistAId === artistId || conflict.artistBId === artistId),
  )?.id;
}

/** The current route can save a whole artist or one explicit timetable slot. */
export function normalizeSelectedSchedule(input: {
  selectedIds: string[];
  performances: SchedulePerformance[];
  conflicts: LineupConflict[];
  resolveArtistName: (artistId: string) => string;
  /** When true, skip picks with no matching bill row (cancelled acts). */
  dropOffBill?: boolean;
}): NormalizedScheduleItem[] {
  const onBill = input.dropOffBill
    ? new Set(input.performances.map((performance) => performance.artistId))
    : null;
  const seen = new Set<string>();
  const items: NormalizedScheduleItem[] = [];
  for (const rawId of input.selectedIds) {
    const artistId = artistIdFromSelection(rawId);
    if (onBill && !onBill.has(artistId)) {
      continue;
    }
    const slotMinute = rawId.includes('@') ? Number(rawId.slice(rawId.indexOf('@') + 1)) : undefined;
    const candidates = input.performances
      .filter((performance) => performance.artistId === artistId)
      .sort((a, b) => a.startMinutes - b.startMinutes);
    const performance = Number.isFinite(slotMinute)
      ? candidates.find((item) => item.startMinutes === slotMinute) ?? candidates[0]
      : candidates[0];
    const uniqueKey = performance
      ? `${artistId}@${performance.dateKey}@${performance.startMinutes}`
      : artistId;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);
    items.push({
      artistId,
      artistName:
        performance?.artistName?.trim() && !isInternalArtistId(performance.artistName)
          ? performance.artistName.trim()
          : input.resolveArtistName(artistId),
      stageName: performance?.stageLabel?.trim() || performance?.stage?.trim() || '',
      startTime: isTimed(performance) ? performance.startTime : undefined,
      endTime: isTimed(performance) ? performance.endTime : undefined,
      festivalDay: isTimed(performance) ? performance.dateKey : undefined,
      startMinutes: isTimed(performance) ? performance.startMinutes : undefined,
      conflictGroupId: conflictForArtist(artistId, input.conflicts),
    });
  }

  return items.sort((a, b) => {
    if (a.festivalDay && b.festivalDay && a.festivalDay !== b.festivalDay) {
      return a.festivalDay.localeCompare(b.festivalDay);
    }
    if (a.startMinutes != null && b.startMinutes != null) return a.startMinutes - b.startMinutes;
    if (a.startMinutes != null) return -1;
    if (b.startMinutes != null) return 1;
    return a.artistName.localeCompare(b.artistName);
  });
}

export function resolveFestivalTimeZone(activity: Activity): string {
  const key = `${activity.code ?? ''} ${activity.name} ${activity.title ?? ''} ${activity.location ?? ''} ${activity.city ?? ''}`.toLowerCase();
  if (/tomorrowland.*belgium|boom|antwerp|awakenings/.test(key)) return 'Europe/Brussels';
  if (/creamfields|liverpool|cheshire/.test(key)) return 'Europe/London';
  if (/ultra.*europe|split|croatia/.test(key)) return 'Europe/Zagreb';
  if (/untold.*romania|cluj|bucharest|罗马尼亚/.test(key)) return 'Europe/Bucharest';
  if (/amsterdam|netherlands|荷兰/.test(key)) return 'Europe/Amsterdam';
  if (/berlin|germany|德国/.test(key)) return 'Europe/Berlin';
  if (/paris|france|法国/.test(key)) return 'Europe/Paris';
  if (/madrid|ibiza|spain|西班牙/.test(key)) return 'Europe/Madrid';
  if (/lisbon|portugal|葡萄牙/.test(key)) return 'Europe/Lisbon';
  if (/budapest|hungary|匈牙利/.test(key)) return 'Europe/Budapest';
  if (/tomorrowland.*thailand|edc.*thailand|bangkok/.test(key)) return 'Asia/Bangkok';
  if (/ultra.*japan|tokyo|千叶|東京/.test(key)) return 'Asia/Tokyo';
  if (/edc.*korea|ultra.*korea|seoul|首尔/.test(key)) return 'Asia/Seoul';
  if (/taiwan|taipei|台北/.test(key)) return 'Asia/Taipei';
  if (/shanghai|上海|china|中国/.test(key)) return 'Asia/Shanghai';
  if (/edc.*orlando|ultra.*miami|lost lands|ohio|orlando|miami/.test(key)) return 'America/New_York';
  if (/las vegas|edc vegas/.test(key)) return 'America/Los_Angeles';
  if (/dubai|阿联酋/.test(key)) return 'Asia/Dubai';
  if (/riyadh|saudi|沙特/.test(key)) return 'Asia/Riyadh';
  if (/sydney|melbourne|australia|澳大利亚/.test(key)) return 'Australia/Sydney';
  return 'UTC';
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function parseClock(value: string): [number, number] | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? [hour, minute] : null;
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function zonedParts(epochMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(epochMs));
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour'), minute: read('minute'), second: read('second') };
}

/** Converts a festival-local wall clock into UTC, including DST changes. */
function localToUtc(date: string, clock: string, timeZone: string): Date | null {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const time = parseClock(clock);
  if (!match || !time) return null;
  const desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), time[0], time[1]);
  let guess = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = zonedParts(guess, timeZone);
    const observed = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    guess += desired - observed;
  }
  return new Date(guess);
}

function icsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function createScheduleIcs(input: {
  items: NormalizedScheduleItem[];
  meta: FestivalScheduleExportMeta;
}): string {
  const timed = input.items.filter((item) => item.festivalDay && item.startTime && item.endTime);
  const stamp = icsUtc(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Raven//Personal Festival Schedule//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-TIMEZONE:${input.meta.timeZone}`,
  ];

  for (const item of timed) {
    const start = localToUtc(item.festivalDay!, item.startTime!, input.meta.timeZone);
    const endDay = parseClock(item.endTime!) && parseClock(item.startTime!) &&
      (parseClock(item.endTime!)![0] * 60 + parseClock(item.endTime!)![1]) <=
        (parseClock(item.startTime!)![0] * 60 + parseClock(item.startTime!)![1])
      ? addDays(item.festivalDay!, 1)
      : item.festivalDay!;
    const end = localToUtc(endDay, item.endTime!, input.meta.timeZone);
    if (!start || !end) continue;
    const location = [item.stageName, input.meta.venue].filter(Boolean).join(', ');
    const description = [
      `Festival: ${input.meta.festivalName}`,
      `Stage: ${item.stageName || 'TBA'}`,
      'Source: Raven personal festival schedule',
    ].join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:raven-${input.meta.festivalSlug}-${item.artistId}-${item.festivalDay}-${item.startMinutes ?? 0}@raven`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsUtc(start)}`,
      `DTEND:${icsUtc(end)}`,
      `SUMMARY:${escapeIcs(`${item.artistName} — ${input.meta.festivalName}`)}`,
      `LOCATION:${escapeIcs(location)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR', '');
  return lines.join('\r\n');
}

export function downloadScheduleBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
