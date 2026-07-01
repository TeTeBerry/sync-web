import { neon } from '@neondatabase/serverless';

type WaitlistSubmission = {
  contact: string;
  eventLegacyId: number | null;
  note: string;
  sourcePath: string;
  userAgent: string;
  locale: string;
};

let setupPromise: Promise<void> | null = null;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }
  return neon(databaseUrl);
}

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
          locale TEXT NOT NULL DEFAULT 'zh',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        ALTER TABLE waitlist_submissions
        ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'zh'
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
