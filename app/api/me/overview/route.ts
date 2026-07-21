import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { getApiBase, unwrapApiEnvelope } from '../../../../lib/api';
import { isSecureRequest, jsonError } from '../../../../lib/auth/http';
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
  return mintNestTokenForAuthUser({
    ...identity,
  });
}

export async function GET(request: NextRequest) {
  const identity = await sessionIdentity();
  if (!identity) {
    return jsonError(401, 'Sign in required.', 'unauthorized');
  }
  const existingToken = readBoundBackendToken(request, identity.id);
  const initialToken = existingToken ? { token: existingToken } : await mintToken(identity);
  if ('error' in initialToken) return initialToken.error;

  let token = initialToken.token;
  let minted = !existingToken;
  let upstream: Response;
  try {
    upstream = await fetch(`${getApiBase()}/me/overview`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    // A backend deployment or a new login can invalidate the short-lived
    // Nest bearer cookie while the Auth.js session is still valid. Exchange
    // the trusted session once, instead of leaving Profile permanently empty.
    if (upstream.status === 401 || upstream.status === 403) {
      const refreshed = await mintToken(identity);
      if ('error' in refreshed) return refreshed.error;
      token = refreshed.token;
      minted = true;
      upstream = await fetch(`${getApiBase()}/me/overview`, {
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
    }
  } catch {
    return jsonError(503, 'Your Raven collection is temporarily unavailable.', 'unavailable');
  }

  const payload = await upstream.json().catch(() => null);
  const body = payload == null ? null : unwrapApiEnvelope(payload);
  const response = NextResponse.json(body, {
    status: upstream.status,
    headers: { 'cache-control': 'no-store' },
  });
  if (minted) {
    setRavenBackendTokenCookie(response, token, isSecureRequest(request), identity.id);
  }
  return response;
}
