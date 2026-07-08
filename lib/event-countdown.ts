import { CATALOG_TIMEZONE, formatYmdInCatalogTz } from './activity-date';

export type EventCountdownPhase = 'upcoming' | 'live' | 'ended';

export type EventCountdownUnits = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type EventCountdownSnapshot = {
  phase: EventCountdownPhase;
  units: EventCountdownUnits | null;
  targetStartMs: number | null;
  targetEndMs: number | null;
};

type ZonedParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

function readZonedParts(instant: number, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(instant));

  const map = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour === '24' ? '00' : map.hour,
    minute: map.minute,
    second: map.second,
  };
}

function ymdFromParts(parts: Pick<ZonedParts, 'year' | 'month' | 'day'>): string {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Instant (ms) for 00:00:00.000 on a calendar day in `timeZone`. */
export function instantAtStartOfYmd(ymd: string, timeZone: string = CATALOG_TIMEZONE): number {
  const [year, month, day] = ymd.split('-').map(Number);
  let lo = Date.UTC(year, month - 1, day - 1, 0, 0, 0);
  let hi = Date.UTC(year, month - 1, day + 2, 0, 0, 0);

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const zonedYmd = ymdFromParts(readZonedParts(mid, timeZone));
    if (zonedYmd < ymd) lo = mid + 1;
    else hi = mid;
  }

  return lo;
}

/** Instant (ms) for 23:59:59.999 on a calendar day in `timeZone`. */
export function instantAtEndOfYmd(ymd: string, timeZone: string = CATALOG_TIMEZONE): number {
  const [year, month, day] = ymd.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0));
  const nextYmd = formatYmdInCatalogTz(probe, timeZone);
  return instantAtStartOfYmd(nextYmd, timeZone) - 1;
}

export function splitCountdownUnits(totalMs: number): EventCountdownUnits {
  const clamped = Math.max(0, totalMs);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

export function computeEventCountdown(
  eventStartDate: string | null | undefined,
  eventEndDate: string | null | undefined,
  referenceMs: number = Date.now(),
  timeZone: string = CATALOG_TIMEZONE,
): EventCountdownSnapshot | null {
  if (!eventStartDate) return null;

  const startMs = instantAtStartOfYmd(eventStartDate, timeZone);
  const endYmd = eventEndDate ?? eventStartDate;
  const endMs = instantAtEndOfYmd(endYmd, timeZone);

  if (referenceMs > endMs) {
    return {
      phase: 'ended',
      units: null,
      targetStartMs: startMs,
      targetEndMs: endMs,
    };
  }

  if (referenceMs >= startMs) {
    return {
      phase: 'live',
      units: null,
      targetStartMs: startMs,
      targetEndMs: endMs,
    };
  }

  return {
    phase: 'upcoming',
    units: splitCountdownUnits(startMs - referenceMs),
    targetStartMs: startMs,
    targetEndMs: endMs,
  };
}

export function padCountdownUnit(value: number): string {
  return String(value).padStart(2, '0');
}
