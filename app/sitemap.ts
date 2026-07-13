import type { MetadataRoute } from 'next';
import { listActivities } from '../lib/api';
import { LOCALES, DEFAULT_LOCALE, alternateLanguages, localizedPath } from '../lib/i18n';
import {
  eventAlternateLanguages,
  eventPath,
  eventPlanAlternateLanguages,
  eventPlanPath,
} from '../lib/event-slug';
import { cityAlternateLanguages, cityPath, listCityGroups } from '../lib/seo-cities';
import { getSiteUrl } from '../lib/site';
import type { Activity } from '../lib/types';

export const revalidate = 86_400;
export const dynamic = 'force-static';

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function absoluteLanguages(
  siteUrl: string,
  languages: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(languages).map(([language, path]) => [
      language,
      path.startsWith('http') ? path : `${siteUrl}${path}`,
    ]),
  );
}

function getActivityLastModified(activity: Activity): Date | undefined {
  return parseDate(activity.infoUpdatedAt) ?? parseDate(activity.date);
}

function buildCoreEntries(siteUrl: string, lastModified: Date): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) => [
    {
      url: `${siteUrl}${localizedPath(locale)}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: locale === DEFAULT_LOCALE ? 1 : 0.9,
      alternates: {
        languages: absoluteLanguages(siteUrl, alternateLanguages()),
      },
    },
    {
      url: `${siteUrl}${localizedPath(locale, '/events')}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
      alternates: {
        languages: absoluteLanguages(siteUrl, alternateLanguages('/events')),
      },
    },
  ]);
}

function buildSitemapEntries(siteUrl: string, activities: Activity[]): MetadataRoute.Sitemap {
  const latestActivityModified = activities
    .map(getActivityLastModified)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const lastModified = latestActivityModified ?? new Date();

  return LOCALES.flatMap((locale) => [
    {
      url: `${siteUrl}${localizedPath(locale)}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: locale === DEFAULT_LOCALE ? 1 : 0.9,
      alternates: {
        languages: absoluteLanguages(siteUrl, alternateLanguages()),
      },
    },
    {
      url: `${siteUrl}${localizedPath(locale, '/events')}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
      alternates: {
        languages: absoluteLanguages(siteUrl, alternateLanguages('/events')),
      },
    },
    ...listCityGroups(activities, locale).map((group) => {
      const firstActivity = group.activities[0];
      const cityLastModified = group.activities
        .map(getActivityLastModified)
        .filter((value): value is Date => Boolean(value))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      return {
        url: `${siteUrl}${cityPath(locale, group.city)}`,
        lastModified: cityLastModified ?? lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.72,
        alternates: {
          languages: absoluteLanguages(
            siteUrl,
            firstActivity
              ? cityAlternateLanguages(activities, firstActivity.legacyId)
              : alternateLanguages('/events'),
          ),
        },
      };
    }),
    ...activities.flatMap((activity) => {
      const activityLastModified = getActivityLastModified(activity) ?? lastModified;
      const entries: MetadataRoute.Sitemap = [
        {
          url: `${siteUrl}${eventPath(locale, activity)}`,
          lastModified: activityLastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
          alternates: {
            languages: absoluteLanguages(siteUrl, eventAlternateLanguages(activity)),
          },
        },
      ];

      if (process.env.SITEMAP_INCLUDE_PLAN === 'true') {
        entries.push({
          url: `${siteUrl}${eventPlanPath(locale, activity)}`,
          lastModified: activityLastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.75,
          alternates: {
            languages: absoluteLanguages(siteUrl, eventPlanAlternateLanguages(activity)),
          },
        });
      }

      return entries;
    }),
  ]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  try {
    const activities = await listActivities();
    if (!activities.length) {
      return buildCoreEntries(siteUrl, lastModified);
    }
    return buildSitemapEntries(siteUrl, activities);
  } catch {
    return buildCoreEntries(siteUrl, lastModified);
  }
}
