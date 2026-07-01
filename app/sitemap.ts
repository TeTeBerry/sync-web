import type { MetadataRoute } from 'next';
import { listActivities } from '../lib/api';
import { LOCALES, localizedPath } from '../lib/i18n';
import { cityAlternateLanguages, cityPath, listCityGroups } from '../lib/seo-cities';
import { getSiteUrl } from '../lib/site';

const siteUrl = getSiteUrl();

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function getAlternateLanguages(path = '') {
  return {
    'zh-CN': localizedPath('zh', path),
    en: localizedPath('en', path),
  };
}

function absoluteLanguages(languages: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(languages).map(([language, path]) => [
      language,
      path.startsWith('http') ? path : `${siteUrl}${path}`,
    ]),
  );
}

function getActivityLastModified(activity: Awaited<ReturnType<typeof listActivities>>[number]): Date | undefined {
  return parseDate(activity.infoUpdatedAt) ?? parseDate(activity.date);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const activities = await listActivities();
  const latestActivityModified = activities
    .map(getActivityLastModified)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return LOCALES.flatMap((locale) => [
    {
      url: `${siteUrl}${localizedPath(locale)}`,
      lastModified: latestActivityModified ?? new Date(),
      changeFrequency: 'weekly' as const,
      priority: locale === 'zh' ? 1 : 0.9,
      alternates: {
        languages: absoluteLanguages(getAlternateLanguages()),
      },
    },
    {
      url: `${siteUrl}${localizedPath(locale, '/events')}`,
      lastModified: latestActivityModified ?? new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
      alternates: {
        languages: absoluteLanguages(getAlternateLanguages('/events')),
      },
    },
    {
      url: `${siteUrl}${localizedPath(locale, '/waitlist')}`,
      lastModified: latestActivityModified ?? new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      alternates: {
        languages: absoluteLanguages(getAlternateLanguages('/waitlist')),
      },
    },
    ...listCityGroups(activities, locale).map((group) => {
      const firstActivity = group.activities[0];
      const lastModified = group.activities
        .map(getActivityLastModified)
        .filter((value): value is Date => Boolean(value))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      return {
        url: `${siteUrl}${cityPath(locale, group.city)}`,
        lastModified: lastModified ?? latestActivityModified ?? new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.72,
        alternates: {
          languages: absoluteLanguages(
            firstActivity
              ? cityAlternateLanguages(activities, firstActivity.legacyId)
              : getAlternateLanguages('/events'),
          ),
        },
      };
    }),
    ...activities.map((activity) => {
      const path = `/events/${activity.legacyId}`;
      return {
        url: `${siteUrl}${localizedPath(locale, path)}`,
        lastModified: getActivityLastModified(activity) ?? latestActivityModified ?? new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        alternates: {
          languages: absoluteLanguages(getAlternateLanguages(path)),
        },
      };
    }),
  ]);
}
