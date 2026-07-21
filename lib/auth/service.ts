import { buildAuthCapabilities, capabilitiesForAnonymous } from './capabilities';
import { findSessionByRawToken, deleteSessionByRawToken } from './sessions';
import { findUserById } from './users';
import type {
  AuthIntendedAction,
  PublicAuthSession,
  PublicAuthSessionResponse,
} from './types';

export class AuthServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code:
      | 'unavailable'
      | 'invalid_email'
      | 'rate_limited'
      | 'csrf'
      | 'unauthorized'
      | 'server',
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

function toPublicSession(user: {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
}): PublicAuthSession {
  return {
    signedIn: true,
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerifiedAt != null,
      emailVerifiedAt: user.emailVerifiedAt,
    },
    capabilities: buildAuthCapabilities(user.emailVerifiedAt),
  };
}

export async function getSessionFromCookie(
  rawToken: string | undefined,
): Promise<PublicAuthSessionResponse> {
  if (!rawToken) {
    return {
      signedIn: false,
      user: null,
      capabilities: capabilitiesForAnonymous(),
    };
  }

  const session = await findSessionByRawToken(rawToken);
  if (!session) {
    return {
      signedIn: false,
      user: null,
      capabilities: capabilitiesForAnonymous(),
    };
  }

  const user = await findUserById(session.userId);
  if (!user) {
    await deleteSessionByRawToken(rawToken);
    return {
      signedIn: false,
      user: null,
      capabilities: capabilitiesForAnonymous(),
    };
  }

  return toPublicSession(user);
}

export async function logoutSession(
  rawToken: string | undefined,
): Promise<{ ok: true }> {
  if (rawToken) {
    await deleteSessionByRawToken(rawToken);
  }
  return { ok: true };
}

export function assertIntendedAction(
  action: AuthIntendedAction | null,
): AuthIntendedAction | null {
  return action;
}
