/**
 * TEMP_EMAIL_ONLY_AUTH_ENABLED gate for Raven temporary email sign-in.
 *
 * Development default: enabled when unset.
 * Production: must be explicitly set to "true".
 *
 * Client components should also set NEXT_PUBLIC_TEMP_EMAIL_ONLY_AUTH_ENABLED
 * so the unavailable state can render without a server round-trip.
 */
export function isTempEmailOnlyAuthEnabled(): boolean {
  const raw = (
    process.env.TEMP_EMAIL_ONLY_AUTH_ENABLED ??
    process.env.NEXT_PUBLIC_TEMP_EMAIL_ONLY_AUTH_ENABLED
  )
    ?.trim()
    .toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  return process.env.NODE_ENV !== 'production';
}

export const TEMP_EMAIL_AUTH_UNAVAILABLE_MESSAGE =
  'Email sign-in is temporarily unavailable. Please try again later.';

export const TEMP_EMAIL_AUTH_SUCCESS_MESSAGE = "You're signed in.";
