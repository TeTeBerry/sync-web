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
