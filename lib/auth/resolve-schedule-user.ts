import type { NextRequest } from 'next/server';
import { auth } from '../../auth';
import { getSessionFromCookie } from './service';
import { RAVEN_SESSION_COOKIE } from './sessions';
import { ensureUserForAuthIdentity } from './users';

/**
 * Resolve the Postgres `raven_users.id` used for lineup schedule persistence.
 * Prefer Auth.js (production Google sign-in), then legacy email session.
 * Auth.js users are bridged into `raven_users` so schedule FK inserts succeed.
 */
export async function resolveScheduleUserId(request: NextRequest): Promise<string | null> {
  const nextAuthSession = await auth();
  if (nextAuthSession?.user?.id) {
    return ensureUserForAuthIdentity({
      id: nextAuthSession.user.id,
      email: nextAuthSession.user.email,
    });
  }

  const legacy = await getSessionFromCookie(request.cookies.get(RAVEN_SESSION_COOKIE)?.value);
  if (legacy.signedIn) return legacy.user.id;
  return null;
}
