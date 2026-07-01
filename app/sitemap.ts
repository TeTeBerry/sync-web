import type { MetadataRoute } from 'next';
import { listActivities } from '../lib/api';
import { LOCALES, localizedPath } from '../lib/i18n';
import { getSiteUrl } from '../lib/site';

const siteUrl = getSiteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const activities = await listActivities();
  const lastModified = new Date();
  return LOCALES.flatMap((locale) => [
    {
      url: `${siteUrl}${localizedPath(locale)}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: locale === 'zh' ? 1 : 0.9,
    },
    {
      url: `${siteUrl}${localizedPath(locale, '/events')}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${siteUrl}${localizedPath(locale, '/waitlist')}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    ...activities.map((activity) => ({
      url: `${siteUrl}${localizedPath(locale, `/events/${activity.legacyId}`)}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]);
}
