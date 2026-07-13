import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '../../../../lib/api';
import { getClientIp, isSecureRequest } from '../../../../lib/auth/http';
import {
  mintNestAccessToken,
  RAVEN_BACKEND_TOKEN_COOKIE,
  setRavenBackendTokenCookie,
} from '../../../../lib/auth/raven-backend-token';
import { getSessionFromCookie } from '../../../../lib/auth/service';
import { RAVEN_SESSION_COOKIE } from '../../../../lib/auth/sessions';

export const runtime = 'nodejs';

/** Server-side bridge: keeps the Nest JWT httpOnly while Lineup stays interactive. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ legacyId: string }> },
) {
  const session = await getSessionFromCookie(
    request.cookies.get(RAVEN_SESSION_COOKIE)?.value,
  );
  if (!session.signedIn || !session.user?.email) {
    return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });
  }

  let token = request.cookies.get(RAVEN_BACKEND_TOKEN_COOKIE)?.value;
  let minted: string | undefined;
  if (!token) {
    const nest = await mintNestAccessToken({
      email: session.user.email,
      clientIp: getClientIp(request),
    });
    if ('error' in nest) return nest.error;
    token = nest.token;
    minted = nest.token;
  }

  const { legacyId } = await context.params;
  const upstream = await fetch(
    `${getApiBase()}/personality-test/lineup/${encodeURIComponent(legacyId)}`,
    {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  );
  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
  });
  if (minted) setRavenBackendTokenCookie(response, minted, isSecureRequest(request));
  return response;
}
