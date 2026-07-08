import { CATALOG_TIMEZONE } from './activity-date';
import type { Activity } from './types';

const COUNTRY_TIMEZONE: Record<string, string> = {
  中国: CATALOG_TIMEZONE,
  china: CATALOG_TIMEZONE,
  泰国: 'Asia/Bangkok',
  thailand: 'Asia/Bangkok',
  韩国: 'Asia/Seoul',
  korea: 'Asia/Seoul',
  'south korea': 'Asia/Seoul',
  日本: 'Asia/Tokyo',
  japan: 'Asia/Tokyo',
  印度: 'Asia/Kolkata',
  india: 'Asia/Kolkata',
  香港: 'Asia/Hong_Kong',
  澳门: 'Asia/Macau',
  台湾: 'Asia/Taipei',
  中国香港: 'Asia/Hong_Kong',
  中国澳门: 'Asia/Macau',
  中国台湾: 'Asia/Taipei',
  hong: 'Asia/Hong_Kong',
  macau: 'Asia/Macau',
  taiwan: 'Asia/Taipei',
  荷兰: 'Europe/Amsterdam',
  netherlands: 'Europe/Amsterdam',
  比利时: 'Europe/Brussels',
  belgium: 'Europe/Brussels',
  克罗地亚: 'Europe/Zagreb',
  croatia: 'Europe/Zagreb',
  罗马尼亚: 'Europe/Bucharest',
  romania: 'Europe/Bucharest',
  英国: 'Europe/London',
  'united kingdom': 'Europe/London',
  uk: 'Europe/London',
  美国: 'America/New_York',
  'united states': 'America/New_York',
  usa: 'America/New_York',
  us: 'America/New_York',
  阿联酋: 'Asia/Dubai',
  uae: 'Asia/Dubai',
  'united arab emirates': 'Asia/Dubai',
  沙特: 'Asia/Riyadh',
  'saudi arabia': 'Asia/Riyadh',
  澳大利亚: 'Australia/Sydney',
  australia: 'Australia/Sydney',
  西班牙: 'Europe/Madrid',
  spain: 'Europe/Madrid',
  德国: 'Europe/Berlin',
  germany: 'Europe/Berlin',
  法国: 'Europe/Paris',
  france: 'Europe/Paris',
  意大利: 'Europe/Rome',
  italy: 'Europe/Rome',
  葡萄牙: 'Europe/Lisbon',
  portugal: 'Europe/Lisbon',
  墨西哥: 'America/Mexico_City',
  mexico: 'America/Mexico_City',
  加拿大: 'America/Toronto',
  canada: 'America/Toronto',
};

const LOCATION_TIMEZONE_HINTS: Array<{ pattern: RegExp; timeZone: string }> = [
  { pattern: /香港|hong\s*kong/i, timeZone: 'Asia/Hong_Kong' },
  { pattern: /澳门|macau|macao/i, timeZone: 'Asia/Macau' },
  { pattern: /台湾|taipei|taiwan|高雄|台中/i, timeZone: 'Asia/Taipei' },
  { pattern: /曼谷|芭提雅|普吉|bangkok|pattaya|phuket|thailand/i, timeZone: 'Asia/Bangkok' },
  { pattern: /首尔|仁川|釜山|seoul|incheon|busan|korea/i, timeZone: 'Asia/Seoul' },
  { pattern: /东京|大阪|横滨|tokyo|osaka|yokohama|japan/i, timeZone: 'Asia/Tokyo' },
  { pattern: /孟买|mumbai|delhi|india/i, timeZone: 'Asia/Kolkata' },
  { pattern: /深圳|上海|珠海|广州|北京|成都|杭州|南京|武汉|西安|china/i, timeZone: CATALOG_TIMEZONE },
  { pattern: /boom|比利时|belgium|brussels/i, timeZone: 'Europe/Brussels' },
  { pattern: /荷兰|amsterdam|walibi|netherlands/i, timeZone: 'Europe/Amsterdam' },
  { pattern: /克罗地亚|split|croatia|zagreb/i, timeZone: 'Europe/Zagreb' },
  { pattern: /罗马尼亚|cluj|romania|bucharest/i, timeZone: 'Europe/Bucharest' },
  { pattern: /英国|warrington|london|manchester|uk\b/i, timeZone: 'Europe/London' },
  { pattern: /迪拜|dubai|阿联酋|uae/i, timeZone: 'Asia/Dubai' },
  { pattern: /利雅得|riyadh|沙特|saudi/i, timeZone: 'Asia/Riyadh' },
  { pattern: /洛杉矶|las vegas|vegas|california|san francisco|la\b/i, timeZone: 'America/Los_Angeles' },
  { pattern: /芝加哥|chicago|texas|austin|houston|dallas/i, timeZone: 'America/Chicago' },
  { pattern: /丹佛|denver|colorado/i, timeZone: 'America/Denver' },
  { pattern: /奥兰多|orlando|迈阿密|miami|纽约|new york|ohio|legend valley|edc/i, timeZone: 'America/New_York' },
  { pattern: /悉尼|sydney|墨尔本|melbourne|australia/i, timeZone: 'Australia/Sydney' },
  { pattern: /柏林|berlin|德国|germany/i, timeZone: 'Europe/Berlin' },
  { pattern: /巴黎|paris|法国|france/i, timeZone: 'Europe/Paris' },
  { pattern: /巴塞罗那|马德里|spain|barcelona|madrid/i, timeZone: 'Europe/Madrid' },
  { pattern: /里斯本|lisbon|portugal/i, timeZone: 'Europe/Lisbon' },
  { pattern: /罗马|米兰|italy|rome|milan/i, timeZone: 'Europe/Rome' },
  { pattern: /墨西哥|mexico city|cdmx/i, timeZone: 'America/Mexico_City' },
  { pattern: /多伦多|vancouver|montreal|canada/i, timeZone: 'America/Toronto' },
];

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function timezoneFromCountry(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  return COUNTRY_TIMEZONE[normalizeToken(trimmed)] ?? COUNTRY_TIMEZONE[trimmed];
}

function timezoneFromText(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  for (const hint of LOCATION_TIMEZONE_HINTS) {
    if (hint.pattern.test(value)) return hint.timeZone;
  }
  return undefined;
}

/** IANA timezone for interpreting festival calendar dates on the event detail countdown. */
export function resolveActivityTimezone(
  activity: Pick<Activity, 'area' | 'city' | 'location' | 'region'>,
): string {
  const fromLocation =
    timezoneFromText(activity.location) ??
    timezoneFromText(activity.city) ??
    timezoneFromText(activity.area);

  if (fromLocation) return fromLocation;

  const fromArea = timezoneFromCountry(activity.area);
  if (fromArea) return fromArea;

  if (activity.region === 'domestic') return CATALOG_TIMEZONE;
  if (activity.region === 'hmt') return CATALOG_TIMEZONE;

  return CATALOG_TIMEZONE;
}
