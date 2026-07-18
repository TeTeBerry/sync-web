import type { RavenPlaceSuggestion } from './api';

export type PlannerOriginListItem = {
  key: string;
  label: string;
  kind: 'preset' | 'city';
  originValue: string;
  subtitle?: string;
  suggestion?: RavenPlaceSuggestion;
};

/** Known preset cities → country so originValue stays `City, Country` like remote hits. */
const PRESET_COUNTRY_BY_CITY: Record<string, string> = {
  'new york': 'United States',
  london: 'United Kingdom',
  tokyo: 'Japan',
  singapore: 'Singapore',
  shanghai: 'China',
  'los angeles': 'United States',
  纽约: '美国',
  伦敦: '英国',
  东京: '日本',
  新加坡: '新加坡',
  上海: '中国',
  洛杉矶: '美国',
  beijing: 'China',
  guangzhou: 'China',
  shenzhen: 'China',
  hangzhou: 'China',
  chengdu: 'China',
  wuhan: 'China',
  chongqing: 'China',
  xian: 'China',
  'hong kong': 'Hong Kong',
  macau: 'Macau',
  bangkok: 'Thailand',
  pattaya: 'Thailand',
  phuket: 'Thailand',
  seoul: 'South Korea',
  osaka: 'Japan',
  paris: 'France',
  amsterdam: 'Netherlands',
  berlin: 'Germany',
  frankfurt: 'Germany',
  madrid: 'Spain',
  rome: 'Italy',
  barcelona: 'Spain',
  dubai: 'United Arab Emirates',
  sydney: 'Australia',
  melbourne: 'Australia',
  toronto: 'Canada',
  vancouver: 'Canada',
  'san francisco': 'United States',
  chicago: 'United States',
  boston: 'United States',
  'mexico city': 'Mexico',
  'sao paulo': 'Brazil',
};

/** Small client-side safety net for production deployments when the remote catalog is unavailable. */
const OFFLINE_ORIGIN_CITIES = [
  '北京', '广州', '深圳', '杭州', '南京', '成都', '武汉', '重庆', '西安', '苏州', '天津',
  '青岛', '厦门', '长沙', '郑州', '珠海', '宁波', '昆明', '南宁', '香港', '澳门',
  'Beijing', 'Guangzhou', 'Shenzhen', 'Hangzhou', 'Nanjing', 'Chengdu', 'Wuhan', 'Chongqing',
  'Xi’an', 'Qingdao', 'Xiamen', 'Changsha', 'Bangkok', 'Pattaya', 'Phuket', 'Seoul', 'Osaka',
  'Paris', 'Amsterdam', 'Berlin', 'Frankfurt', 'Madrid', 'Rome', 'Barcelona', 'Dubai', 'Sydney',
  'Melbourne', 'Toronto', 'Vancouver', 'San Francisco', 'Chicago', 'Boston', 'Mexico City', 'São Paulo',
] as const;

/** Build a single-select origin option; city+country keeps same-named cities distinct. */
export function suggestionToOriginItem(
  suggestion: RavenPlaceSuggestion,
): PlannerOriginListItem {
  const city = cleanCityLabel(
    suggestion.city.trim() || suggestion.title.trim(),
    suggestion.country.trim(),
  );
  const country = suggestion.country.trim();
  const originValue = country ? `${city}, ${country}` : city;
  // Avoid repeating country in both title and subtitle.
  const subtitle =
    country && !city.toLowerCase().includes(country.toLowerCase())
      ? country
      : undefined;
  return {
    key: `city:${city.toLowerCase()}:${country.toLowerCase()}`,
    label: city,
    kind: 'city',
    originValue,
    subtitle,
    suggestion,
  };
}

/** Build a preset option with the same `City, Country` originValue shape as remote. */
export function presetToOriginItem(city: string): PlannerOriginListItem {
  const label = city.trim();
  const country = PRESET_COUNTRY_BY_CITY[label.toLowerCase()] ?? PRESET_COUNTRY_BY_CITY[label];
  const originValue = country ? `${label}, ${country}` : label;
  return {
    key: country
      ? `preset:${label.toLowerCase()}:${country.toLowerCase()}`
      : `preset:${label.toLowerCase()}`,
    label,
    kind: 'preset',
    originValue,
    subtitle: country,
  };
}

/** Whether a card should appear selected for the current origin preference. */
export function isOriginOptionSelected(
  preferencesOrigin: string,
  item: Pick<PlannerOriginListItem, 'originValue'>,
): boolean {
  return Boolean(preferencesOrigin) && preferencesOrigin === item.originValue;
}

/**
 * Merge remote city suggestions with locale presets.
 * - No card is selected by default (caller keeps preferences.origin empty until click).
 * - Remote wins over presets with the same city name (avoids duplicate London cards).
 * - Remote rows are deduped by city+country.
 */
export function buildOriginOptions(input: {
  presets: readonly string[];
  query: string;
  remote: RavenPlaceSuggestion[];
}): PlannerOriginListItem[] {
  const query = input.query.trim().toLowerCase();
  const presetItems = input.presets
    .filter((city) => !query || city.toLowerCase().includes(query))
    .map(presetToOriginItem);

  if (!query) return dedupeOriginItems(presetItems);

  const remoteItems = dedupeOriginItems(
    input.remote.map(suggestionToOriginItem),
  );
  if (!remoteItems.length) {
    const offlineItems = OFFLINE_ORIGIN_CITIES
      .filter((city) => city.toLowerCase().includes(query))
      .map(presetToOriginItem);
    return dedupeOriginItems([...presetItems, ...offlineItems]);
  }

  const remoteCityNames = new Set(
    remoteItems.map((item) => item.label.toLowerCase()),
  );
  const merged = [...remoteItems];
  for (const preset of presetItems) {
    // Same city name as a remote hit → drop preset (prevents "London" + "London / UK").
    if (remoteCityNames.has(preset.label.toLowerCase())) continue;
    merged.push(preset);
  }
  return dedupeOriginItems(merged);
}

function cleanCityLabel(city: string, country: string): string {
  const trimmed = city.trim();
  if (!country) return trimmed;
  // Strip trailing ", Country" if the API already baked country into city/title.
  const suffix = `, ${country}`;
  if (trimmed.toLowerCase().endsWith(suffix.toLowerCase())) {
    return trimmed.slice(0, trimmed.length - suffix.length).trim() || trimmed;
  }
  return trimmed;
}

function dedupeOriginItems(
  items: PlannerOriginListItem[],
): PlannerOriginListItem[] {
  const seen = new Set<string>();
  const out: PlannerOriginListItem[] = [];
  for (const item of items) {
    const key = item.key.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
