import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '../api';
import { jsonError } from './http';

export const RAVEN_BACKEND_TOKEN_COOKIE = 'raven_backend_token';
/** Auth.js user id that the Nest bearer was minted for — prevents cross-account reuse. */
export const RAVEN_BACKEND_TOKEN_AUTH_USER_COOKIE = 'raven_backend_token_uid';

const BACKEND_TOKEN_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function tokenCookieOptions(secure: boolean, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge,
  };
}

export function setRavenBackendTokenCookie(
  response: NextResponse,
  token: string,
  secure: boolean,
  authUserId: string,
): void {
  const options = tokenCookieOptions(secure, BACKEND_TOKEN_MAX_AGE_SEC);
  response.cookies.set(RAVEN_BACKEND_TOKEN_COOKIE, token, options);
  response.cookies.set(RAVEN_BACKEND_TOKEN_AUTH_USER_COOKIE, authUserId, options);
}

export function clearRavenBackendTokenCookies(
  response: NextResponse,
  secure: boolean,
): void {
  const options = tokenCookieOptions(secure, 0);
  response.cookies.set(RAVEN_BACKEND_TOKEN_COOKIE, '', options);
  response.cookies.set(RAVEN_BACKEND_TOKEN_AUTH_USER_COOKIE, '', options);
}

/** Return the Nest bearer only when it was minted for this Auth.js user. */
export function readBoundBackendToken(
  request: NextRequest,
  authUserId: string,
): string | undefined {
  const token = request.cookies.get(RAVEN_BACKEND_TOKEN_COOKIE)?.value?.trim();
  const boundUserId = request.cookies.get(RAVEN_BACKEND_TOKEN_AUTH_USER_COOKIE)?.value?.trim();
  if (!token || !boundUserId || boundUserId !== authUserId) return undefined;
  return token;
}

/** Exchange a verified Auth.js session for Nest's server-only bearer token. */
export async function mintNestTokenForAuthUser(input: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  provider?: 'google' | 'email';
}): Promise<{ token: string } | { error: NextResponse }> {
  const key = process.env.INTERNAL_API_KEY?.trim();
  if (!key) {
    return {
      error: jsonError(
        503,
        'Squad backend link is not configured (INTERNAL_API_KEY).',
        'unavailable',
      ),
    };
  }
  // Nest unique index (provider, providerUserId) treats a missing subject as null
  // and rejects later Google users — always send the Auth.js user id.
  let response: Response;
  try {
    response = await fetch(`${getApiBase()}/auth/web-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-api-key': key },
      body: JSON.stringify({
        id: input.id,
        email: input.email,
        name: input.name,
        image: input.image,
        provider: input.provider ?? 'google',
        providerUserId: input.id,
      }),
      cache: 'no-store',
    });
  } catch {
    return {
      error: jsonError(503, 'Could not reach the festival backend.', 'unavailable'),
    };
  }
  const payload = (await response.json().catch(() => ({}))) as {
    data?: { accessToken?: string };
    accessToken?: string;
    message?: string;
  };
  const token = payload.data?.accessToken ?? payload.accessToken;
  if (!response.ok || !token) {
    if (response.status >= 500) {
      return {
        error: jsonError(
          503,
          payload.message?.trim() || 'Festival backend temporarily unavailable.',
          'unavailable',
        ),
      };
    }
    return { error: jsonError(401, 'Please sign in again.', 'unauthorized') };
  }
  return { token };
}
