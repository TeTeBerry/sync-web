import { NextRequest, NextResponse } from 'next/server';
import { resolvePlatformClientIp } from '../raven-proxy-identity';
import {
  csrfCookieOptions,
  mintCsrfToken,
  RAVEN_CSRF_COOKIE,
  validateCsrf,
} from './csrf';
import { RAVEN_SESSION_COOKIE, sessionCookieOptions } from './sessions';

export function isSecureRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  const proto = request.headers.get('x-forwarded-proto');
  return proto === 'https';
}

export function getClientIp(request: NextRequest): string {
  return (
    resolvePlatformClientIp(request) ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

/**
 * Mutations must include a same-origin Origin header.
 * Missing Origin is rejected — do not rely on CSRF alone for login CSRF defense.
 */
export function assertSameOriginMutation(request: NextRequest): boolean {
  const origin = request.headers.get('origin')?.trim();
  if (!origin) return false;
  try {
    return origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

/** Strict CSRF: cookie and header must both be present and match. */
export function requireCsrf(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(RAVEN_CSRF_COOKIE)?.value;
  const headerToken =
    request.headers.get('x-csrf-token')?.trim() ||
    request.headers.get('x-raven-csrf')?.trim() ||
    undefined;
  return validateCsrf(cookieToken, headerToken);
}

/**
 * Shared guard for cookie-auth mutations.
 * Returns an error response when Origin or CSRF fails; otherwise null.
 */
export function rejectUnsafeMutation(request: NextRequest): NextResponse | null {
  if (!assertSameOriginMutation(request)) {
    return jsonError(403, 'Invalid request origin.', 'csrf');
  }
  if (!requireCsrf(request)) {
    return jsonError(403, 'Invalid CSRF token.', 'csrf');
  }
  return null;
}

export function withAuthCookies(
  response: NextResponse,
  options: {
    sessionToken?: string | null;
    clearSession?: boolean;
    ensureCsrf?: boolean;
    secure: boolean;
  },
): NextResponse {
  if (options.clearSession) {
    response.cookies.set(RAVEN_SESSION_COOKIE, '', {
      ...sessionCookieOptions(options.secure),
      maxAge: 0,
    });
  } else if (options.sessionToken) {
    response.cookies.set(
      RAVEN_SESSION_COOKIE,
      options.sessionToken,
      sessionCookieOptions(options.secure),
    );
  }

  if (options.ensureCsrf) {
    const existing =
      response.cookies.get(RAVEN_CSRF_COOKIE)?.value ||
      // Prefer rotating only when absent; callers may already set one.
      undefined;
    if (!existing) {
      response.cookies.set(
        RAVEN_CSRF_COOKIE,
        mintCsrfToken(),
        csrfCookieOptions(options.secure),
      );
    }
  }

  return response;
}

export function ensureCsrfCookie(
  request: NextRequest,
  response: NextResponse,
  secure: boolean,
): string {
  const existing = request.cookies.get(RAVEN_CSRF_COOKIE)?.value;
  if (existing) {
    response.cookies.set(RAVEN_CSRF_COOKIE, existing, csrfCookieOptions(secure));
    return existing;
  }
  const token = mintCsrfToken();
  response.cookies.set(RAVEN_CSRF_COOKIE, token, csrfCookieOptions(secure));
  return token;
}

export function jsonError(
  status: number,
  message: string,
  code?: string,
): NextResponse {
  return NextResponse.json({ message, error: message, code }, { status });
}
