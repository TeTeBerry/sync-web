import type { Activity } from './types';

/**
 * Parse a (possibly free-form) activity `date` string and return the
 * end-of-day Date when the activity is considered over, or `null` when
 * it cannot be parsed (we then keep showing the activity rather than hide it).
 *
 * Supported formats:
 * - `2026-10-17 - 2026-10-18`  (ISO range, uses the latest date)
 * - `2026-10-17`               (single ISO date)
 * - `2026-01`                  (year-month, end of that month)
 * - `2026 Q4`                  (quarter, end of the quarter's last month)
 * - `2026`                     (bare year, end of December)
 * - `10/17-18`                 (MM/DD-DD, year = current year)
 * - `06/25-28`                 (same)
 * - `07/17-19 & 07/24-26`     (multi-week range, uses the latest date)
 * - `12/11-13`                 (MM/DD-DD)
 * - `2026/10/17 - 2026/10/18`  (slash full-date range)
 */
export function getActivityEndDate(activity: Activity): Date | null {
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
    return endOfDay(new Date(year, month - 1, day));
  }

  // 4) Slash full-date: 2026/10/17 or 2026/10
  const slashFullYear = lastPart.match(/^(\d{4})\/(\d{1,2})(?:\/(\d{1,2}))?$/);
  if (slashFullYear) {
    const year = Number(slashFullYear[1]);
    const month = Number(slashFullYear[2]);
    const day = slashFullYear[3] ? Number(slashFullYear[3]) : lastDayOfMonth(year, month);
    return endOfDay(new Date(year, month - 1, day));
  }

  // 5) MM/DD-DD like "10/17-18" — month + range of days, year = current year.
  //    Needs to re-parse the tail (not lastPart, which may be just "18").
  const mmddRange = tail.match(/^(\d{1,2})\/(\d{1,2})-(\d{1,2})$/);
  if (mmddRange) {
    const year = currentYear();
    const month = Number(mmddRange[1]);
    const dayEnd = Number(mmddRange[3]);
    return endOfDay(new Date(year, month - 1, dayEnd));
  }

  // 6) Single MM/DD like "10/17"
  const mmdd = lastPart.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mmdd) {
    const year = currentYear();
    const month = Number(mmdd[1]);
    const day = Number(mmdd[2]);
    return endOfDay(new Date(year, month - 1, day));
  }

  // 7) Quarter like "2026 Q4"
  const quarterMatch = tail.match(/^(\d{4})\s*Q([1-4])$/i);
  if (quarterMatch) {
    const year = Number(quarterMatch[1]);
    const quarter = Number(quarterMatch[2]);
    const month = quarter * 3;
    return endOfDay(new Date(year, month - 1, lastDayOfMonth(year, month)));
  }

  // 8) Bare year like "2026"
  const yearMatch = tail.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    return endOfDay(new Date(year, 11, 31));
  }

  // 9) Fallback: let Date constructor try
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return endOfDay(parsed);
  }

  return null;
}

/** Use current year for MM/DD formats without an explicit year. */
function currentYear(): number {
  return new Date().getFullYear();
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

/**
 * An activity is considered expired when its end date is strictly before the
 * start of "today" (local time). Activities without a parseable date are kept.
 */
export function isActivityExpired(activity: Activity, reference: Date = new Date()): boolean {
  const end = getActivityEndDate(activity);
  if (!end) return false;
  const startOfToday = startOfDay(reference);
  return end.getTime() < startOfToday.getTime();
}
