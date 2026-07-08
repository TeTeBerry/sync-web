import type { Activity } from './types';

/** Festival catalog dates follow China local calendar (UTC+8). */
export const CATALOG_TIMEZONE = 'Asia/Shanghai';

function normalizeYmd(value: string): string | null {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    return toYmd(Number(year), Number(month), Number(day));
  }
  return null;
}

/**
 * Parse a (possibly free-form) activity `date` string and return the
 * first calendar day (YYYY-MM-DD), or `null` when it cannot be parsed.
 */
export function parseActivityStartYmd(raw?: string): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const multiWeek = value.split(/\s*&\s*/).filter(Boolean);
  const head = multiWeek[0] ?? value;

  const rangeParts = head.split(/\s[-–—]+\s|\s*[-–—]+\s*/).filter(Boolean);
  const firstPart = rangeParts[0] ?? head;

  const isoMatch = firstPart.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = isoMatch[3] ? Number(isoMatch[3]) : 1;
    return toYmd(year, month, day);
  }

  const slashFullYear = firstPart.match(/^(\d{4})\/(\d{1,2})(?:\/(\d{1,2}))?$/);
  if (slashFullYear) {
    const year = Number(slashFullYear[1]);
    const month = Number(slashFullYear[2]);
    const day = slashFullYear[3] ? Number(slashFullYear[3]) : 1;
    return toYmd(year, month, day);
  }

  const mmddRange = head.match(/^(\d{1,2})\/(\d{1,2})-(\d{1,2})$/);
  if (mmddRange) {
    const year = currentYearInCatalogTz();
    const month = Number(mmddRange[1]);
    const dayStart = Number(mmddRange[2]);
    return toYmd(year, month, dayStart);
  }

  const mmdd = firstPart.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mmdd) {
    const year = currentYearInCatalogTz();
    const month = Number(mmdd[1]);
    const day = Number(mmdd[2]);
    return toYmd(year, month, day);
  }

  const quarterMatch = head.match(/^(\d{4})\s*Q([1-4])$/i);
  if (quarterMatch) {
    const year = Number(quarterMatch[1]);
    const quarter = Number(quarterMatch[2]);
    const month = (quarter - 1) * 3 + 1;
    return toYmd(year, month, 1);
  }

  const yearMatch = head.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    return toYmd(year, 1, 1);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return formatYmdInCatalogTz(parsed);
  }

  return null;
}

/**
 * Parse a (possibly free-form) activity `date` string and return the
 * last calendar day (YYYY-MM-DD) when the activity is considered over,
 * or `null` when it cannot be parsed (we then keep showing the activity).
 */
export function parseActivityEndYmd(raw?: string): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const multiWeek = value.split(/\s*&\s*/).filter(Boolean);
  const tail = multiWeek.length > 1 ? multiWeek[multiWeek.length - 1] : value;

  const rangeParts = tail.split(/\s[-–—]+\s|\s*[-–—]+\s*/).filter(Boolean);
  const lastPart = rangeParts.length > 1 ? rangeParts[rangeParts.length - 1] : tail;

  const isoMatch = lastPart.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = isoMatch[3] ? Number(isoMatch[3]) : lastDayOfMonth(year, month);
    return toYmd(year, month, day);
  }

  const slashFullYear = lastPart.match(/^(\d{4})\/(\d{1,2})(?:\/(\d{1,2}))?$/);
  if (slashFullYear) {
    const year = Number(slashFullYear[1]);
    const month = Number(slashFullYear[2]);
    const day = slashFullYear[3] ? Number(slashFullYear[3]) : lastDayOfMonth(year, month);
    return toYmd(year, month, day);
  }

  const mmddRange = tail.match(/^(\d{1,2})\/(\d{1,2})-(\d{1,2})$/);
  if (mmddRange) {
    const year = currentYearInCatalogTz();
    const month = Number(mmddRange[1]);
    const dayEnd = Number(mmddRange[3]);
    return toYmd(year, month, dayEnd);
  }

  const mmdd = lastPart.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mmdd) {
    const year = currentYearInCatalogTz();
    const month = Number(mmdd[1]);
    const day = Number(mmdd[2]);
    return toYmd(year, month, day);
  }

  const quarterMatch = tail.match(/^(\d{4})\s*Q([1-4])$/i);
  if (quarterMatch) {
    const year = Number(quarterMatch[1]);
    const quarter = Number(quarterMatch[2]);
    const month = quarter * 3;
    return toYmd(year, month, lastDayOfMonth(year, month));
  }

  const yearMatch = tail.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    return toYmd(year, 12, 31);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return formatYmdInCatalogTz(parsed);
  }

  return null;
}

export function getActivityStartYmd(activity: Activity): string | null {
  const structured = activity.startDate ? normalizeYmd(activity.startDate) : null;
  if (structured) return structured;
  return parseActivityStartYmd(activity.date);
}

export function getActivityEndYmd(activity: Activity): string | null {
  const structured = activity.endDate ? normalizeYmd(activity.endDate) : null;
  if (structured) return structured;
  return parseActivityEndYmd(activity.date);
}

export function getActivityDateRange(
  activity: Activity,
): { start: string; end: string } | null {
  const start = getActivityStartYmd(activity);
  const end = getActivityEndYmd(activity);
  if (!start || !end) return null;
  return { start, end };
}

/** schema.org Event dates expect ISO 8601; catalog dates are calendar days in UTC. */
export function ymdToSchemaIsoDate(ymd: string): string {
  const normalized = normalizeYmd(ymd);
  if (!normalized) return ymd;
  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

/** YYYY-MM-DD in the catalog timezone (China, UTC+8). */
export function formatYmdInCatalogTz(
  date: Date,
  timeZone: string = CATALOG_TIMEZONE,
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function currentYearInCatalogTz(): number {
  return Number(formatYmdInCatalogTz(new Date()).slice(0, 4));
}

function toYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * An activity is expired when its last calendar day is strictly before
 * "today" in the catalog timezone (Asia/Shanghai). Unparseable dates are kept.
 */
export function isActivityExpired(activity: Activity, reference: Date = new Date()): boolean {
  const endYmd = getActivityEndYmd(activity);
  if (!endYmd) return false;
  const todayYmd = formatYmdInCatalogTz(reference);
  return endYmd < todayYmd;
}
