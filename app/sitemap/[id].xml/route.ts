import { NextResponse } from 'next/server';
import {
  buildActivitySitemap,
  getSitemapActivities,
  sitemapXml,
} from '../../../lib/sitemap';

export const revalidate = 86_400;

type SitemapShardRouteProps = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

export async function GET(
  _request: Request,
  { params }: SitemapShardRouteProps,
): Promise<Response> {
  const rawId = (await params).id;
  if (Array.isArray(rawId)) {
    return new NextResponse('Not Found', { status: 404 });
  }
  const shardId = Number(rawId);

  if (!Number.isInteger(shardId) || shardId < 0) {
    return new NextResponse('Not Found', { status: 404 });
  }

  try {
    const activities = await getSitemapActivities();
    const entries = buildActivitySitemap(activities, shardId);
    if (!entries.length) {
      return new NextResponse('Not Found', { status: 404 });
    }

    return new NextResponse(sitemapXml(entries), {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch {
    // A 503 makes catalog failures visible to crawlers and uptime monitoring.
    return new NextResponse('Sitemap temporarily unavailable', { status: 503 });
  }
}
