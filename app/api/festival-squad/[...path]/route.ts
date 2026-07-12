import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '../../../../lib/api';
import {
  getClientIp,
  isSecureRequest,
  rejectUnsafeMutation,
} from '../../../../lib/auth/http';
import {
  mintNestAccessToken,
  RAVEN_BACKEND_TOKEN_COOKIE,
  setRavenBackendTokenCookie,
} from '../../../../lib/auth/raven-backend-token';
import { getSessionFromCookie } from '../../../../lib/auth/service';
import { RAVEN_SESSION_COOKIE } from '../../../../lib/auth/sessions';

export const runtime = 'nodejs';
export { RAVEN_BACKEND_TOKEN_COOKIE };

async function resolveBackendToken(
  request: NextRequest,
): Promise<{ token: string; minted?: string } | { error: NextResponse }> {
  const session = await getSessionFromCookie(
    request.cookies.get(RAVEN_SESSION_COOKIE)?.value,
  );
  if (!session.signedIn || !session.user?.email) {
    return {
      error: NextResponse.json({ message: 'Sign in required.' }, { status: 401 }),
    };
  }

  const existing = request.cookies.get(RAVEN_BACKEND_TOKEN_COOKIE)?.value;
  if (existing) return { token: existing };

  // Migrate older Raven sessions that predate the Nest JWT cookie.
  const nest = await mintNestAccessToken({
    email: session.user.email,
    clientIp: getClientIp(request),
  });
  if ('error' in nest) {
    return {
      error: NextResponse.json(
        { message: 'Sign in required. Please sign in again.' },
        { status: 401 },
      ),
    };
  }
  return { token: nest.token, minted: nest.token };
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const blocked = rejectUnsafeMutation(request);
    if (blocked) return blocked;
  }

  const auth = await resolveBackendToken(request);
  if ('error' in auth) return auth.error;

  const { path } = await context.params;
  const url = `${getApiBase()}/festival-squad/${path.map(encodeURIComponent).join('/')}${new URL(request.url).search}`;
  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text();
  const upstream = await fetch(url, {
    method: request.method,
    headers: {
      authorization: `Bearer ${auth.token}`,
      ...(request.headers.get('content-type')
        ? { 'content-type': request.headers.get('content-type')! }
        : {}),
    },
    body,
    cache: 'no-store',
  });

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
  });
  if (auth.minted) {
    setRavenBackendTokenCookie(response, auth.minted, isSecureRequest(request));
  }
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
