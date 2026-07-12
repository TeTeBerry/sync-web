import { getDatabaseUrl, getSql } from '../db';
import { getUnverifiedAuthLimits } from './limits';
import { shouldUseAuthMemoryStore, warnAuthMemoryFallbackOnce } from './store';

export type AuthUsageKind = 'connection_request' | 'private_profile_view';

export type AuthUsageResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  kind: AuthUsageKind;
};

type MemoryBucket = { count: number; windowKey: string };

const globalForLimits = globalThis as typeof globalThis & {
  __ravenAuthUsage?: Map<string, MemoryBucket>;
  __ravenAuthUsageSetup?: Promise<void>;
};

function memoryMap(): Map<string, MemoryBucket> {
  if (!globalForLimits.__ravenAuthUsage) {
    globalForLimits.__ravenAuthUsage = new Map();
  }
  return globalForLimits.__ravenAuthUsage;
}

function dayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function hourKey(now = new Date()): string {
  return now.toISOString().slice(0, 13);
}

function windowFor(kind: AuthUsageKind, now = new Date()): string {
  return kind === 'connection_request' ? dayKey(now) : hourKey(now);
}

function limitFor(kind: AuthUsageKind): number {
  const limits = getUnverifiedAuthLimits();
  return kind === 'connection_request'
    ? limits.maxConnectionRequestsPerDay
    : limits.maxPrivateProfileViewsPerHour;
}

async function ensureUsageTable(): Promise<void> {
  if (shouldUseAuthMemoryStore()) {
    warnAuthMemoryFallbackOnce();
    return;
  }
  if (!getDatabaseUrl()) return;
  if (!globalForLimits.__ravenAuthUsageSetup) {
    const sql = getSql();
    globalForLimits.__ravenAuthUsageSetup = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS raven_auth_usage (
          user_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          window_key TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, kind, window_key)
        )
      `;
    })();
  }
  await globalForLimits.__ravenAuthUsageSetup;
}

function consumeMemory(
  userId: string,
  kind: AuthUsageKind,
): AuthUsageResult {
  const limit = limitFor(kind);
  const windowKey = windowFor(kind);
  const key = `${userId}:${kind}:${windowKey}`;
  const map = memoryMap();
  const existing = map.get(key);
  if (!existing || existing.windowKey !== windowKey) {
    map.set(key, { count: 1, windowKey });
    return { allowed: true, remaining: Math.max(0, limit - 1), limit, kind };
  }
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, limit, kind };
  }
  existing.count += 1;
  map.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    limit,
    kind,
  };
}

async function consumePostgres(
  userId: string,
  kind: AuthUsageKind,
): Promise<AuthUsageResult> {
  await ensureUsageTable();
  const sql = getSql();
  const limit = limitFor(kind);
  const windowKey = windowFor(kind);
  const now = new Date().toISOString();

  // Ensure row exists at 0, then conditionally increment under the limit.
  await sql`
    INSERT INTO raven_auth_usage (user_id, kind, window_key, count, updated_at)
    VALUES (${userId}, ${kind}, ${windowKey}, 0, ${now})
    ON CONFLICT (user_id, kind, window_key) DO NOTHING
  `;

  const rows = await sql`
    UPDATE raven_auth_usage
    SET count = count + 1, updated_at = ${now}
    WHERE user_id = ${userId}
      AND kind = ${kind}
      AND window_key = ${windowKey}
      AND count < ${limit}
    RETURNING count
  `;

  if (!rows.length) {
    return { allowed: false, remaining: 0, limit, kind };
  }

  const count = Number(rows[0].count);
  return {
    allowed: true,
    remaining: Math.max(0, limit - count),
    limit,
    kind,
  };
}

/**
 * Server-side unverified-session usage limits.
 * Keys by authenticated user id — not spoofable from localStorage.
 */
export async function consumeAuthUsage(
  userId: string,
  kind: AuthUsageKind,
): Promise<AuthUsageResult> {
  if (!userId.trim()) {
    return { allowed: false, remaining: 0, limit: limitFor(kind), kind };
  }
  if (shouldUseAuthMemoryStore() || !getDatabaseUrl()) {
    return consumeMemory(userId, kind);
  }
  return consumePostgres(userId, kind);
}

/** Test helper */
export function resetAuthUsageMemory(): void {
  globalForLimits.__ravenAuthUsage = new Map();
  globalForLimits.__ravenAuthUsageSetup = undefined;
}
