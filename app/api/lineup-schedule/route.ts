import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '../../../lib/auth/http';
import { resolveScheduleUserId } from '../../../lib/auth/resolve-schedule-user';
import { listSavedLineupSchedules } from '../../../lib/lineup-schedule-repository';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const userId = await resolveScheduleUserId(request);
  if (!userId) return jsonError(401, 'Sign in required.');
  const schedules = await listSavedLineupSchedules(userId);
  return NextResponse.json({ schedules });
}
