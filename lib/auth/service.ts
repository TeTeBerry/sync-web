import {
  isTempEmailOnlyAuthEnabled,
  TEMP_EMAIL_AUTH_SUCCESS_MESSAGE,
  TEMP_EMAIL_AUTH_UNAVAILABLE_MESSAGE,
} from './config';
import { isValidEmail, normalizeEmail } from './email';
import { buildAuthCapabilities, capabilitiesForAnonymous } from './capabilities';
import {
  consumeAuthRateLimit,
  getAuthLoginRateLimits,
  peekAuthRateLimitCount,
} from './rate-limit';
import { parseIntendedAction, sanitizeReturnUrl } from './return-url';
import { rotateSession, findSessionByRawToken, deleteSessionByRawToken } from './sessions';
import { findOrCreateUserByEmail, findUserById, touchUserLastLogin } from './users';
import type {
  AuthIntendedAction,
  EmailLoginResult,
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

export async function loginWithEmail(input: {
  email: string;
  returnUrl?: string | null;
  intendedAction?: string | null;
  clientIp?: string | null;
  previousSessionToken?: string | null;
}): Promise<{
  result: EmailLoginResult;
  rawToken: string;
  created: boolean;
}> {
  if (!isTempEmailOnlyAuthEnabled()) {
    throw new AuthServiceError(TEMP_EMAIL_AUTH_UNAVAILABLE_MESSAGE, 503, 'unavailable');
  }

  if (!isValidEmail(input.email)) {
    throw new AuthServiceError('Enter a valid email address.', 400, 'invalid_email');
  }

  const { email, emailNormalized } = normalizeEmail(input.email);
  const limits = getAuthLoginRateLimits();
  const ip = (input.clientIp || 'unknown').trim() || 'unknown';

  const ipLimit = consumeAuthRateLimit(
    `auth:login:ip:${ip}`,
    limits.ipMax,
    limits.ipWindowMs,
  );
  if (!ipLimit.allowed) {
    console.warn('[auth] rate_limited_ip', { ip });
    throw new AuthServiceError(
      'Too many sign-in attempts. Please try again later.',
      429,
      'rate_limited',
    );
  }

  const emailLimit = consumeAuthRateLimit(
    `auth:login:email:${emailNormalized}`,
    limits.emailMax,
    limits.emailWindowMs,
  );
  if (!emailLimit.allowed) {
    console.warn('[auth] rate_limited_email', {
      ip,
      emailHash: hashForLog(emailNormalized),
    });
    throw new AuthServiceError(
      'Too many sign-in attempts. Please try again later.',
      429,
      'rate_limited',
    );
  }

  const ipAttempts = peekAuthRateLimitCount(`auth:login:ip:${ip}`);
  if (ipAttempts >= limits.suspiciousIpThreshold) {
    console.warn('[auth] suspicious_repeated_login_attempts', {
      ip,
      attempts: ipAttempts,
    });
  }

  try {
    const { user, created } = await findOrCreateUserByEmail({ email, emailNormalized });
    const { rawToken } = await rotateSession({
      userId: user.id,
      previousRawToken: input.previousSessionToken,
    });
    await touchUserLastLogin(user.id);

    const returnUrl = sanitizeReturnUrl(input.returnUrl);
    const intendedAction = parseIntendedAction(input.intendedAction);

    return {
      created,
      rawToken,
      result: {
        ok: true,
        // Same copy for new and returning users — do not reveal account existence.
        message: TEMP_EMAIL_AUTH_SUCCESS_MESSAGE,
        session: toPublicSession({
          id: user.id,
          email: user.email,
          emailVerifiedAt: user.emailVerifiedAt,
        }),
        returnUrl,
        intendedAction,
      },
    };
  } catch (error) {
    if (error instanceof AuthServiceError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('DATABASE_URL') || message.includes('POSTGRES_URL')) {
      throw new AuthServiceError(
        'Sign-in storage is not configured. Set DATABASE_URL for production, or use local development without it.',
        503,
        'unavailable',
      );
    }
    throw error;
  }
}

export async function logoutSession(
  rawToken: string | undefined,
): Promise<{ ok: true }> {
  if (rawToken) {
    await deleteSessionByRawToken(rawToken);
  }
  return { ok: true };
}

/** Stable non-PII log fingerprint — never log raw emails. */
function hashForLog(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return `e${Math.abs(hash)}`;
}

export function assertIntendedAction(
  action: AuthIntendedAction | null,
): AuthIntendedAction | null {
  return action;
}
