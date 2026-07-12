/**
 * Client helpers for server-enforced unverified-session limits.
 * Prefer these over localStorage counters.
 */
import type { AuthUsageKind } from './usage-limits';

function getCsrfFromDocument(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('raven_csrf='));
  if (!match) return undefined;
  return decodeURIComponent(match.slice('raven_csrf='.length));
}

export type ClientAuthUsageResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  kind: AuthUsageKind;
};

async function postUsage(kind: AuthUsageKind): Promise<ClientAuthUsageResult> {
  const csrf = getCsrfFromDocument();
  if (!csrf) {
    throw Object.assign(new Error('Missing CSRF token. Refresh and try again.'), {
      status: 403,
      code: 'csrf',
    });
  }
  const response = await fetch('/api/auth/limits', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrf,
    },
    body: JSON.stringify({ kind }),
  });
  const body = (await response.json()) as ClientAuthUsageResult & {
    message?: string;
  };
  if (response.status === 429) {
    return {
      allowed: false,
      remaining: 0,
      limit: body.limit ?? 0,
      kind,
    };
  }
  if (!response.ok) {
    throw Object.assign(new Error(body.message || 'Limit check failed'), {
      status: response.status,
    });
  }
  return body;
}

export function recordConnectionRequestServer(): Promise<ClientAuthUsageResult> {
  return postUsage('connection_request');
}

export function recordPrivateProfileViewServer(): Promise<ClientAuthUsageResult> {
  return postUsage('private_profile_view');
}

/** Profiles with restricted journey detail fields count toward the private-view budget. */
export function isPrivateProfileDetail(visibility: {
  showExactCity?: boolean;
  showCountryOnly?: boolean;
  showAccommodationName?: boolean;
  showAccommodationTypeOnly?: boolean;
  hideProfile?: boolean;
}): boolean {
  if (visibility.hideProfile) return true;
  if (visibility.showCountryOnly) return true;
  if (visibility.showExactCity === false) return true;
  if (visibility.showAccommodationTypeOnly) return true;
  if (visibility.showAccommodationName === false) return true;
  return false;
}
