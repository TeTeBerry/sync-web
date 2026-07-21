import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '../../../../lib/api';
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

  // Reuse a Nest bearer only when it was minted for this Auth.js user. A bare
  // cookie after Google re-login could belong to a previous account.
  const existingToken = readBoundBackendToken(request, identity.id);
  const initialToken = existingToken
    ? { token: existingToken }
    : await mintToken(identity);
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

  // Remint once on auth failure (stale tv / deploy), whether or not we started
  // from a cookie — covers racing Nest tokenVersion cache after account linking.
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

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
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
