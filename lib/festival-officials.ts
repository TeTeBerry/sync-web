import type { Activity } from './types';

type FestivalOfficialData = {
  officialUrl: string;
  ticketUrl?: string;
  organizer?: string;
  countryCode?: string;
};

/**
 * Curated official destinations. Keep this list conservative: an entry is only
 * added when the URL is maintained by the festival or its named organizer.
 */
const FESTIVAL_OFFICIALS: Record<string, FestivalOfficialData> = {
  tomorrowland: {
    officialUrl: 'https://thailand.tomorrowland.com/en/welcome/',
    ticketUrl: 'https://thailand.tomorrowland.com/en/sales-info/official-sales-channels/',
    organizer: 'Tomorrowland',
    countryCode: 'TH',
  },
  defqon1: {
    officialUrl: 'https://www.defqon1.nl/',
    organizer: 'Q-dance',
    countryCode: 'NL',
  },
  s2o: {
    officialUrl: 'https://www.s2okorea.com/',
    organizer: 'S2O',
    countryCode: 'KR',
  },
  'edc-thailand': {
    officialUrl: 'https://thailand.edc.com/en/',
    ticketUrl: 'https://thailand.edc.com/en/tickets/',
    organizer: 'Insomniac',
    countryCode: 'TH',
  },
  'world-dj-festival': {
    officialUrl: 'https://worlddjfestival-jp.com/',
    organizer: 'World DJ Festival Japan',
    countryCode: 'JP',
  },
  'tomorrowland-belgium': {
    officialUrl: 'https://belgium.tomorrowland.com/en/',
    ticketUrl: 'https://belgium.tomorrowland.com/en/sales-info/',
    organizer: 'Tomorrowland',
    countryCode: 'BE',
  },
  'edc-korea': {
    officialUrl: 'https://korea.edc.com/en/',
    organizer: 'Insomniac',
    countryCode: 'KR',
  },
  'untold-romania': {
    officialUrl: 'https://untold.com/',
    organizer: 'UNTOLD',
    countryCode: 'RO',
  },
  creamfields: {
    officialUrl: 'https://www.creamfields.com/',
    organizer: 'Cream Group',
    countryCode: 'GB',
  },
  'ultra-japan': {
    officialUrl: 'https://ultrajapan.com/',
    organizer: 'Ultra Worldwide',
    countryCode: 'JP',
  },
  'untold-dubai': {
    officialUrl: 'https://untold.com/',
    organizer: 'UNTOLD',
    countryCode: 'AE',
  },
  'edc-orlando': {
    officialUrl: 'https://orlando.edc.com/',
    organizer: 'Insomniac',
    countryCode: 'US',
  },
  soundstorm: {
    officialUrl: 'https://www.mdlbeast.com/soundstorm',
    organizer: 'MDLBEAST',
    countryCode: 'SA',
  },
  'ultra-europe': {
    officialUrl: 'https://ultraeurope.com/',
    organizer: 'Ultra Worldwide',
    countryCode: 'HR',
  },
  'ultra-taiwan': {
    officialUrl: 'https://ultrataiwan.com/',
    organizer: 'Ultra Worldwide',
    countryCode: 'TW',
  },
};

const AREA_COUNTRY_CODES: Record<string, string> = {
  中国: 'CN',
  台湾: 'TW',
  泰国: 'TH',
  韩国: 'KR',
  日本: 'JP',
  比利时: 'BE',
  荷兰: 'NL',
  罗马尼亚: 'RO',
  英国: 'GB',
  美国: 'US',
  克罗地亚: 'HR',
  阿联酋: 'AE',
  沙特: 'SA',
};

export function getFestivalOfficialData(
  activity: Pick<Activity, 'code' | 'area'>,
): FestivalOfficialData | undefined {
  const curated = activity.code ? FESTIVAL_OFFICIALS[activity.code] : undefined;
  if (curated) return curated;

  const countryCode = activity.area ? AREA_COUNTRY_CODES[activity.area] : undefined;
  return countryCode ? { officialUrl: '', countryCode } : undefined;
}
