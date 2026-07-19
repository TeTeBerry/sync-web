import { getSql } from './db';
import { getDatabaseUrl } from './db';
import type { SavedLineupSchedule } from './lineup-schedule-persistence';

type MemorySchedules = Map<string, SavedLineupSchedule>;
const globalStore = globalThis as typeof globalThis & { __ravenLineupSchedules?: MemorySchedules };
let setup: Promise<void> | null = null;

function memory(): MemorySchedules {
  if (!globalStore.__ravenLineupSchedules) globalStore.__ravenLineupSchedules = new Map();
  return globalStore.__ravenLineupSchedules;
}

function key(userId: string, eventId: number, scope?: string) {
  return `${userId}:${eventId}:${scope ?? ''}`;
}

async function ensureTable() {
  if (!getDatabaseUrl()) return;
  if (!setup) {
    const sql = getSql();
    setup = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS raven_lineup_schedules (
          user_id TEXT NOT NULL REFERENCES raven_users(id) ON DELETE CASCADE,
          event_id INTEGER NOT NULL,
          selection_scope TEXT NOT NULL DEFAULT '',
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, event_id, selection_scope)
        )
      `;
    })();
  }
  await setup;
}

export async function getSavedLineupSchedule(
  userId: string,
  eventId: number,
  scope?: string,
): Promise<SavedLineupSchedule | null> {
  if (!getDatabaseUrl()) return memory().get(key(userId, eventId, scope)) ?? null;
  await ensureTable();
  const sql = getSql();
  const rows = await sql`
    SELECT payload FROM raven_lineup_schedules
    WHERE user_id = ${userId} AND event_id = ${eventId} AND selection_scope = ${scope ?? ''}
    LIMIT 1
  `;
  return rows.length ? (rows[0].payload as SavedLineupSchedule) : null;
}

export async function saveLineupSchedule(
  userId: string,
  schedule: SavedLineupSchedule,
): Promise<SavedLineupSchedule> {
  if (!getDatabaseUrl()) {
    memory().set(key(userId, schedule.activityLegacyId, schedule.selectionScope), schedule);
    return schedule;
  }
  await ensureTable();
  const sql = getSql();
  await sql`
    INSERT INTO raven_lineup_schedules (user_id, event_id, selection_scope, payload, updated_at)
    VALUES (${userId}, ${schedule.activityLegacyId}, ${schedule.selectionScope ?? ''}, ${sql.json(schedule)}, NOW())
    ON CONFLICT (user_id, event_id, selection_scope)
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
  `;
  return schedule;
}

export async function listSavedLineupSchedules(userId: string): Promise<SavedLineupSchedule[]> {
  if (!getDatabaseUrl()) {
    const prefix = `${userId}:`;
    return [...memory().entries()]
      .filter(([entryKey]) => entryKey.startsWith(prefix))
      .map(([, schedule]) => schedule)
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }
  await ensureTable();
  const sql = getSql();
  const rows = await sql`
    SELECT payload FROM raven_lineup_schedules
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;
  return rows.map((row) => row.payload as SavedLineupSchedule);
}
