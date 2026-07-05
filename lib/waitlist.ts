import { unstable_cache } from 'next/cache';
import { getDatabaseUrl, getSql } from './db';

type WaitlistSubmission = {
  contact: string;
  eventLegacyId: number | null;
  note: string;
  sourcePath: string;
  userAgent: string;
  locale: string;
};

let setupPromise: Promise<void> | null = null;

async function ensureWaitlistTable(): Promise<void> {
  if (!setupPromise) {
    const sql = getSql();
    setupPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS waitlist_submissions (
          id BIGSERIAL PRIMARY KEY,
          contact TEXT NOT NULL,
          event_legacy_id INTEGER,
          note TEXT NOT NULL DEFAULT '',
          source_path TEXT NOT NULL DEFAULT '',
          user_agent TEXT NOT NULL DEFAULT '',
          locale TEXT NOT NULL DEFAULT 'en',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        ALTER TABLE waitlist_submissions
        ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en'
      `;
    })();
  }
  await setupPromise;
}

export async function createWaitlistSubmission(submission: WaitlistSubmission): Promise<void> {
  await ensureWaitlistTable();
  const sql = getSql();
  await sql`
    INSERT INTO waitlist_submissions (
      contact,
      event_legacy_id,
      note,
      source_path,
      user_agent,
      locale
    ) VALUES (
      ${submission.contact},
      ${submission.eventLegacyId},
      ${submission.note},
      ${submission.sourcePath},
      ${submission.userAgent},
      ${submission.locale}
    )
  `;
}

export async function findWaitlistContact(contact: string): Promise<boolean> {
  await ensureWaitlistTable();
  const sql = getSql();
  const rows = await sql`
    SELECT id
    FROM waitlist_submissions
    WHERE LOWER(TRIM(contact)) = LOWER(TRIM(${contact}))
    LIMIT 1
  `;
  return rows.length > 0;
}

const DEFAULT_WAITLIST_SOCIAL_PROOF_MIN = 10;

export function getWaitlistSocialProofMin(): number {
  const raw = process.env.WAITLIST_SOCIAL_PROOF_MIN?.trim();
  if (!raw) return DEFAULT_WAITLIST_SOCIAL_PROOF_MIN;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_WAITLIST_SOCIAL_PROOF_MIN;
}

async function fetchWaitlistCount(): Promise<number | null> {
  if (!getDatabaseUrl()) return null;

  try {
    await ensureWaitlistTable();
    const sql = getSql();
    const rows = await sql`SELECT COUNT(*)::int AS count FROM waitlist_submissions`;
    const count = rows[0]?.count;
    return typeof count === 'number' && Number.isFinite(count) ? count : null;
  } catch {
    return null;
  }
}

const getCachedWaitlistCount = unstable_cache(fetchWaitlistCount, ['waitlist-count'], {
  revalidate: 3600,
});

export async function getWaitlistCount(): Promise<number | null> {
  return getCachedWaitlistCount();
}
