import { getActivityTitle } from './api';
import { localizeActivity, localizedPath, DEFAULT_LOCALE, type Locale } from './i18n';
import type { JourneyTab, JourneyEntryFrom } from './planner-journey';
import type { Activity } from './types';

function slugifyTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function eventSlug(activity: Activity, locale: Locale): string {
  const localized = localizeActivity(activity, locale);
  const title = getActivityTitle(localized);
  const base = slugifyTitle(title) || 'festival';
  return `${base}-${localized.legacyId}`;
}

export function eventPath(locale: Locale, activity: Activity): string {
  return localizedPath(locale, `/events/${eventSlug(activity, locale)}`);
}

export function eventPlanPath(
  locale: Locale,
  activity: Activity,
  options?: { tab?: JourneyTab; from?: JourneyEntryFrom },
): string {
  const base = `${eventPath(locale, activity)}/plan`;
  const params = new URLSearchParams();
  const from = options?.from;
  // `tab` kept for backward-compatible deep links; scenes replace the old dashboard tabs.
  if (options?.tab) params.set('tab', options.tab);
  if (from) params.set('from', from);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function eventPlanAlternateLanguages(
  activity: Activity,
  zhActivity?: Activity,
  enActivity?: Activity,
): Record<string, string> {
  const zh = zhActivity ?? activity;
  const en = enActivity ?? activity;
  const defaultActivity = DEFAULT_LOCALE === 'zh' ? zh : en;
  const planSuffix = '/plan';
  return {
    'x-default': localizedPath(
      DEFAULT_LOCALE,
      `/events/${eventSlug(defaultActivity, DEFAULT_LOCALE)}${planSuffix}`,
    ),
    'zh-CN': localizedPath('zh', `/events/${eventSlug(zh, 'zh')}${planSuffix}`),
    en: localizedPath('en', `/events/${eventSlug(en, 'en')}${planSuffix}`),
  };
}

export function eventLineupPath(locale: Locale, activity: Activity): string {
  return `${eventPath(locale, activity)}/lineup`;
}

export function eventTravelPath(locale: Locale, activity: Activity): string {
  return `${eventPath(locale, activity)}/travel`;
}

export function parseEventLegacyId(slugParam: string): number | null {
  const decoded = decodeURIComponent(slugParam).trim();
  if (/^\d+$/.test(decoded)) return Number(decoded);

  const suffix = decoded.match(/-(\d+)$/);
  return suffix ? Number(suffix[1]) : null;
}

export function eventSlugMatches(slugParam: string, activity: Activity, locale: Locale): boolean {
  try {
    return decodeURIComponent(slugParam) === eventSlug(activity, locale);
  } catch {
    return slugParam === eventSlug(activity, locale);
  }
}

export function eventAlternateLanguages(
  activity: Activity,
  zhActivity?: Activity,
  enActivity?: Activity,
): Record<string, string> {
  const zh = zhActivity ?? activity;
  const en = enActivity ?? activity;
  const defaultActivity = DEFAULT_LOCALE === 'zh' ? zh : en;
  return {
    'x-default': localizedPath(DEFAULT_LOCALE, `/events/${eventSlug(defaultActivity, DEFAULT_LOCALE)}`),
    'zh-CN': localizedPath('zh', `/events/${eventSlug(zh, 'zh')}`),
    en: localizedPath('en', `/events/${eventSlug(en, 'en')}`),
  };
}
