import { signOut } from 'next-auth/react';
import type { PublicAuthSessionResponse } from './types';

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function getCsrfFromDocument(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('raven_csrf='));
  if (!match) return undefined;
  return decodeURIComponent(match.slice('raven_csrf='.length));
}

/** Ensure CSRF cookie exists via session probe before mutations. */
export async function ensureAuthCsrf(): Promise<string> {
  let csrf = getCsrfFromDocument();
  if (csrf) return csrf;
  await fetchAuthSession();
  csrf = getCsrfFromDocument();
  if (!csrf) {
    throw Object.assign(new Error('Could not establish CSRF protection.'), {
      status: 403,
      code: 'csrf',
    });
  }
  return csrf;
}

export async function fetchAuthSession(): Promise<PublicAuthSessionResponse> {
  const response = await fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) {
    throw Object.assign(new Error('Failed to load session'), {
      status: response.status,
    });
  }
  return readJson(response);
}

export async function submitLogout(): Promise<void> {
  // The active Raven session is managed by Auth.js. The legacy endpoint only
  // clears its own session and the short-lived backend token, so calling it by
  // itself left the Auth.js cookie intact and Profile still appeared signed in.
  const result = await signOut({ redirect: false });
  if (!result?.url) {
    throw new Error('Logout failed');
  }

  // Keep clearing legacy cookies for older sessions and backend tokens.
  // A failure here must not restore an Auth.js session that has already ended.
  try {
    const csrf = await ensureAuthCsrf();
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'x-csrf-token': csrf,
      },
    });
  } catch {
    // Auth.js sign-out above is the source of truth for access to Profile.
  }
}
