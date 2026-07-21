import { NextRequest, NextResponse } from 'next/server';
import { getApiBase, unwrapApiEnvelope } from '../../../../lib/api';
import {
  isSecureRequest,
  rejectUnsafeMutation,
} from '../../../../lib/auth/http';
import {
  mintNestTokenForAuthUser,
  RAVEN_BACKEND_TOKEN_COOKIE,
  readBoundBackendToken,
  setRavenBackendTokenCookie,
} from '../../../../lib/auth/raven-backend-token';
import { auth } from '../../../../auth';

export const runtime = 'nodejs';
export { RAVEN_BACKEND_TOKEN_COOKIE };

type SessionIdentity = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

async function sessionIdentity(): Promise<SessionIdentity | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  };
}

async function mintToken(identity: SessionIdentity) {
  return mintNestTokenForAuthUser({
    ...identity,
  });
}

function wantsForceRemint(request: NextRequest): boolean {
  const header = request.headers.get('x-raven-force-remint')?.trim();
  return header === '1' || header === 'true';
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const blocked = rejectUnsafeMutation(request);
    if (blocked) return blocked;
  }

  const identity = await sessionIdentity();
  if (!identity) {
    return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });
  }

  const forceRemint = wantsForceRemint(request);
  const boundCookie = readBoundBackendToken(request, identity.id);
  let existingToken = forceRemint ? undefined : boundCookie;
  let initialToken = existingToken
    ? { token: existingToken }
    : await mintToken(identity);
  // Prefer a bound cookie over a hard mint failure (e.g. missing INTERNAL_API_KEY).
  if ('error' in initialToken && boundCookie) {
    existingToken = boundCookie;
    initialToken = { token: boundCookie };
  }
  if ('error' in initialToken) return initialToken.error;

  const { path } = await context.params;
  const url = `${getApiBase()}/festival-squad/${path.map(encodeURIComponent).join('/')}${new URL(request.url).search}`;
  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text();
  const headers = {
    ...(request.headers.get('content-type')
      ? { 'content-type': request.headers.get('content-type')! }
      : {}),
  };

  let token = initialToken.token;
  let minted = !existingToken;
  let upstream = await fetch(url, {
    method: request.method,
    headers: {
      authorization: `Bearer ${token}`,
      ...headers,
    },
    body,
    cache: 'no-store',
  });

  // Remint once on auth failure (stale tv / deploy / unbound legacy cookie).
  if (upstream.status === 401 || upstream.status === 403) {
    const refreshed = await mintToken(identity);
    if ('error' in refreshed) return refreshed.error;
    token = refreshed.token;
    minted = true;
    upstream = await fetch(url, {
      method: request.method,
      headers: {
        authorization: `Bearer ${token}`,
        ...headers,
      },
      body,
      cache: 'no-store',
    });
  }

  const payload = await upstream.json().catch(() => null);
  // Nest wraps success as `{ code, message, data }`. Keep the browser contract
  // unwrapped so `data: null` (no Squad profile yet) stays a real JSON null.
  const responseBody =
    payload == null ? null : unwrapApiEnvelope(payload);

  const response = NextResponse.json(responseBody, {
    status: upstream.status,
    headers: { 'cache-control': 'no-store' },
  });
  if (minted) {
    setRavenBackendTokenCookie(response, token, isSecureRequest(request), identity.id);
  }
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
