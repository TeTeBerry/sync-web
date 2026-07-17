import {
  fetchActivities,
  getActivity,
  getActivityTitle,
  type ActivityFetchResult,
} from './api';
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
  return slugifyTitle(title) || 'festival';
}

export function eventPath(locale: Locale, activity: Activity): string {
  return localizedPath(locale, `/events/${eventSlug(activity, locale)}`);
}

export function eventPlanPath(
  locale: Locale,
  activity: Activity,
  options?: { tab?: JourneyTab; from?: JourneyEntryFrom; guideId?: string },
): string {
  const base = `${eventPath(locale, activity)}/plan`;
  const params = new URLSearchParams();
  const from = options?.from;
  // `tab` kept for backward-compatible deep links; scenes replace the old dashboard tabs.
  if (options?.tab) params.set('tab', options.tab);
  if (from) params.set('from', from);
  if (options?.guideId?.trim()) params.set('guideId', options.guideId.trim());
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

export function eventSquadPath(locale: Locale, activity: Activity): string {
  return `${eventPath(locale, activity)}/squad`;
}

function eventSubpageAlternateLanguages(
  activity: Activity,
  suffix: '/lineup' | '/squad',
  zhActivity?: Activity,
  enActivity?: Activity,
): Record<string, string> {
  const zh = zhActivity ?? activity;
  const en = enActivity ?? activity;
  const defaultActivity = DEFAULT_LOCALE === 'zh' ? zh : en;
  return {
    'x-default': localizedPath(
      DEFAULT_LOCALE,
      `/events/${eventSlug(defaultActivity, DEFAULT_LOCALE)}${suffix}`,
    ),
    'zh-CN': localizedPath('zh', `/events/${eventSlug(zh, 'zh')}${suffix}`),
    en: localizedPath('en', `/events/${eventSlug(en, 'en')}${suffix}`),
  };
}

export function eventLineupAlternateLanguages(
  activity: Activity,
  zhActivity?: Activity,
  enActivity?: Activity,
): Record<string, string> {
  return eventSubpageAlternateLanguages(activity, '/lineup', zhActivity, enActivity);
}

export function eventSquadAlternateLanguages(
  activity: Activity,
  zhActivity?: Activity,
  enActivity?: Activity,
): Record<string, string> {
  return eventSubpageAlternateLanguages(activity, '/squad', zhActivity, enActivity);
}

export function parseEventLegacyId(slugParam: string): number | null {
  const decoded = decodeURIComponent(slugParam).trim();
  if (/^\d+$/.test(decoded)) return Number(decoded);

  const suffix = decoded.match(/-(\d+)$/);
  return suffix ? Number(suffix[1]) : null;
}

function decodeSlugParam(slugParam: string): string {
  try {
    return decodeURIComponent(slugParam).trim();
  } catch {
    return slugParam.trim();
  }
}

export async function resolveActivityBySlug(
  slugParam: string,
  locale: Locale,
): Promise<ActivityFetchResult> {
  const decoded = decodeSlugParam(slugParam);

  const result = await fetchActivities();
  if (result.status !== 'error') {
    const matched = result.activities.find((activity) => eventSlug(activity, locale) === decoded);
    if (matched) return { activity: matched, status: 'ok' };
  }

  const legacyId = parseEventLegacyId(decoded);
  if (legacyId) {
    const legacyResult = await getActivity(legacyId);
    if (!legacyResult.activity) return legacyResult;

    const legacySlug = `${eventSlug(legacyResult.activity, locale)}-${legacyResult.activity.legacyId}`;
    if (decoded === legacySlug) return legacyResult;

    return { activity: null, status: result.status === 'error' ? 'error' : 'not_found' };
  }

  return { activity: null, status: result.status === 'error' ? 'error' : 'not_found' };
}

export function eventSlugMatches(slugParam: string, activity: Activity, locale: Locale): boolean {
  return decodeSlugParam(slugParam) === eventSlug(activity, locale);
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
