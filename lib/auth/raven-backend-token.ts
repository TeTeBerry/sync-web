import { NextResponse } from 'next/server';
import { getApiBase } from '../api';
import { jsonError } from './http';

export const RAVEN_BACKEND_TOKEN_COOKIE = 'raven_backend_token';

const BACKEND_TOKEN_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function setRavenBackendTokenCookie(
  response: NextResponse,
  token: string,
  secure: boolean,
): void {
  response.cookies.set(RAVEN_BACKEND_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: BACKEND_TOKEN_MAX_AGE_SEC,
  });
}

export async function mintNestAccessToken(input: {
  email: string;
  returnUrl?: string;
  intendedAction?: string;
  clientIp: string;
}): Promise<{ token: string } | { error: NextResponse }> {
  const backendResponse = await fetch(`${getApiBase()}/auth/email-login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': input.clientIp,
    },
    body: JSON.stringify({
      email: input.email,
      returnUrl: input.returnUrl,
      intendedAction: input.intendedAction,
    }),
    cache: 'no-store',
  });
  const backendPayload = (await backendResponse.json()) as {
    data?: { accessToken?: string };
    message?: string;
  };
  const backendToken = backendPayload.data?.accessToken;
  if (!backendResponse.ok || !backendToken) {
    return {
      error: jsonError(
        backendResponse.status || 503,
        backendPayload.message || 'Backend sign-in failed.',
        'unavailable',
      ),
    };
  }
  return { token: backendToken };
}

/** Exchange a verified Auth.js session for Nest's server-only bearer token. */
export async function mintNestTokenForAuthUser(input: {
  id: string; email: string; name?: string | null; image?: string | null; provider?: 'google' | 'email';
}): Promise<{ token: string } | { error: NextResponse }> {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) return { error: jsonError(503, 'Sign-in is not configured.', 'unavailable') };
  const response = await fetch(`${getApiBase()}/auth/web-session`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-internal-api-key': key },
    body: JSON.stringify({ id: input.id, email: input.email, name: input.name, image: input.image, provider: input.provider ?? 'email' }), cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({})) as { data?: { accessToken?: string }; accessToken?: string };
  const token = payload.data?.accessToken ?? payload.accessToken;
  if (!response.ok || !token) return { error: jsonError(401, 'Please sign in again.', 'unauthorized') };
  return { token };
}
