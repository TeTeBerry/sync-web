import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '../../../../lib/api';
import {
  RAVEN_RATE_KEY_COOKIE,
  RAVEN_RATE_KEY_HEADER,
  resolvePlatformClientIp,
  resolveRavenRateKey,
} from '../../../../lib/raven-proxy-identity';
import { auth } from '../../../../auth';
import { isSecureRequest, rejectUnsafeMutation } from '../../../../lib/auth/http';
import { mintNestTokenForAuthUser, readBoundBackendToken, setRavenBackendTokenCookie } from '../../../../lib/auth/raven-backend-token';

type RavenProxyContext = {
  params: Promise<{ path: string[] }>;
};

function buildUpstreamHeaders(request: NextRequest, rateKey: string): Headers {
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const platformIp = resolvePlatformClientIp(request);
  if (platformIp) {
    headers.set('x-forwarded-for', platformIp);
    headers.set('x-real-ip', platformIp);
  }
  headers.set(RAVEN_RATE_KEY_HEADER, rateKey);

  return headers;
}

async function proxyRavenRequest(request: NextRequest, context: RavenProxyContext) {
  const requestedPath = (await context.params).path;
  if (requestedPath.at(-1) === 'claim') {
    const blocked = rejectUnsafeMutation(request);
    if (blocked) return blocked;
  }
  const path = requestedPath;
  const upstreamPath = path.map(encodeURIComponent).join('/');
  const incomingUrl = new URL(request.url);
  const upstreamUrl = `${getApiBase()}/raven/${upstreamPath}${incomingUrl.search}`;
  const method = request.method;
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text();
  const { key: rateKey, isNew } = resolveRavenRateKey(request);

  const session = await auth();
  const existingToken = session?.user?.id
    ? readBoundBackendToken(request, session.user.id)
    : undefined;
  const minted = !existingToken && session?.user?.id && session.user.email
    ? await mintNestTokenForAuthUser({ id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image })
    : null;
  if (minted && 'error' in minted) return minted.error;
  const headersForUpstream = buildUpstreamHeaders(request, rateKey);
  const backendToken = existingToken ?? (minted && 'token' in minted ? minted.token : undefined);
  if (backendToken) headersForUpstream.set('authorization', `Bearer ${backendToken}`);
  const response = await fetch(upstreamUrl, {
    method,
    headers: headersForUpstream,
    body,
    cache: 'no-store',
  });

  const headers = new Headers();
  const contentType = response.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('cache-control', 'no-store');

  const outbound = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  if (isNew) {
    outbound.cookies.set(RAVEN_RATE_KEY_COOKIE, rateKey, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  if (minted && 'token' in minted && session?.user?.id) {
    setRavenBackendTokenCookie(outbound, minted.token, isSecureRequest(request), session.user.id);
  }

  return outbound;
}

export const GET = proxyRavenRequest;
export const POST = proxyRavenRequest;
