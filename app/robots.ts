import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/site';
import { getSitemapShardCount } from '../lib/sitemap';

const siteUrl = getSiteUrl();

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: [
      `${siteUrl}/sitemap.xml`,
      ...Array.from({ length: await getSitemapShardCount() }, (_, id) =>
        `${siteUrl}/sitemap/${id}.xml`,
      ),
    ],
  };
}
