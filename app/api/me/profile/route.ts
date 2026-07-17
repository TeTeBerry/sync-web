import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { getApiBase } from '../../../../lib/api';
import { isSecureRequest, jsonError, rejectUnsafeMutation } from '../../../../lib/auth/http';
import { mintNestTokenForAuthUser, RAVEN_BACKEND_TOKEN_COOKIE, setRavenBackendTokenCookie } from '../../../../lib/auth/raven-backend-token';

async function tokenForSession(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  const existing = request.cookies.get(RAVEN_BACKEND_TOKEN_COOKIE)?.value;
  if (existing) return { token: existing };
  return mintNestTokenForAuthUser({ id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image });
}

export async function GET(request: NextRequest) {
  const authToken = await tokenForSession(request);
  if (!authToken || 'error' in authToken) return jsonError(401, 'Sign in required.', 'unauthorized');
  const upstream = await fetch(`${getApiBase()}/me/profile`, { headers: { authorization: `Bearer ${authToken.token}` }, cache: 'no-store' });
  const response = new NextResponse(upstream.body, { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' } });
  if (!request.cookies.get(RAVEN_BACKEND_TOKEN_COOKIE)?.value) setRavenBackendTokenCookie(response, authToken.token, isSecureRequest(request));
  return response;
}

export async function PATCH(request: NextRequest) {
  const blocked = rejectUnsafeMutation(request); if (blocked) return blocked;
  const authToken = await tokenForSession(request);
  if (!authToken || 'error' in authToken) return jsonError(401, 'Sign in required.', 'unauthorized');
  const body = await request.text();
  const upstream = await fetch(`${getApiBase()}/me/profile`, { method: 'PATCH', headers: { authorization: `Bearer ${authToken.token}`, 'content-type': 'application/json' }, body, cache: 'no-store' });
  const response = new NextResponse(upstream.body, { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' } });
  if (!request.cookies.get(RAVEN_BACKEND_TOKEN_COOKIE)?.value) setRavenBackendTokenCookie(response, authToken.token, isSecureRequest(request));
  return response;
}
