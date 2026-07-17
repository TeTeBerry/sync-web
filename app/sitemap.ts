import type { MetadataRoute } from 'next';
import { buildCoreSitemap } from '../lib/sitemap';

export const revalidate = 86_400;
export const dynamic = 'force-static';

/** Core sitemap remains stable even when the activity catalog is unavailable. */
export default function sitemap(): MetadataRoute.Sitemap {
  return buildCoreSitemap();
}
