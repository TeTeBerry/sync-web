import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WaitlistForm, type WaitlistFestivalWorld } from './WaitlistForm';
import {
  fetchActivities,
  getActivityImage,
  getActivityTitle,
} from '../../../lib/api';
import { getFestivalAtmosphere } from '../../../lib/festival-atmosphere';
import { activityMeta } from '../../../lib/format';
import {
  getMessages,
  DEFAULT_LOCALE,
  isLocale,
  localizeActivities,
  type Locale,
} from '../../../lib/i18n';
import {
  absoluteAlternateLanguages,
  absoluteLocalizedUrl,
  buildSocialMetadata,
} from '../../../lib/seo';
import type { Activity } from '../../../lib/types';

export const dynamic = 'force-dynamic';

type WaitlistPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ event?: string; note?: string; prompt?: string }>;
};

/** Prefer a vivid non-Tomorrowland festival so waitlist does not mirror Home's default hero. */
function pickWaitlistFestival(activities: Activity[]): Activity | undefined {
  const ranked = [...activities].sort((left, right) => {
    const hotDelta = Number(Boolean(right.hot)) - Number(Boolean(left.hot));
    if (hotDelta !== 0) return hotDelta;
    return (right.attendees ?? 0) - (left.attendees ?? 0);
  });

  const nonTomorrowland = ranked.find(
    (activity) =>
      !`${activity.name} ${activity.title ?? ''}`.toLowerCase().includes('tomorrowland'),
  );

  return nonTomorrowland ?? ranked[0];
}

function matchFestivalQuery(activities: Activity[], query: string): Activity | undefined {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return undefined;

  const exact = activities.find((activity) => {
    const title = getActivityTitle(activity).toLowerCase();
    const name = activity.name.toLowerCase();
    return title === normalized || name === normalized;
  });
  if (exact) return exact;

  return activities.find((activity) => {
    const title = getActivityTitle(activity).toLowerCase();
    const name = activity.name.toLowerCase();
    const city = (activity.city ?? '').toLowerCase();
    const location = (activity.location ?? '').toLowerCase();
    return (
      title.includes(normalized) ||
      name.includes(normalized) ||
      city.includes(normalized) ||
      location.includes(normalized) ||
      normalized.includes(title) ||
      normalized.includes(name)
    );
  });
}

function buildFestivalWorld(
  locale: Locale,
  activities: Activity[],
  eventQuery?: string,
): WaitlistFestivalWorld {
  const t = getMessages(locale);
  const queryName = eventQuery?.trim();
  const matched = queryName ? matchFestivalQuery(activities, queryName) : undefined;

  const fallbackFestival =
    t.home.heroFlow.discovery.festivals.find(
      (festival) => !festival.name.toLowerCase().includes('tomorrowland'),
    ) ??
    t.home.heroFlow.discovery.festivals.find(
      (festival) => 'featured' in festival && festival.featured,
    ) ??
    t.home.heroFlow.discovery.festivals[0];

  // Unmatched query: keep the wish intact — never borrow another festival's image/meta.
  if (queryName && !matched) {
    return {
      name: queryName,
      date: '',
      location: '',
      atmosphere: 'violet',
      fromQuery: true,
      matched: false,
    };
  }

  const featured = matched ?? pickWaitlistFestival(activities);

  if (!featured) {
    return {
      name: queryName || fallbackFestival.name,
      date: queryName ? '' : fallbackFestival.date,
      location: queryName ? '' : fallbackFestival.location,
      atmosphere: 'violet',
      fromQuery: Boolean(queryName),
      matched: Boolean(matched),
    };
  }

  const meta = activityMeta(featured);
  const [date, location] = meta.split(' · ');

  return {
    name: getActivityTitle(featured),
    date: date ?? fallbackFestival.date,
    location: location ?? featured.city ?? featured.location ?? fallbackFestival.location,
    imageSrc: getActivityImage(featured),
    atmosphere: getFestivalAtmosphere(featured),
    fromQuery: Boolean(matched),
    matched: Boolean(matched),
  };
}

export async function generateMetadata({ params }: WaitlistPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = getMessages(locale);
  const url = absoluteLocalizedUrl(locale, '/waitlist');

  return {
    title: {
      absolute: t.waitlist.seoTitle,
    },
    description: t.waitlist.description,
    alternates: {
      canonical: url,
      languages: absoluteAlternateLanguages('/waitlist'),
    },
    robots: {
      index: true,
      follow: true,
    },
    ...buildSocialMetadata({
      title: t.waitlist.seoTitle,
      description: t.waitlist.description,
      url,
      locale,
    }),
  };
}

export default async function WaitlistPage({ params: routeParams, searchParams }: WaitlistPageProps) {
  const { locale: rawLocale } = await routeParams;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const queryParams = (await searchParams) ?? {};
  const eventQuery = queryParams.event?.trim();
  const initialNote = queryParams.note?.trim() || queryParams.prompt?.trim();

  const { activities: rawActivities } = await fetchActivities();
  const activities = localizeActivities(rawActivities, locale);
  const festival = buildFestivalWorld(locale, activities, eventQuery);

  return (
    <WaitlistForm
      initialEvent={eventQuery || ''}
      initialNote={initialNote}
      locale={locale}
      festival={festival}
    />
  );
}
