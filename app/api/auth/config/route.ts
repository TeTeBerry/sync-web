import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    google: Boolean(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim()),
    email: false,
    mock: process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_MOCK_LOGIN === 'true',
  }, { headers: { 'cache-control': 'no-store' } });
}
