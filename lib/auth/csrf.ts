import { createCsrfToken, RAVEN_CSRF_COOKIE, timingSafeEqualString } from './crypto';

/**
 * Double-submit CSRF for cookie-authenticated mutations.
 * Cookie is readable by JS; header must match.
 */
export function mintCsrfToken(): string {
  return createCsrfToken();
}

export function csrfCookieOptions(secure: boolean) {
  return {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function validateCsrf(
  cookieToken: string | undefined,
  headerToken: string | undefined,
): boolean {
  if (!cookieToken || !headerToken) return false;
  return timingSafeEqualString(cookieToken, headerToken);
}

export function readCsrfFromRequest(headers: Headers, cookieValue?: string): {
  cookieToken: string | undefined;
  headerToken: string | undefined;
} {
  return {
    cookieToken: cookieValue,
    headerToken:
      headers.get('x-csrf-token')?.trim() ||
      headers.get('x-raven-csrf')?.trim() ||
      undefined,
  };
}

export { RAVEN_CSRF_COOKIE };
