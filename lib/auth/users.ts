import { getSql } from '../db';
import type { RavenAuthUser } from './types';
import { newEntityId } from './crypto';
import { normalizeEmail } from './email';
import {
  memoryEnsureUserForAuthIdentity,
  memoryFindOrCreateUser,
  memoryFindUserById,
  memoryFindUserByNormalizedEmail,
  memoryTouchLastLogin,
  shouldUseAuthMemoryStore,
  warnAuthMemoryFallbackOnce,
} from './store';

let setupPromise: Promise<void> | null = null;

export async function ensureAuthTables(): Promise<void> {
  if (shouldUseAuthMemoryStore()) {
    warnAuthMemoryFallbackOnce();
    return;
  }

  if (!setupPromise) {
    const sql = getSql();
    setupPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS raven_users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          email_normalized TEXT NOT NULL UNIQUE,
          email_verified_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_login_at TIMESTAMPTZ
        )
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS raven_users_email_normalized_uidx
        ON raven_users (email_normalized)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS raven_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES raven_users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS raven_sessions_user_id_idx
        ON raven_sessions (user_id)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS raven_sessions_expires_at_idx
        ON raven_sessions (expires_at)
      `;
    })();
  }
  await setupPromise;
}

/** Test helper to reset lazy setup between suites if needed. */
export function resetAuthTableSetup(): void {
  setupPromise = null;
}

function mapUser(row: Record<string, unknown>): RavenAuthUser {
  return {
    id: String(row.id),
    email: String(row.email),
    emailNormalized: String(row.email_normalized),
    emailVerifiedAt: row.email_verified_at
      ? new Date(String(row.email_verified_at)).toISOString()
      : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    lastLoginAt: row.last_login_at
      ? new Date(String(row.last_login_at)).toISOString()
      : null,
  };
}

export async function findUserByNormalizedEmail(
  emailNormalized: string,
): Promise<RavenAuthUser | null> {
  if (shouldUseAuthMemoryStore()) {
    warnAuthMemoryFallbackOnce();
    return memoryFindUserByNormalizedEmail(emailNormalized);
  }

  await ensureAuthTables();
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM raven_users
    WHERE email_normalized = ${emailNormalized}
    LIMIT 1
  `;
  if (!rows.length) return null;
  return mapUser(rows[0] as Record<string, unknown>);
}

export async function findUserById(id: string): Promise<RavenAuthUser | null> {
  if (shouldUseAuthMemoryStore()) {
    warnAuthMemoryFallbackOnce();
    return memoryFindUserById(id);
  }

  await ensureAuthTables();
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM raven_users
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows.length) return null;
  return mapUser(rows[0] as Record<string, unknown>);
}

/**
 * Find by normalized email or create. Race-safe via unique constraint retry.
 * emailVerifiedAt is always null for this temporary flow.
 */
export async function findOrCreateUserByEmail(input: {
  email: string;
  emailNormalized: string;
}): Promise<{ user: RavenAuthUser; created: boolean }> {
  if (shouldUseAuthMemoryStore()) {
    warnAuthMemoryFallbackOnce();
    return memoryFindOrCreateUser(input);
  }

  await ensureAuthTables();
  const existing = await findUserByNormalizedEmail(input.emailNormalized);
  if (existing) {
    return { user: existing, created: false };
  }

  const sql = getSql();
  const id = newEntityId();
  const now = new Date().toISOString();

  try {
    const rows = await sql`
      INSERT INTO raven_users (
        id,
        email,
        email_normalized,
        email_verified_at,
        created_at,
        updated_at,
        last_login_at
      ) VALUES (
        ${id},
        ${input.email},
        ${input.emailNormalized},
        NULL,
        ${now},
        ${now},
        NULL
      )
      RETURNING *
    `;
    return {
      user: mapUser(rows[0] as Record<string, unknown>),
      created: true,
    };
  } catch (error) {
    // Unique race: another request created the same email.
    const retry = await findUserByNormalizedEmail(input.emailNormalized);
    if (retry) return { user: retry, created: false };
    throw error;
  }
}

export async function touchUserLastLogin(userId: string): Promise<void> {
  if (shouldUseAuthMemoryStore()) {
    memoryTouchLastLogin(userId);
    return;
  }

  await ensureAuthTables();
  const sql = getSql();
  const now = new Date().toISOString();
  await sql`
    UPDATE raven_users
    SET last_login_at = ${now}, updated_at = ${now}
    WHERE id = ${userId}
  `;
}

/**
 * Bridge Auth.js (Google / Mongo adapter) identities into Postgres `raven_users`
 * so lineup schedules can satisfy the FK on `raven_lineup_schedules.user_id`.
 *
 * Resolution order: exact Auth.js id → existing email row → create with Auth.js id.
 */
export async function ensureUserForAuthIdentity(input: {
  id: string;
  email?: string | null;
}): Promise<string> {
  const id = input.id.trim();
  if (!id) {
    throw new Error('Missing auth user id');
  }

  const rawEmail = input.email?.trim() || `${id}@users.raven.local`;
  const { email, emailNormalized } = normalizeEmail(rawEmail);

  if (shouldUseAuthMemoryStore()) {
    warnAuthMemoryFallbackOnce();
    return memoryEnsureUserForAuthIdentity({ id, email, emailNormalized });
  }

  await ensureAuthTables();
  const byId = await findUserById(id);
  if (byId) return byId.id;

  const byEmail = await findUserByNormalizedEmail(emailNormalized);
  if (byEmail) return byEmail.id;

  const sql = getSql();
  const now = new Date().toISOString();

  try {
    await sql`
      INSERT INTO raven_users (
        id,
        email,
        email_normalized,
        email_verified_at,
        created_at,
        updated_at,
        last_login_at
      ) VALUES (
        ${id},
        ${email},
        ${emailNormalized},
        ${now},
        ${now},
        ${now},
        ${now}
      )
    `;
    return id;
  } catch (error) {
    const retryById = await findUserById(id);
    if (retryById) return retryById.id;
    const retryByEmail = await findUserByNormalizedEmail(emailNormalized);
    if (retryByEmail) return retryByEmail.id;
    throw error;
  }
}
