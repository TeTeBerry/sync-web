import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { getApiBase, unwrapApiEnvelope } from '../../../../lib/api';
import { isSecureRequest, jsonError, rejectUnsafeMutation } from '../../../../lib/auth/http';
import {
  mintNestTokenForAuthUser,
  readBoundBackendToken,
  setRavenBackendTokenCookie,
} from '../../../../lib/auth/raven-backend-token';

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
  return mintNestTokenForAuthUser({ ...identity });
}

async function authorizedFetch(
  request: NextRequest,
  init: { method: string; body?: string },
) {
  const identity = await sessionIdentity();
  if (!identity) return { error: jsonError(401, 'Sign in required.', 'unauthorized') as NextResponse };

  const existingToken = readBoundBackendToken(request, identity.id);
  let token = existingToken;
  let minted = false;
  if (!token) {
    const mintedToken = await mintToken(identity);
    if ('error' in mintedToken) return { error: mintedToken.error };
    token = mintedToken.token;
    minted = true;
  }

  const url = `${getApiBase()}/me/profile`;
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    ...(init.body ? { 'content-type': 'application/json' } : {}),
  };

  let upstream = await fetch(url, {
    method: init.method,
    headers,
    body: init.body,
    cache: 'no-store',
  });

  if (upstream.status === 401 || upstream.status === 403) {
    const refreshed = await mintToken(identity);
    if ('error' in refreshed) return { error: refreshed.error };
    token = refreshed.token;
    minted = true;
    upstream = await fetch(url, {
      method: init.method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
      },
      body: init.body,
      cache: 'no-store',
    });
  }

  return { upstream, token, minted, identity };
}

function passThrough(
  upstream: Response,
  payload: unknown,
  minted: boolean,
  token: string,
  identity: SessionIdentity,
  request: NextRequest,
) {
  const body = payload == null ? null : unwrapApiEnvelope(payload);
  const response = NextResponse.json(body, {
    status: upstream.status,
    headers: { 'cache-control': 'no-store' },
  });
  if (minted) {
    setRavenBackendTokenCookie(
      response,
      token,
      isSecureRequest(request),
      identity.id,
    );
  }
  return response;
}

export async function GET(request: NextRequest) {
  const result = await authorizedFetch(request, { method: 'GET' });
  if ('error' in result) return result.error;
  const payload = await result.upstream.json().catch(() => null);
  return passThrough(
    result.upstream,
    payload,
    result.minted,
    result.token,
    result.identity,
    request,
  );
}

export async function PATCH(request: NextRequest) {
  const blocked = rejectUnsafeMutation(request);
  if (blocked) return blocked;
  const body = await request.text();
  const result = await authorizedFetch(request, { method: 'PATCH', body });
  if ('error' in result) return result.error;
  const payload = await result.upstream.json().catch(() => null);
  return passThrough(
    result.upstream,
    payload,
    result.minted,
    result.token,
    result.identity,
    request,
  );
}
