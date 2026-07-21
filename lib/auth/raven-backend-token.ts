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

/** Exchange a verified Auth.js session for Nest's server-only bearer token. */
export async function mintNestTokenForAuthUser(input: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  provider?: 'google' | 'email';
}): Promise<{ token: string } | { error: NextResponse }> {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) return { error: jsonError(503, 'Sign-in is not configured.', 'unavailable') };
  const response = await fetch(`${getApiBase()}/auth/web-session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-api-key': key },
    body: JSON.stringify({
      id: input.id,
      email: input.email,
      name: input.name,
      image: input.image,
      provider: input.provider ?? 'google',
    }),
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as {
    data?: { accessToken?: string };
    accessToken?: string;
  };
  const token = payload.data?.accessToken ?? payload.accessToken;
  if (!response.ok || !token) {
    return { error: jsonError(401, 'Please sign in again.', 'unauthorized') };
  }
  return { token };
}
