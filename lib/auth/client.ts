import type {
  AuthIntendedAction,
  EmailLoginResult,
  PublicAuthSessionResponse,
} from './types';

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

export async function submitEmailLogin(input: {
  email: string;
  returnUrl?: string | null;
  intendedAction?: AuthIntendedAction | null;
}): Promise<EmailLoginResult> {
  const csrf = await ensureAuthCsrf();
  const response = await fetch('/api/auth/email-login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrf,
    },
    body: JSON.stringify({
      email: input.email,
      returnUrl: input.returnUrl ?? null,
      intendedAction: input.intendedAction ?? null,
    }),
  });

  const body = await readJson<EmailLoginResult & { message?: string; error?: string }>(
    response,
  );
  if (!response.ok) {
    throw Object.assign(new Error(body.message || body.error || 'Sign-in failed'), {
      status: response.status,
      code: (body as { code?: string }).code,
    });
  }
  return body;
}

export async function submitLogout(): Promise<void> {
  const csrf = await ensureAuthCsrf();
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'x-csrf-token': csrf,
    },
  });
  if (!response.ok) {
    throw Object.assign(new Error('Logout failed'), { status: response.status });
  }
}
