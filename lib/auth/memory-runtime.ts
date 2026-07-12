import { createHash, randomBytes } from 'node:crypto';
import { buildAuthCapabilities, capabilitiesForAnonymous } from './capabilities';
import { isValidEmail, normalizeEmail } from './email';
import {
  consumeAuthRateLimit,
  getAuthLoginRateLimits,
  peekAuthRateLimitCount,
} from './rate-limit';
import { parseIntendedAction, sanitizeReturnUrl } from './return-url';
import { TEMP_EMAIL_AUTH_SUCCESS_MESSAGE } from './config';
import type {
  AuthIntendedAction,
  EmailLoginResult,
  PublicAuthSession,
  PublicAuthSessionResponse,
  RavenAuthSession,
  RavenAuthUser,
} from './types';

type MemoryDb = {
  users: Map<string, RavenAuthUser>;
  usersByEmail: Map<string, string>;
  sessions: Map<string, RavenAuthSession & { rawToken?: string }>;
  sessionsByHash: Map<string, string>;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newId(): string {
  return randomBytes(16).toString('hex');
}

function toPublic(user: RavenAuthUser): PublicAuthSession {
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

/**
 * In-memory auth runtime for unit tests (no Postgres).
 * Mirrors production semantics for create/find user, session rotation, logout.
 */
export function createMemoryAuthRuntime(options?: {
  enabled?: boolean;
  now?: () => number;
}) {
  const db: MemoryDb = {
    users: new Map(),
    usersByEmail: new Map(),
    sessions: new Map(),
    sessionsByHash: new Map(),
  };
  const enabled = options?.enabled !== false;
  const now = options?.now ?? (() => Date.now());

  function findOrCreate(emailRaw: string): { user: RavenAuthUser; created: boolean } {
    const { email, emailNormalized } = normalizeEmail(emailRaw);
    const existingId = db.usersByEmail.get(emailNormalized);
    if (existingId) {
      return { user: db.users.get(existingId)!, created: false };
    }
    const id = newId();
    const stamp = new Date(now()).toISOString();
    const user: RavenAuthUser = {
      id,
      email,
      emailNormalized,
      emailVerifiedAt: null,
      createdAt: stamp,
      updatedAt: stamp,
      lastLoginAt: null,
    };
    db.users.set(id, user);
    db.usersByEmail.set(emailNormalized, id);
    return { user, created: true };
  }

  function rotateSession(userId: string, previousRaw?: string | null) {
    if (previousRaw) {
      const prevHash = hashToken(previousRaw);
      const prevId = db.sessionsByHash.get(prevHash);
      if (prevId) {
        db.sessions.delete(prevId);
        db.sessionsByHash.delete(prevHash);
      }
    }
    const rawToken = randomBytes(24).toString('base64url');
    const tokenHash = hashToken(rawToken);
    const id = newId();
    const stamp = new Date(now()).toISOString();
    const session: RavenAuthSession = {
      id,
      userId,
      tokenHash,
      expiresAt: new Date(now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: stamp,
    };
    db.sessions.set(id, session);
    db.sessionsByHash.set(tokenHash, id);
    return { session, rawToken };
  }

  function getSession(rawToken?: string | null): PublicAuthSessionResponse {
    if (!rawToken) {
      return { signedIn: false, user: null, capabilities: capabilitiesForAnonymous() };
    }
    const sessionId = db.sessionsByHash.get(hashToken(rawToken));
    if (!sessionId) {
      return { signedIn: false, user: null, capabilities: capabilitiesForAnonymous() };
    }
    const session = db.sessions.get(sessionId);
    if (!session || new Date(session.expiresAt).getTime() <= now()) {
      return { signedIn: false, user: null, capabilities: capabilitiesForAnonymous() };
    }
    const user = db.users.get(session.userId);
    if (!user) {
      return { signedIn: false, user: null, capabilities: capabilitiesForAnonymous() };
    }
    return toPublic(user);
  }

  function logout(rawToken?: string | null): void {
    if (!rawToken) return;
    const hash = hashToken(rawToken);
    const id = db.sessionsByHash.get(hash);
    if (!id) return;
    db.sessions.delete(id);
    db.sessionsByHash.delete(hash);
  }

  function login(input: {
    email: string;
    returnUrl?: string | null;
    intendedAction?: string | null;
    clientIp?: string | null;
    previousSessionToken?: string | null;
  }): { result: EmailLoginResult; rawToken: string; created: boolean } {
    if (!enabled) {
      const err = Object.assign(new Error('unavailable'), { status: 503, code: 'unavailable' });
      throw err;
    }
    if (!isValidEmail(input.email)) {
      const err = Object.assign(new Error('Enter a valid email address.'), {
        status: 400,
        code: 'invalid_email',
      });
      throw err;
    }

    const { emailNormalized } = normalizeEmail(input.email);
    const limits = getAuthLoginRateLimits();
    const ip = input.clientIp || 'unknown';
    const ipLimit = consumeAuthRateLimit(
      `auth:login:ip:${ip}`,
      limits.ipMax,
      limits.ipWindowMs,
      now(),
    );
    if (!ipLimit.allowed) {
      const err = Object.assign(new Error('rate limited'), {
        status: 429,
        code: 'rate_limited',
      });
      throw err;
    }
    const emailLimit = consumeAuthRateLimit(
      `auth:login:email:${emailNormalized}`,
      limits.emailMax,
      limits.emailWindowMs,
      now(),
    );
    if (!emailLimit.allowed) {
      const err = Object.assign(new Error('rate limited'), {
        status: 429,
        code: 'rate_limited',
      });
      throw err;
    }
    if (peekAuthRateLimitCount(`auth:login:ip:${ip}`, now()) >= limits.suspiciousIpThreshold) {
      // intentional no-op log in memory runtime
    }

    const { user, created } = findOrCreate(input.email);
    user.lastLoginAt = new Date(now()).toISOString();
    user.updatedAt = user.lastLoginAt;
    const { rawToken } = rotateSession(user.id, input.previousSessionToken);
    const returnUrl = sanitizeReturnUrl(input.returnUrl);
    const intendedAction = parseIntendedAction(input.intendedAction) as AuthIntendedAction | null;

    return {
      created,
      rawToken,
      result: {
        ok: true,
        message: TEMP_EMAIL_AUTH_SUCCESS_MESSAGE,
        session: toPublic(user),
        returnUrl,
        intendedAction,
      },
    };
  }

  return {
    db,
    login,
    logout,
    getSession,
    findOrCreate,
    userCount: () => db.users.size,
  };
}
