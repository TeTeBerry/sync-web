import { unstable_cache } from 'next/cache';
import type { MetadataRoute } from 'next';
import { fetchActivities } from './api';
import { LOCALES, DEFAULT_LOCALE, alternateLanguages, localizedPath } from './i18n';
import {
  eventAlternateLanguages,
  eventLineupAlternateLanguages,
  eventLineupPath,
  eventPath,
  eventPlanAlternateLanguages,
  eventPlanPath,
} from './event-slug';
import { cityAlternateLanguages, cityPath, listCityGroups } from './seo-cities';
import { getSiteUrl } from './site';
import type { Activity } from './types';

export const SITEMAP_PAGE_SIZE = 5000;

type SitemapActivityResult = {
  activities: Activity[];
  status: 'ok' | 'empty';
};

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function absoluteLanguages(
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

/** Only use source timestamps. Never substitute the current time for content freshness. */
export function getActivityLastModified(activity: Activity): Date | undefined {
  return parseDate(activity.updatedAt) ?? parseDate(activity.infoUpdatedAt);
}

function reportSitemapFailure(context: string, error: unknown): void {
  console.error(
    JSON.stringify({
      event: 'sitemap_generation_failed',
      context,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
}

const getCachedSitemapActivities = unstable_cache(
  async (): Promise<SitemapActivityResult> => {
    const result = await fetchActivities();
    if (result.status === 'error') {
      throw new Error('Activity catalog unavailable while generating sitemap');
    }
    return {
      activities: result.activities,
      status: result.activities.length ? 'ok' : 'empty',
    };
  },
  ['sitemap-activities'],
  { revalidate: 86_400 },
);

export async function getSitemapActivities(): Promise<Activity[]> {
  try {
    return (await getCachedSitemapActivities()).activities;
  } catch (error) {
    reportSitemapFailure('activity_catalog', error);
    throw error;
  }
}

export async function getSitemapShardCount(): Promise<number> {
  try {
    const activities = await getSitemapActivities();
    return Math.ceil(activities.length / SITEMAP_PAGE_SIZE);
  } catch {
    return 0;
  }
}

export function buildCoreSitemap(siteUrl = getSiteUrl()): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) => [
    {
      url: `${siteUrl}${localizedPath(locale)}`,
      changeFrequency: 'weekly' as const,
      priority: locale === DEFAULT_LOCALE ? 1 : 0.9,
      alternates: {
        languages: absoluteLanguages(siteUrl, alternateLanguages()),
      },
    },
    {
      url: `${siteUrl}${localizedPath(locale, '/events')}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
      alternates: {
        languages: absoluteLanguages(siteUrl, alternateLanguages('/events')),
      },
    },
  ]);
}

export function buildActivitySitemap(
  activities: Activity[],
  shardId: number,
  siteUrl = getSiteUrl(),
): MetadataRoute.Sitemap {
  const start = shardId * SITEMAP_PAGE_SIZE;
  const shardActivities = activities.slice(start, start + SITEMAP_PAGE_SIZE);
  const entries: MetadataRoute.Sitemap = [];

  // City pages are derived from the complete catalog, so emit them once in the first shard.
  if (shardId === 0) {
    for (const locale of LOCALES) {
      entries.push(
        ...listCityGroups(activities, locale).map((group) => {
          const cityLastModified = group.activities
            .map(getActivityLastModified)
            .filter((value): value is Date => Boolean(value))
            .sort((a, b) => b.getTime() - a.getTime())[0];
          const firstActivity = group.activities[0];

          return {
            url: `${siteUrl}${cityPath(locale, group.city)}`,
            ...(cityLastModified ? { lastModified: cityLastModified } : {}),
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
      );
    }
  }

  for (const locale of LOCALES) {
    for (const activity of shardActivities) {
      const lastModified = getActivityLastModified(activity);
      const localizedEntries = [
        {
          url: `${siteUrl}${eventPath(locale, activity)}`,
          priority: 0.8,
          alternates: eventAlternateLanguages(activity),
        },
        {
          url: `${siteUrl}${eventLineupPath(locale, activity)}`,
          priority: 0.78,
          alternates: eventLineupAlternateLanguages(activity),
        },
        {
          url: `${siteUrl}${eventPlanPath(locale, activity)}`,
          priority: 0.75,
          alternates: eventPlanAlternateLanguages(activity),
        },
      ];

      entries.push(
        ...localizedEntries.map((entry) => ({
          url: entry.url,
          ...(lastModified ? { lastModified } : {}),
          changeFrequency: 'weekly' as const,
          priority: entry.priority,
          alternates: {
            languages: absoluteLanguages(siteUrl, entry.alternates),
          },
        })),
      );
    }
  }

  return entries;
}

export function escapeXml(value: string): string {
  return value.replace(
    /[<>&'\"]/g,
    (character) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[
        character
      ] ?? character,
  );
}

export function sitemapXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries
    .map((entry) => {
      const alternates = entry.alternates?.languages
        ? Object.entries(entry.alternates.languages)
            .map(
              ([language, href]) =>
                `<xhtml:link rel="alternate" hreflang="${escapeXml(language)}" href="${escapeXml(String(href))}" />`,
            )
            .join('')
        : '';
      const lastModified = entry.lastModified
        ? `<lastmod>${escapeXml(new Date(entry.lastModified).toISOString())}</lastmod>`
        : '';
      const changeFrequency = entry.changeFrequency
        ? `<changefreq>${escapeXml(entry.changeFrequency)}</changefreq>`
        : '';
      const priority = entry.priority === undefined ? '' : `<priority>${entry.priority}</priority>`;

      return `<url><loc>${escapeXml(String(entry.url))}</loc>${alternates}${lastModified}${changeFrequency}${priority}</url>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`;
}
