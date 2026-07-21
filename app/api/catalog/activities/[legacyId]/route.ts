import { NextResponse } from 'next/server';
import { getActivity } from '../../../../../lib/api';

export const runtime = 'nodejs';

/** Public catalog lookup for profile hydration when the list endpoint misses an id. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ legacyId: string }> },
) {
  const { legacyId: raw } = await context.params;
  const legacyId = Number(raw);
  const result = await getActivity(legacyId);
  if (result.status === 'not_found' || !result.activity) {
    return NextResponse.json({ message: 'Festival not found.' }, { status: 404 });
  }
  if (result.status === 'error') {
    return NextResponse.json(
      { message: 'Festival catalog temporarily unavailable.' },
      { status: 503 },
    );
  }
  return NextResponse.json(result.activity, {
    headers: { 'cache-control': 'public, s-maxage=120, stale-while-revalidate=600' },
  });
}
