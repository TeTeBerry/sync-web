import { NextRequest, NextResponse } from 'next/server';
import { logoutSession } from '../../../../lib/auth/service';
import {
  ensureCsrfCookie,
  isSecureRequest,
  rejectUnsafeMutation,
  withAuthCookies,
} from '../../../../lib/auth/http';
import { RAVEN_SESSION_COOKIE } from '../../../../lib/auth/sessions';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const blocked = rejectUnsafeMutation(request);
  if (blocked) return blocked;

  const secure = isSecureRequest(request);
  const rawToken = request.cookies.get(RAVEN_SESSION_COOKIE)?.value;
  await logoutSession(rawToken);

  const response = NextResponse.json({ ok: true, message: 'Signed out.' });
  ensureCsrfCookie(request, response, secure);
  return withAuthCookies(response, {
    clearSession: true,
    secure,
  });
}
