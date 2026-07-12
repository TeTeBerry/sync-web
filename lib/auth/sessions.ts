import { getSql } from '../db';
import {
  createSessionToken,
  hashSessionToken,
  newEntityId,
  RAVEN_SESSION_COOKIE,
  SESSION_TTL_MS,
} from './crypto';
import { ensureAuthTables } from './users';
import {
  memoryCreateSession,
  memoryDeleteSessionByRawToken,
  memoryFindSessionByRawToken,
  shouldUseAuthMemoryStore,
  warnAuthMemoryFallbackOnce,
} from './store';
import type { RavenAuthSession } from './types';

function mapSession(row: Record<string, unknown>): RavenAuthSession {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    tokenHash: String(row.token_hash),
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export { RAVEN_SESSION_COOKIE };

/**
 * Create a new server session. Caller should clear any previous session cookie
 * and set the returned raw token on the cookie (session rotation).
 */
export async function createSession(userId: string): Promise<{
  session: RavenAuthSession;
  rawToken: string;
}> {
  if (shouldUseAuthMemoryStore()) {
    warnAuthMemoryFallbackOnce();
    return memoryCreateSession(userId);
  }

  await ensureAuthTables();
  const sql = getSql();
  const rawToken = createSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const id = newEntityId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  const createdAt = now.toISOString();

  const rows = await sql`
    INSERT INTO raven_sessions (id, user_id, token_hash, expires_at, created_at)
    VALUES (${id}, ${userId}, ${tokenHash}, ${expiresAt}, ${createdAt})
    RETURNING *
  `;

  return {
    session: mapSession(rows[0] as Record<string, unknown>),
    rawToken,
  };
}

export async function findSessionByRawToken(
  rawToken: string,
): Promise<RavenAuthSession | null> {
  if (!rawToken) return null;

  if (shouldUseAuthMemoryStore()) {
    return memoryFindSessionByRawToken(rawToken);
  }

  await ensureAuthTables();
  const sql = getSql();
  const tokenHash = hashSessionToken(rawToken);
  const now = new Date().toISOString();
  const rows = await sql`
    SELECT *
    FROM raven_sessions
    WHERE token_hash = ${tokenHash}
      AND expires_at > ${now}
    LIMIT 1
  `;
  if (!rows.length) return null;
  return mapSession(rows[0] as Record<string, unknown>);
}

/** Invalidate one session by raw cookie token. */
export async function deleteSessionByRawToken(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;

  if (shouldUseAuthMemoryStore()) {
    return memoryDeleteSessionByRawToken(rawToken);
  }

  await ensureAuthTables();
  const sql = getSql();
  const tokenHash = hashSessionToken(rawToken);
  const result = await sql`
    DELETE FROM raven_sessions
    WHERE token_hash = ${tokenHash}
    RETURNING id
  `;
  return result.length > 0;
}

/** Rotate: delete previous session (if any), create a fresh one. */
export async function rotateSession(input: {
  userId: string;
  previousRawToken?: string | null;
}): Promise<{ session: RavenAuthSession; rawToken: string }> {
  if (input.previousRawToken) {
    await deleteSessionByRawToken(input.previousRawToken);
  }
  return createSession(input.userId);
}
