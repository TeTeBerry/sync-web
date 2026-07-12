import { getDatabaseUrl } from '../db';
import {
  createSessionToken,
  hashSessionToken,
  newEntityId,
  SESSION_TTL_MS,
} from './crypto';
import type { RavenAuthSession, RavenAuthUser } from './types';

type MemoryDb = {
  users: Map<string, RavenAuthUser>;
  usersByEmail: Map<string, string>;
  sessions: Map<string, RavenAuthSession>;
  sessionsByHash: Map<string, string>;
};

const globalForAuth = globalThis as typeof globalThis & {
  __ravenAuthMemory?: MemoryDb;
  __ravenAuthMemoryWarned?: boolean;
};

function getMemoryDb(): MemoryDb {
  if (!globalForAuth.__ravenAuthMemory) {
    globalForAuth.__ravenAuthMemory = {
      users: new Map(),
      usersByEmail: new Map(),
      sessions: new Map(),
      sessionsByHash: new Map(),
    };
  }
  return globalForAuth.__ravenAuthMemory;
}

/**
 * Use in-memory auth when Postgres is not configured.
 * Allowed in development by default; production requires DATABASE_URL
 * unless AUTH_MEMORY_FALLBACK=true is set explicitly (not recommended).
 */
export function shouldUseAuthMemoryStore(): boolean {
  if (getDatabaseUrl()) return false;
  const forced = process.env.AUTH_MEMORY_FALLBACK?.trim().toLowerCase();
  if (forced === 'true' || forced === '1') return true;
  if (forced === 'false' || forced === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

export function warnAuthMemoryFallbackOnce(): void {
  if (globalForAuth.__ravenAuthMemoryWarned) return;
  globalForAuth.__ravenAuthMemoryWarned = true;
  console.warn(
    '[auth] DATABASE_URL/POSTGRES_URL is not set — using in-memory auth store for local development. Sessions reset on server restart.',
  );
}

export function memoryFindUserByNormalizedEmail(
  emailNormalized: string,
): RavenAuthUser | null {
  const db = getMemoryDb();
  const id = db.usersByEmail.get(emailNormalized);
  if (!id) return null;
  return db.users.get(id) ?? null;
}

export function memoryFindUserById(id: string): RavenAuthUser | null {
  return getMemoryDb().users.get(id) ?? null;
}

export function memoryFindOrCreateUser(input: {
  email: string;
  emailNormalized: string;
}): { user: RavenAuthUser; created: boolean } {
  const existing = memoryFindUserByNormalizedEmail(input.emailNormalized);
  if (existing) return { user: existing, created: false };

  const db = getMemoryDb();
  const id = newEntityId();
  const now = new Date().toISOString();
  const user: RavenAuthUser = {
    id,
    email: input.email,
    emailNormalized: input.emailNormalized,
    emailVerifiedAt: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };
  db.users.set(id, user);
  db.usersByEmail.set(input.emailNormalized, id);
  return { user, created: true };
}

export function memoryTouchLastLogin(userId: string): void {
  const user = memoryFindUserById(userId);
  if (!user) return;
  const now = new Date().toISOString();
  user.lastLoginAt = now;
  user.updatedAt = now;
}

export function memoryCreateSession(userId: string): {
  session: RavenAuthSession;
  rawToken: string;
} {
  const db = getMemoryDb();
  const rawToken = createSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const id = newEntityId();
  const now = new Date();
  const session: RavenAuthSession = {
    id,
    userId,
    tokenHash,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    createdAt: now.toISOString(),
  };
  db.sessions.set(id, session);
  db.sessionsByHash.set(tokenHash, id);
  return { session, rawToken };
}

export function memoryFindSessionByRawToken(
  rawToken: string,
): RavenAuthSession | null {
  if (!rawToken) return null;
  const db = getMemoryDb();
  const id = db.sessionsByHash.get(hashSessionToken(rawToken));
  if (!id) return null;
  const session = db.sessions.get(id);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    db.sessions.delete(id);
    db.sessionsByHash.delete(session.tokenHash);
    return null;
  }
  return session;
}

export function memoryDeleteSessionByRawToken(rawToken: string): boolean {
  if (!rawToken) return false;
  const db = getMemoryDb();
  const hash = hashSessionToken(rawToken);
  const id = db.sessionsByHash.get(hash);
  if (!id) return false;
  db.sessions.delete(id);
  db.sessionsByHash.delete(hash);
  return true;
}

/** Test helper */
export function resetAuthMemoryStore(): void {
  globalForAuth.__ravenAuthMemory = {
    users: new Map(),
    usersByEmail: new Map(),
    sessions: new Map(),
    sessionsByHash: new Map(),
  };
  globalForAuth.__ravenAuthMemoryWarned = false;
}
