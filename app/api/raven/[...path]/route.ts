import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '../../../../lib/api';
import {
  RAVEN_RATE_KEY_COOKIE,
  RAVEN_RATE_KEY_HEADER,
  resolvePlatformClientIp,
  resolveRavenRateKey,
} from '../../../../lib/raven-proxy-identity';

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
  const { path } = await context.params;
  const upstreamPath = path.map(encodeURIComponent).join('/');
  const incomingUrl = new URL(request.url);
  const upstreamUrl = `${getApiBase()}/raven/${upstreamPath}${incomingUrl.search}`;
  const method = request.method;
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text();
  const { key: rateKey, isNew } = resolveRavenRateKey(request);

  const response = await fetch(upstreamUrl, {
    method,
    headers: buildUpstreamHeaders(request, rateKey),
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

  return outbound;
}

export const GET = proxyRavenRequest;
export const POST = proxyRavenRequest;
