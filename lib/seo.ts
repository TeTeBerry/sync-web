import type { Metadata } from 'next';
import { getActivityImage, getActivityTitle, type ScheduleDj } from './api';
import {
  activityMetaForLocale,
  alternateLanguages,
  getMessages,
  localizeActivity,
  localizedPath,
  type Locale,
} from './i18n';
import {
  eventAlternateLanguages,
  eventLineupAlternateLanguages,
  eventLineupPath,
  eventPath,
  eventPlanAlternateLanguages,
  eventPlanPath,
} from './event-slug';
import type { TravelFaqItem } from './event-travel';
import { getSiteUrl } from './site';
import {
  getActivityDateRange,
  ymdToSchemaIsoDate,
} from './activity-date';
import type { Activity } from './types';

const siteUrl = getSiteUrl();

const DEFAULT_OG_IMAGE = {
  url: '/icon-512.png',
  width: 512,
  height: 512,
  alt: 'Rraven',
} as const;

const OG_LOCALE: Record<Locale, string> = {
  zh: 'zh_CN',
  en: 'en_US',
};

export function absoluteLocalizedUrl(locale: Locale, path = ''): string {
  return `${siteUrl}${localizedPath(locale, path)}`;
}

export function absoluteAlternateLanguages(path = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(alternateLanguages(path)).map(([language, href]) => [
      language,
      `${siteUrl}${href}`,
    ]),
  );
}

type SocialImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

type SocialMetadataInput = {
  title: string;
  description: string;
  url: string;
  locale: Locale;
  image?: SocialImage;
};

export function buildSocialMetadata({
  title,
  description,
  url,
  locale,
  image,
}: SocialMetadataInput): Pick<Metadata, 'openGraph' | 'twitter'> {
  const alternateLocale: Locale = locale === 'zh' ? 'en' : 'zh';
  const ogImage = image ?? DEFAULT_OG_IMAGE;
  const twitterCard = image && image !== DEFAULT_OG_IMAGE ? 'summary_large_image' : 'summary';

  return {
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      siteName: 'Raven',
      locale: OG_LOCALE[locale],
      alternateLocale: [OG_LOCALE[alternateLocale]],
      images: [ogImage],
    },
    twitter: {
      card: twitterCard,
      title,
      description,
      images: [ogImage.url],
    },
  };
}

export function eventPageTitle(activity: Activity, locale: Locale): string {
  const name = getActivityTitle(localizeActivity(activity, locale));
  const suffix = getMessages(locale).eventDetail.pageTitleSuffix;
  return `${name} — ${suffix}`;
}

export function eventMetaDescription(activity: Activity, locale: Locale): string {
  const localized = localizeActivity(activity, locale);
  if (localized.description) {
    return localized.description.length > 160
      ? `${localized.description.slice(0, 157)}…`
      : localized.description;
  }

  const t = getMessages(locale);
  const name = getActivityTitle(localized);
  const location = localized.city ?? localized.location ?? localized.area ?? '';

  if (locale === 'zh') {
    return location
      ? `${name}（${location}）。${t.eventDetail.fallbackDescription}`
      : `${name}。${t.eventDetail.fallbackDescription}`;
  }

  return location
    ? `${name} in ${location}. ${t.eventDetail.fallbackDescription}`
    : `${name}. ${t.eventDetail.fallbackDescription}`;
}

function absoluteAssetUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, siteUrl).toString();
  } catch {
    return undefined;
  }
}

function resolveEventSchemaDates(activity: Activity, title: string) {
  const range = getActivityDateRange(activity);
  if (range) {
    return {
      startDate: ymdToSchemaIsoDate(range.start),
      endDate: ymdToSchemaIsoDate(range.end),
    };
  }

  const startDate = toIsoDate(activity.date, title);
  return {
    startDate,
    endDate: startDate,
  };
}

function resolveEventPerformers(
  activity: Activity,
  djs: ScheduleDj[],
): Array<{ '@type': 'MusicGroup'; name: string }> {
  const fromSchedule = djs.slice(0, 24).map((dj) => ({
    '@type': 'MusicGroup' as const,
    name: dj.name,
  }));
  if (fromSchedule.length) return fromSchedule;

  const fallbackNames = (activity.artists ?? activity.lineup ?? [])
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 24);

  return fallbackNames.map((name) => ({
    '@type': 'MusicGroup' as const,
    name,
  }));
}

function toIsoDate(value?: string, title?: string): string | undefined {
  if (!value) return undefined;
  const explicitDate = value.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (explicitDate) {
    const [, year, month, day] = explicitDate;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
  }

  const titleYear = title?.match(/\b(20\d{2})\b/)?.[1];
  const monthDay = value.match(/\b(\d{1,2})[./-](\d{1,2})\b/);
  if (titleYear && monthDay) {
    const [, month, day] = monthDay;
    return new Date(Date.UTC(Number(titleYear), Number(month) - 1, Number(day))).toISOString();
  }

  const date = new Date(value);
  return /^\d{4}/.test(value) && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
}

type BreadcrumbItem = {
  name: string;
  url?: string;
};

export function buildFaqJsonLd(items: { question: string; answer: string }[]) {
  if (!items.length) return null;

  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

export function buildEventJsonLd(
  activity: Activity,
  djs: ScheduleDj[],
  locale: Locale,
  breadcrumbItems: BreadcrumbItem[],
) {
  const localizedActivity = localizeActivity(activity, locale);
  const title = getActivityTitle(localizedActivity);
  const eventUrl = `${siteUrl}${eventPath(locale, activity)}`;
  const image = absoluteAssetUrl(getActivityImage(localizedActivity));
  const performers = resolveEventPerformers(localizedActivity, djs);
  const { startDate, endDate } = resolveEventSchemaDates(localizedActivity, title);

  const locationName = localizedActivity.location || localizedActivity.city;
  const eventSchema = {
    '@type': 'Event',
    '@id': eventUrl,
    name: title,
    description: eventMetaDescription(localizedActivity, locale),
    url: eventUrl,
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
    image: image ? [image] : undefined,
    startDate,
    endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    organizer: {
      '@type': 'Organization',
      name: 'Raven',
      url: siteUrl,
    },
    location: locationName
      ? {
          '@type': 'Place',
          name: locationName,
          address: {
            '@type': 'PostalAddress',
            addressLocality: localizedActivity.city,
            addressCountry: localizedActivity.area,
            streetAddress: localizedActivity.location,
          },
        }
      : undefined,
    performer: performers.length ? performers : undefined,
    offers: {
      '@type': 'Offer',
      url: localizedActivity.externalUrl ?? eventUrl,
      availability: 'https://schema.org/InStock',
    },
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [eventSchema, buildBreadcrumbJsonLd(breadcrumbItems)],
  };
}

export function plannerPageTitle(activity: Activity, locale: Locale): string {
  const name = getActivityTitle(localizeActivity(activity, locale));
  if (locale === 'zh') {
    return `${name} 行程规划`;
  }
  return `${name} Trip Planner`;
}

export function plannerMetaDescription(activity: Activity, locale: Locale): string {
  const name = getActivityTitle(localizeActivity(activity, locale));
  if (locale === 'zh') {
    return `用 Raven AI 规划你的 ${name} 之旅。对比出行方案、发现住宿、估算预算，生成专属电音节行程。`;
  }
  return `Plan your ${name} trip with Raven AI. Compare travel options, discover accommodation, estimate budgets and build your personalized festival itinerary.`;
}

export function buildPlannerJsonLd(
  activity: Activity,
  djs: ScheduleDj[],
  locale: Locale,
  breadcrumbItems: BreadcrumbItem[],
  faq: TravelFaqItem[],
) {
  const localizedActivity = localizeActivity(activity, locale);
  const title = getActivityTitle(localizedActivity);
  const planUrl = `${siteUrl}${eventPlanPath(locale, activity)}`;
  const eventUrl = `${siteUrl}${eventPath(locale, activity)}`;
  const image = absoluteAssetUrl(getActivityImage(localizedActivity));
  const performers = resolveEventPerformers(localizedActivity, djs);
  const { startDate, endDate } = resolveEventSchemaDates(localizedActivity, title);
  const locationName = localizedActivity.location || localizedActivity.city;

  const eventSchema = {
    '@type': 'Event',
    '@id': eventUrl,
    name: title,
    description: eventMetaDescription(localizedActivity, locale),
    url: eventUrl,
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
    image: image ? [image] : undefined,
    startDate,
    endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    organizer: {
      '@type': 'Organization',
      name: 'Raven',
      url: siteUrl,
    },
    location: locationName
      ? {
          '@type': 'Place',
          name: locationName,
          address: {
            '@type': 'PostalAddress',
            addressLocality: localizedActivity.city,
            addressCountry: localizedActivity.area,
            streetAddress: localizedActivity.location,
          },
        }
      : undefined,
    performer: performers.length ? performers : undefined,
    offers: {
      '@type': 'Offer',
      url: localizedActivity.externalUrl ?? eventUrl,
      availability: 'https://schema.org/InStock',
    },
  };

  const webPageSchema = {
    '@type': 'WebPage',
    '@id': planUrl,
    name: plannerPageTitle(localizedActivity, locale),
    description: plannerMetaDescription(localizedActivity, locale),
    url: planUrl,
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Raven',
      url: siteUrl,
    },
    about: { '@id': eventUrl },
  };

  const graph: Record<string, unknown>[] = [
    webPageSchema,
    eventSchema,
    buildBreadcrumbJsonLd(breadcrumbItems),
  ];

  const faqSchema = buildFaqJsonLd(faq);
  if (faqSchema) graph.push(faqSchema);

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function buildPlannerMetadata(
  activity: Activity,
  locale: Locale,
  options?: {
    zhActivity?: Activity;
    enActivity?: Activity;
  },
): Metadata {
  const localized = localizeActivity(activity, locale);
  const title = plannerPageTitle(localized, locale);
  const description = plannerMetaDescription(localized, locale);
  const path = eventPlanPath(locale, activity);
  const url = `${siteUrl}${path}`;
  const image = absoluteAssetUrl(getActivityImage(localized));
  const languages = Object.fromEntries(
    Object.entries(
      eventPlanAlternateLanguages(activity, options?.zhActivity, options?.enActivity),
    ).map(([language, href]) => [language, `${siteUrl}${href}`]),
  );

  return {
    title: {
      absolute: `${title} | Raven AI`,
    },
    description,
    alternates: {
      canonical: url,
      languages,
    },
    ...buildSocialMetadata({
      title,
      description,
      url,
      locale,
      image: image ? { url: image, alt: getActivityTitle(localized) } : undefined,
    }),
  };
}

export function buildEventMetadata(
  activity: Activity,
  locale: Locale,
  options?: {
    zhActivity?: Activity;
    enActivity?: Activity;
  },
): Metadata {
  const title = eventPageTitle(activity, locale);
  const description = eventMetaDescription(activity, locale);
  const path = eventPath(locale, activity);
  const url = `${siteUrl}${path}`;
  const image = absoluteAssetUrl(getActivityImage(localizeActivity(activity, locale)));
  const languages = Object.fromEntries(
    Object.entries(
      eventAlternateLanguages(activity, options?.zhActivity, options?.enActivity),
    ).map(([language, href]) => [language, `${siteUrl}${href}`]),
  );

  return {
    title: {
      absolute: `${title} | Raven`,
    },
    description,
    alternates: {
      canonical: url,
      languages,
    },
    ...buildSocialMetadata({
      title,
      description,
      url,
      locale,
      image: image ? { url: image, alt: getActivityTitle(localizeActivity(activity, locale)) } : undefined,
    }),
  };
}

export function lineupPageTitle(activity: Activity, locale: Locale): string {
  const name = getActivityTitle(localizeActivity(activity, locale));
  const t = getMessages(locale);
  return `${name} — ${t.eventDetail.lineupPage.title}`;
}

export function lineupMetaDescription(activity: Activity, locale: Locale): string {
  const name = getActivityTitle(localizeActivity(activity, locale));
  return getMessages(locale).eventDetail.lineupPage.metaDescription.replace('{festival}', name);
}

function buildEventSubpageJsonLd(input: {
  activity: Activity;
  djs: ScheduleDj[];
  locale: Locale;
  pageUrl: string;
  pageTitle: string;
  pageDescription: string;
  breadcrumbItems: BreadcrumbItem[];
  faq?: TravelFaqItem[];
}) {
  const {
    activity,
    djs,
    locale,
    pageUrl,
    pageTitle,
    pageDescription,
    breadcrumbItems,
    faq = [],
  } = input;
  const localizedActivity = localizeActivity(activity, locale);
  const title = getActivityTitle(localizedActivity);
  const eventUrl = `${siteUrl}${eventPath(locale, activity)}`;
  const image = absoluteAssetUrl(getActivityImage(localizedActivity));
  const performers = resolveEventPerformers(localizedActivity, djs);
  const { startDate, endDate } = resolveEventSchemaDates(localizedActivity, title);
  const locationName = localizedActivity.location || localizedActivity.city;

  const eventSchema = {
    '@type': 'Event',
    '@id': eventUrl,
    name: title,
    description: eventMetaDescription(localizedActivity, locale),
    url: eventUrl,
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
    image: image ? [image] : undefined,
    startDate,
    endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    organizer: {
      '@type': 'Organization',
      name: 'Raven',
      url: siteUrl,
    },
    location: locationName
      ? {
          '@type': 'Place',
          name: locationName,
          address: {
            '@type': 'PostalAddress',
            addressLocality: localizedActivity.city,
            addressCountry: localizedActivity.area,
            streetAddress: localizedActivity.location,
          },
        }
      : undefined,
    performer: performers.length ? performers : undefined,
    offers: {
      '@type': 'Offer',
      url: localizedActivity.externalUrl ?? eventUrl,
      availability: 'https://schema.org/InStock',
    },
  };

  const webPageSchema = {
    '@type': 'WebPage',
    '@id': pageUrl,
    name: pageTitle,
    description: pageDescription,
    url: pageUrl,
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Raven',
      url: siteUrl,
    },
    about: { '@id': eventUrl },
  };

  const graph: Record<string, unknown>[] = [
    webPageSchema,
    eventSchema,
    buildBreadcrumbJsonLd(breadcrumbItems),
  ];

  const faqSchema = buildFaqJsonLd(faq);
  if (faqSchema) graph.push(faqSchema);

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function buildLineupJsonLd(
  activity: Activity,
  djs: ScheduleDj[],
  locale: Locale,
  breadcrumbItems: BreadcrumbItem[],
) {
  return buildEventSubpageJsonLd({
    activity,
    djs,
    locale,
    pageUrl: `${siteUrl}${eventLineupPath(locale, activity)}`,
    pageTitle: lineupPageTitle(activity, locale),
    pageDescription: lineupMetaDescription(activity, locale),
    breadcrumbItems,
  });
}

export function buildLineupMetadata(
  activity: Activity,
  locale: Locale,
  options?: {
    zhActivity?: Activity;
    enActivity?: Activity;
  },
): Metadata {
  const localized = localizeActivity(activity, locale);
  const title = lineupPageTitle(localized, locale);
  const description = lineupMetaDescription(localized, locale);
  const path = eventLineupPath(locale, activity);
  const url = `${siteUrl}${path}`;
  const image = absoluteAssetUrl(getActivityImage(localized));
  const languages = Object.fromEntries(
    Object.entries(
      eventLineupAlternateLanguages(activity, options?.zhActivity, options?.enActivity),
    ).map(([language, href]) => [language, `${siteUrl}${href}`]),
  );

  return {
    title: {
      absolute: `${title} | Raven`,
    },
    description,
    alternates: {
      canonical: url,
      languages,
    },
    ...buildSocialMetadata({
      title,
      description,
      url,
      locale,
      image: image ? { url: image, alt: getActivityTitle(localized) } : undefined,
    }),
  };
}
