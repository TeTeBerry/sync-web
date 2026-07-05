import type { Activity } from './types';

/** Festival catalog dates follow China local calendar (UTC+8). */
export const CATALOG_TIMEZONE = 'Asia/Shanghai';

/**
 * Parse a (possibly free-form) activity `date` string and return the
 * last calendar day (YYYY-MM-DD) when the activity is considered over,
 * or `null` when it cannot be parsed (we then keep showing the activity).
 *
 * Supported formats:
 * - `2026-10-17 - 2026-10-18`  (ISO range, uses the latest date)
 * - `2026-10-17`               (single ISO date)
 * - `2026-01`                  (year-month, end of that month)
 * - `2026 Q4`                  (quarter, end of the quarter's last month)
 * - `2026`                     (bare year, end of December)
 * - `10/17-18`                 (MM/DD-DD, year = current year in catalog TZ)
 * - `06/25-28`                 (same)
 * - `07/17-19 & 07/24-26`     (multi-week range, uses the latest date)
 * - `12/11-13`                 (MM/DD-DD)
 * - `2026/10/17 - 2026/10/18`  (slash full-date range)
 */
export function getActivityEndYmd(activity: Activity): string | null {
  const raw = activity.date?.trim();
  if (!raw) return null;

  // 1) Multi-week like "07/17-19 & 07/24-26" — pick the last segment.
  const multiWeek = raw.split(/\s*&\s*/).filter(Boolean);
  const tail = multiWeek.length > 1 ? multiWeek[multiWeek.length - 1] : raw;

  // 2) Range with separator like "2026-10-17 - 2026-10-18" or
  //    "10/17-18" — take the last date token.
  const rangeParts = tail.split(/\s[-–—]+\s|\s*[-–—]+\s*/).filter(Boolean);
  const lastPart = rangeParts.length > 1 ? rangeParts[rangeParts.length - 1] : tail;

  // 3) ISO date: 2026-10-17 or 2026-10
  const isoMatch = lastPart.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = isoMatch[3] ? Number(isoMatch[3]) : lastDayOfMonth(year, month);
    return toYmd(year, month, day);
  }

  // 4) Slash full-date: 2026/10/17 or 2026/10
  const slashFullYear = lastPart.match(/^(\d{4})\/(\d{1,2})(?:\/(\d{1,2}))?$/);
  if (slashFullYear) {
    const year = Number(slashFullYear[1]);
    const month = Number(slashFullYear[2]);
    const day = slashFullYear[3] ? Number(slashFullYear[3]) : lastDayOfMonth(year, month);
    return toYmd(year, month, day);
  }

  // 5) MM/DD-DD like "10/17-18" — month + range of days, year = catalog year.
  const mmddRange = tail.match(/^(\d{1,2})\/(\d{1,2})-(\d{1,2})$/);
  if (mmddRange) {
    const year = currentYearInCatalogTz();
    const month = Number(mmddRange[1]);
    const dayEnd = Number(mmddRange[3]);
    return toYmd(year, month, dayEnd);
  }

  // 6) Single MM/DD like "10/17"
  const mmdd = lastPart.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mmdd) {
    const year = currentYearInCatalogTz();
    const month = Number(mmdd[1]);
    const day = Number(mmdd[2]);
    return toYmd(year, month, day);
  }

  // 7) Quarter like "2026 Q4"
  const quarterMatch = tail.match(/^(\d{4})\s*Q([1-4])$/i);
  if (quarterMatch) {
    const year = Number(quarterMatch[1]);
    const quarter = Number(quarterMatch[2]);
    const month = quarter * 3;
    return toYmd(year, month, lastDayOfMonth(year, month));
  }

  // 8) Bare year like "2026"
  const yearMatch = tail.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    return toYmd(year, 12, 31);
  }

  // 9) Fallback: let Date constructor try, then map to catalog calendar day.
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return formatYmdInCatalogTz(parsed);
  }

  return null;
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
