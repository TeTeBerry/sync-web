import { getActivityTitle } from './api';
import type { Activity } from './types';
import { localizeActivities, localizedPath, DEFAULT_LOCALE, type Locale } from './i18n';

export type CityGroup = {
  city: string;
  slug: string;
  area?: string;
  activities: Activity[];
};

function normalizeCityName(value?: string): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function activityCity(activity: Activity): string {
  return normalizeCityName(activity.city ?? activity.area ?? activity.location?.split(/[·,，]/)[0]);
}

export function citySlug(city: string): string {
  return encodeURIComponent(
    normalizeCityName(city)
      .toLowerCase()
      .replace(/\s+/g, '-'),
  );
}

function comparableSlug(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function citySlugMatches(city: string, slug: string): boolean {
  return comparableSlug(citySlug(city)) === comparableSlug(slug);
}

export function cityPath(locale: Locale, city: string): string {
  return localizedPath(locale, `/cities/${citySlug(city)}`);
}

export function listCityGroups(activities: Activity[], locale: Locale): CityGroup[] {
  const groups = new Map<string, CityGroup>();

  for (const activity of localizeActivities(activities, locale)) {
    const city = activityCity(activity);
    if (!city) continue;

    const key = city.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.activities.push(activity);
      if (!existing.area && activity.area) existing.area = activity.area;
    } else {
      groups.set(key, {
        city,
        slug: citySlug(city),
        area: activity.area,
        activities: [activity],
      });
    }
  }

  return [...groups.values()].sort((left, right) => {
    const activityDelta = right.activities.length - left.activities.length;
    if (activityDelta !== 0) return activityDelta;
    return left.city.localeCompare(right.city);
  });
}

export function findCityGroup(
  activities: Activity[],
  locale: Locale,
  slug: string,
): CityGroup | undefined {
  return listCityGroups(activities, locale).find((group) => citySlugMatches(group.city, slug));
}

export function cityDescription(group: CityGroup, locale: Locale): string {
  const topEvents = group.activities
    .slice(0, 3)
    .map(getActivityTitle)
    .join(locale === 'zh' ? '、' : ', ');
  if (locale === 'zh') {
    return `浏览 ${group.city} 电音节与电子音乐活动，查看时间、地点与阵容。${topEvents ? `收录活动包括 ${topEvents}。` : ''}`;
  }
  return `Browse electronic festivals and rave events in ${group.city}, including dates, venues, and lineups.${topEvents ? ` Featured events include ${topEvents}.` : ''}`;
}

export function cityTitle(group: CityGroup, locale: Locale): string {
  if (locale === 'zh') return `${group.city}电音节与电子音乐活动`;
  return `${group.city} electronic festivals and rave events`;
}

export function cityAlternateLanguages(
  activities: Activity[],
  targetLegacyId: number,
): Record<string, string> {
  const zhGroup = listCityGroups(activities, 'zh').find((group) =>
    group.activities.some((activity) => activity.legacyId === targetLegacyId),
  );
  const enGroup = listCityGroups(activities, 'en').find((group) =>
    group.activities.some((activity) => activity.legacyId === targetLegacyId),
  );

  const defaultGroup = DEFAULT_LOCALE === 'zh' ? zhGroup : enGroup;

  return {
    'x-default': defaultGroup
      ? cityPath(DEFAULT_LOCALE, defaultGroup.city)
      : localizedPath(DEFAULT_LOCALE, '/events'),
    'zh-CN': zhGroup ? cityPath('zh', zhGroup.city) : localizedPath('zh', '/events'),
    en: enGroup ? cityPath('en', enGroup.city) : localizedPath('en', '/events'),
  };
}
