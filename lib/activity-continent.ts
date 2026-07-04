import type { Activity } from './types';

export type ActivityContinent =
  | 'asia'
  | 'europe'
  | 'north_america'
  | 'middle_east'
  | 'oceania'
  | 'south_america'
  | 'africa';

const COUNTRY_CONTINENT: Record<string, ActivityContinent> = {
  // Asia
  中国: 'asia',
  china: 'asia',
  泰国: 'asia',
  thailand: 'asia',
  韩国: 'asia',
  korea: 'asia',
  'south korea': 'asia',
  日本: 'asia',
  japan: 'asia',
  印度: 'asia',
  india: 'asia',
  香港: 'asia',
  澳门: 'asia',
  台湾: 'asia',
  中国香港: 'asia',
  中国澳门: 'asia',
  中国台湾: 'asia',
  hong: 'asia',
  macau: 'asia',
  taiwan: 'asia',
  // Europe
  荷兰: 'europe',
  netherlands: 'europe',
  比利时: 'europe',
  belgium: 'europe',
  克罗地亚: 'europe',
  croatia: 'europe',
  罗马尼亚: 'europe',
  romania: 'europe',
  英国: 'europe',
  'united kingdom': 'europe',
  uk: 'europe',
  // North America
  美国: 'north_america',
  'united states': 'north_america',
  usa: 'north_america',
  us: 'north_america',
  // Middle East
  阿联酋: 'middle_east',
  uae: 'middle_east',
  'united arab emirates': 'middle_east',
  沙特: 'middle_east',
  'saudi arabia': 'middle_east',
};

const LOCATION_CONTINENT_HINTS: Array<{ pattern: RegExp; continent: ActivityContinent }> = [
  { pattern: /泰国|曼谷|芭提雅|普吉|thailand|bangkok|pattaya|phuket/i, continent: 'asia' },
  { pattern: /韩国|首尔|仁川|korea|seoul|incheon/i, continent: 'asia' },
  { pattern: /日本|东京|tokyo|japan/i, continent: 'asia' },
  { pattern: /印度|孟买|mumbai|india/i, continent: 'asia' },
  { pattern: /深圳|上海|珠海|广州|北京|中国|china/i, continent: 'asia' },
  { pattern: /荷兰|比利时|克罗地亚|罗马尼亚|英国|europe|amsterdam|belgium|croatia|romania|uk|warrington|split|cluj|boom/i, continent: 'europe' },
  { pattern: /美国|奥兰多|俄亥俄|orlando|ohio|legend valley|united states|usa/i, continent: 'north_america' },
  { pattern: /阿联酋|迪拜|沙特|利雅得|dubai|riyadh|saudi|uae/i, continent: 'middle_east' },
];

export const ACTIVITY_CONTINENTS: ActivityContinent[] = [
  'asia',
  'europe',
  'north_america',
  'middle_east',
];

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function continentFromCountry(value?: string): ActivityContinent | undefined {
  if (!value?.trim()) return undefined;
  const normalized = normalizeToken(value);
  return COUNTRY_CONTINENT[normalized] ?? COUNTRY_CONTINENT[value.trim()];
}

function continentFromText(value?: string): ActivityContinent | undefined {
  if (!value?.trim()) return undefined;
  for (const hint of LOCATION_CONTINENT_HINTS) {
    if (hint.pattern.test(value)) return hint.continent;
  }
  return undefined;
}

export function getActivityContinent(activity: Activity): ActivityContinent | undefined {
  return (
    continentFromCountry(activity.area) ??
    continentFromText(activity.location) ??
    continentFromText(activity.city) ??
    (activity.region === 'domestic' || activity.region === 'hmt' ? 'asia' : undefined)
  );
}

export function isActivityContinent(value: string): value is ActivityContinent {
  return (ACTIVITY_CONTINENTS as readonly string[]).includes(value);
}

export function activityMatchesContinent(
  activity: Activity,
  continent: ActivityContinent,
): boolean {
  return getActivityContinent(activity) === continent;
}
