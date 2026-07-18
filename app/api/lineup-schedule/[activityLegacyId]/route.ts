import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { getSessionFromCookie } from '../../../../lib/auth/service';
import { jsonError, rejectUnsafeMutation } from '../../../../lib/auth/http';
import { RAVEN_SESSION_COOKIE } from '../../../../lib/auth/sessions';
import { getSavedLineupSchedule, saveLineupSchedule } from '../../../../lib/lineup-schedule-repository';
import { normalizeSavedLineupSchedule } from '../../../../lib/lineup-schedule-persistence';

export const runtime = 'nodejs';

async function userIdFor(request: NextRequest): Promise<string | null> {
  const legacy = await getSessionFromCookie(request.cookies.get(RAVEN_SESSION_COOKIE)?.value);
  if (legacy.signedIn) return legacy.user.id;
  const nextAuthSession = await auth();
  return nextAuthSession?.user?.id ?? null;
}

async function paramsFor(context: { params: Promise<{ activityLegacyId: string }> }) {
  const { activityLegacyId } = await context.params;
  const eventId = Number(activityLegacyId);
  return Number.isInteger(eventId) && eventId > 0 ? eventId : null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ activityLegacyId: string }> }) {
  const userId = await userIdFor(request);
  if (!userId) return jsonError(401, 'Sign in required.');
  const eventId = await paramsFor(context);
  if (!eventId) return jsonError(400, 'Invalid event.');
  const scope = new URL(request.url).searchParams.get('scope') || undefined;
  const schedule = await getSavedLineupSchedule(userId, eventId, scope);
  return NextResponse.json({ schedule });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ activityLegacyId: string }> }) {
  const blocked = rejectUnsafeMutation(request);
  if (blocked) return blocked;
  const userId = await userIdFor(request);
  if (!userId) return jsonError(401, 'Sign in required.');
  const eventId = await paramsFor(context);
  if (!eventId) return jsonError(400, 'Invalid event.');
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'Invalid schedule.'); }
  const scope = body && typeof body === 'object' && typeof (body as { selectionScope?: unknown }).selectionScope === 'string'
    ? (body as { selectionScope: string }).selectionScope
    : undefined;
  const schedule = normalizeSavedLineupSchedule(body, eventId, scope);
  if (!schedule) return jsonError(400, 'Invalid schedule.');
  await saveLineupSchedule(userId, schedule);
  return NextResponse.json({ schedule });
}
