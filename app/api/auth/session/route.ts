import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '../../../../lib/auth/service';
import {
  ensureCsrfCookie,
  isSecureRequest,
  withAuthCookies,
} from '../../../../lib/auth/http';
import { RAVEN_SESSION_COOKIE } from '../../../../lib/auth/sessions';

export const runtime = 'nodejs';

/**
 * Session probe + CSRF bootstrap.
 * Mutations (login/logout/limits) require the CSRF cookie minted here.
 */
export async function GET(request: NextRequest) {
  const rawToken = request.cookies.get(RAVEN_SESSION_COOKIE)?.value;
  const session = await getSessionFromCookie(rawToken);
  const secure = isSecureRequest(request);
  const response = NextResponse.json(session);

  ensureCsrfCookie(request, response, secure);

  if (!session.signedIn && rawToken) {
    return withAuthCookies(response, { clearSession: true, secure });
  }

  return response;
}
