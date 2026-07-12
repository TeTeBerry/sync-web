/**
 * Configurable temporary limits for unverified email sessions.
 * Do not hard-code these in UI components — import from here.
 */

function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

export function getUnverifiedAuthLimits() {
  return {
    /** Max new connection requests per calendar day (UTC). */
    maxConnectionRequestsPerDay: readPositiveInt(
      process.env.TEMP_AUTH_MAX_CONNECTION_REQUESTS_PER_DAY,
      5,
    ),
    /** Max private profile detail views per rolling hour. */
    maxPrivateProfileViewsPerHour: readPositiveInt(
      process.env.TEMP_AUTH_MAX_PRIVATE_PROFILE_VIEWS_PER_HOUR,
      20,
    ),
    /** Bulk / multi-recipient connection requests are disabled. */
    allowBulkConnectionRequests: false,
    /** Automatic contact-info exchange is disabled until verification. */
    allowAutomaticContactExchange: false,
  };
}

export type UnverifiedAuthLimits = ReturnType<typeof getUnverifiedAuthLimits>;
