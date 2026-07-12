import { NextRequest, NextResponse } from 'next/server';
import {
  AuthServiceError,
  loginWithEmail,
} from '../../../../lib/auth/service';
import {
  ensureCsrfCookie,
  getClientIp,
  isSecureRequest,
  jsonError,
  rejectUnsafeMutation,
  withAuthCookies,
} from '../../../../lib/auth/http';
import {
  isTempEmailOnlyAuthEnabled,
  TEMP_EMAIL_AUTH_UNAVAILABLE_MESSAGE,
} from '../../../../lib/auth/config';
import { RAVEN_SESSION_COOKIE } from '../../../../lib/auth/sessions';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isTempEmailOnlyAuthEnabled()) {
    return jsonError(503, TEMP_EMAIL_AUTH_UNAVAILABLE_MESSAGE, 'unavailable');
  }

  const blocked = rejectUnsafeMutation(request);
  if (blocked) return blocked;

  const secure = isSecureRequest(request);

  let body: { email?: string; returnUrl?: string; intendedAction?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError(400, 'Invalid request body.', 'invalid_email');
  }

  try {
    const previous = request.cookies.get(RAVEN_SESSION_COOKIE)?.value;
    const { result, rawToken } = await loginWithEmail({
      email: body.email ?? '',
      returnUrl: body.returnUrl,
      intendedAction: body.intendedAction,
      clientIp: getClientIp(request),
      previousSessionToken: previous,
    });

    const response = NextResponse.json(result);
    ensureCsrfCookie(request, response, secure);
    return withAuthCookies(response, {
      sessionToken: rawToken,
      secure,
    });
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return jsonError(error.status, error.message, error.code);
    }
    console.error('[auth] email-login failed', error);
    return jsonError(500, 'Sign-in failed. Please try again.', 'server');
  }
}
