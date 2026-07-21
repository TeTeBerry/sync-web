import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { getApiBase } from '../../../../lib/api';
import { isSecureRequest, rejectUnsafeMutation } from '../../../../lib/auth/http';
import {
  mintNestTokenForAuthUser,
  readBoundBackendToken,
  setRavenBackendTokenCookie,
} from '../../../../lib/auth/raven-backend-token';

export const runtime = 'nodejs';

/**
 * Public bridge for lineup discovery / taste signals.
 * Attaches Nest JWT when Auth.js session is signed in; otherwise anonymous.
 */
async function resolveOptionalToken(
  request: NextRequest,
): Promise<{ token?: string; minted?: string; authUserId?: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return {};

  const existing = readBoundBackendToken(request, session.user.id);
  if (existing) return { token: existing, authUserId: session.user.id };

  const nest = await mintNestTokenForAuthUser({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  });
  if ('error' in nest) return {};
  return { token: nest.token, minted: nest.token, authUserId: session.user.id };
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const blocked = rejectUnsafeMutation(request);
    if (blocked) return blocked;
  }

  const authState = await resolveOptionalToken(request);
  const { path } = await context.params;
  const url = `${getApiBase()}/lineup-discovery/${path.map(encodeURIComponent).join('/')}${new URL(request.url).search}`;
  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text();

  const upstream = await fetch(url, {
    method: request.method,
    headers: {
      ...(authState.token ? { authorization: `Bearer ${authState.token}` } : {}),
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
  if (authState.minted && authState.authUserId) {
    setRavenBackendTokenCookie(response, authState.minted, isSecureRequest(request), authState.authUserId);
  }
  return response;
}

export const GET = proxy;
export const POST = proxy;
