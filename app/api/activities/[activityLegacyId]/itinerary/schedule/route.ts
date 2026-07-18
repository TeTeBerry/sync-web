import { NextRequest, NextResponse } from 'next/server';
import { getApiBase } from '../../../../../../lib/api';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ activityLegacyId: string }> },
) {
  const { activityLegacyId } = await context.params;
  const eventId = Number(activityLegacyId);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return NextResponse.json({ message: 'Invalid event.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${getApiBase()}/activities/${eventId}/itinerary/schedule${new URL(request.url).search}`,
      { cache: 'no-store' },
    );
    const payload = await upstream.json().catch(() => null) as { data?: unknown } | unknown;
    const body = payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined
      ? payload.data
      : payload;
    // Keep the browser-facing shape stable for ProfileTimetable. The backend
    // returns the schedule object directly (and some deployments wrap it in
    // `data`), while the profile loader consumes `{ schedule }`.
    return NextResponse.json({ schedule: body }, {
      status: upstream.status,
      headers: { 'cache-control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ message: 'Timetable unavailable.' }, { status: 503 });
  }
}
