import { NextRequest, NextResponse } from 'next/server';
import {
  ensureCsrfCookie,
  isSecureRequest,
} from '../../../../lib/auth/http';
import { auth } from '../../../../auth';
import { buildAuthCapabilities, capabilitiesForAnonymous } from '../../../../lib/auth/capabilities';

export const runtime = 'nodejs';

/**
 * Session probe + CSRF bootstrap.
 * Mutations (login/logout/limits) require the CSRF cookie minted here.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  const payload = session?.user?.email && session.user.id
    ? { signedIn: true as const, user: { id: session.user.id, email: session.user.email, emailVerified: true, emailVerifiedAt: null }, capabilities: buildAuthCapabilities(new Date().toISOString()) }
    : { signedIn: false as const, user: null, capabilities: capabilitiesForAnonymous() };
  const secure = isSecureRequest(request);
  const response = NextResponse.json(payload);

  ensureCsrfCookie(request, response, secure);

  return response;
}
