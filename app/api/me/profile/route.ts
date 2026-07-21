import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { getApiBase } from '../../../../lib/api';
import { isSecureRequest, jsonError, rejectUnsafeMutation } from '../../../../lib/auth/http';
import {
  mintNestTokenForAuthUser,
  readBoundBackendToken,
  setRavenBackendTokenCookie,
} from '../../../../lib/auth/raven-backend-token';

type SessionToken = {
  token: string;
  authUserId: string;
  minted: boolean;
};

async function tokenForSession(request: NextRequest): Promise<SessionToken | { error: NextResponse } | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  const existing = readBoundBackendToken(request, session.user.id);
  if (existing) return { token: existing, authUserId: session.user.id, minted: false };
  const minted = await mintNestTokenForAuthUser({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  });
  if ('error' in minted) return minted;
  return { token: minted.token, authUserId: session.user.id, minted: true };
}

export async function GET(request: NextRequest) {
  const authToken = await tokenForSession(request);
  if (!authToken) return jsonError(401, 'Sign in required.', 'unauthorized');
  if ('error' in authToken) return authToken.error;
  const upstream = await fetch(`${getApiBase()}/me/profile`, {
    headers: { authorization: `Bearer ${authToken.token}` },
    cache: 'no-store',
  });
  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
  });
  if (authToken.minted) {
    setRavenBackendTokenCookie(response, authToken.token, isSecureRequest(request), authToken.authUserId);
  }
  return response;
}

export async function PATCH(request: NextRequest) {
  const blocked = rejectUnsafeMutation(request);
  if (blocked) return blocked;
  const authToken = await tokenForSession(request);
  if (!authToken) return jsonError(401, 'Sign in required.', 'unauthorized');
  if ('error' in authToken) return authToken.error;
  const body = await request.text();
  const upstream = await fetch(`${getApiBase()}/me/profile`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${authToken.token}`, 'content-type': 'application/json' },
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
  if (authToken.minted) {
    setRavenBackendTokenCookie(response, authToken.token, isSecureRequest(request), authToken.authUserId);
  }
  return response;
}
