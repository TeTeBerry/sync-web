import type { RavenTravelGuidePlan } from './api';
import { localizedPath, type Locale } from './i18n';
import type { PlannerPreferences } from './planner-plan';
import type { RavenJourneyView } from './raven-journey';

export type JourneyShareAspect = 'portrait' | 'story' | 'square' | 'og';

export type JourneyShareLookingFor = 'roommate' | 'festival_buddy' | 'ride_share';

export const JOURNEY_SHARE_ASPECTS: Record<
  JourneyShareAspect,
  { ratio: string; width: number; height: number; label: string }
> = {
  portrait: { ratio: '4 / 5', width: 1080, height: 1350, label: '4:5' },
  story: { ratio: '9 / 16', width: 1080, height: 1920, label: '9:16' },
  square: { ratio: '1 / 1', width: 1080, height: 1080, label: '1:1' },
  og: { ratio: '1200 / 630', width: 1200, height: 630, label: '1200×630' },
};

export const JOURNEY_SHARE_SITE_HOST = 'raventribe.tech';

export type JourneyShareCardData = {
  id: string;
  festivalName: string;
  festivalDate: string;
  festivalLocation: string;
  origin: string;
  accommodation: string;
  budget: string;
  favoriteArtists: string[];
  lookingFor: JourneyShareLookingFor[];
  heroImage?: string;
  sharePath: string;
};

export function journeySharePath(
  locale: Locale,
  id: string,
  options?: {
    artists?: string[];
    lookingFor?: JourneyShareLookingFor[];
  },
): string {
  const base = localizedPath(locale, `/journey/share/${encodeURIComponent(id)}`);
  const params = new URLSearchParams();
  if (options?.artists?.length) {
    params.set('artists', options.artists.slice(0, 3).join('|'));
  }
  if (options?.lookingFor?.length) {
    params.set('looking', options.lookingFor.join(','));
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function lookingForFromJourneyType(
  journeyType: PlannerPreferences['journeyType'],
): JourneyShareLookingFor[] {
  if (journeyType === 'couple') return ['festival_buddy'];
  if (journeyType === 'friends') return ['festival_buddy', 'ride_share'];
  if (journeyType === 'tribe') return ['festival_buddy', 'ride_share'];
  return ['festival_buddy', 'roommate'];
}

function cleanText(value: string | undefined | null): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed || trimmed === '—') return '';
  return trimmed;
}

function uniqueArtists(artists: string[], limit = 3): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const artist of artists) {
    const name = artist.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(name);
    if (next.length >= limit) break;
  }
  return next;
}

export function buildJourneyShareFromView(input: {
  id: string;
  locale: Locale;
  journey: RavenJourneyView;
  preferences?: PlannerPreferences | null;
  favoriteArtists?: string[];
  heroImage?: string;
}): JourneyShareCardData {
  const { journey, preferences } = input;
  const artists = uniqueArtists([
    ...(input.favoriteArtists ?? []),
    ...journey.festivalExperience.nonNegotiables,
  ]);

  const accommodation =
    cleanText(journey.stayStrategy.options[0]?.name) ||
    cleanText(journey.glance.stay.headline) ||
    cleanText(journey.stayStrategy.areaHeadline);

  const budget =
    cleanText(journey.budget.total) || cleanText(journey.glance.budget.headline);

  const lookingFor = preferences
    ? lookingForFromJourneyType(preferences.journeyType)
    : (['festival_buddy'] as JourneyShareLookingFor[]);

  return {
    id: input.id,
    festivalName: cleanText(journey.festivalName) || 'Festival',
    festivalDate: cleanText(journey.festivalDates),
    festivalLocation: cleanText(journey.destination),
    origin: cleanText(journey.origin) || cleanText(preferences?.origin),
    accommodation,
    budget,
    favoriteArtists: artists,
    lookingFor,
    heroImage: input.heroImage?.trim() || undefined,
    sharePath: journeySharePath(input.locale, input.id, {
      artists,
      lookingFor,
    }),
  };
}

export function buildJourneyShareFromSavedPlan(input: {
  id: string;
  locale: Locale;
  plan: RavenTravelGuidePlan;
  festivalLocation?: string;
  favoriteArtists?: string[];
  lookingFor?: JourneyShareLookingFor[];
  heroImage?: string;
}): JourneyShareCardData {
  const { plan } = input;
  const accommodation =
    cleanText(plan.accommodation.hotels[0]?.name) ||
    cleanText(plan.accommodation.schemes?.[0]?.name) ||
    cleanText(plan.accommodation.title);

  const budgetItem = plan.budget?.items.find((item) =>
    /total|合计|总计|预算/i.test(item.label),
  );
  const budget =
    cleanText(budgetItem?.range) ||
    cleanText(plan.budget?.items[0]?.range) ||
    cleanText(plan.budgetLabel);

  const lookingFor = input.lookingFor?.length
    ? input.lookingFor
    : (['festival_buddy'] as JourneyShareLookingFor[]);
  const favoriteArtists = uniqueArtists(input.favoriteArtists ?? []);

  return {
    id: input.id,
    festivalName: cleanText(plan.activityName) || 'Festival',
    festivalDate: cleanText(plan.eventDates),
    festivalLocation: cleanText(input.festivalLocation) || cleanText(plan.venue),
    origin: cleanText(plan.departure),
    accommodation,
    budget,
    favoriteArtists,
    lookingFor,
    heroImage: input.heroImage?.trim() || undefined,
    sharePath: journeySharePath(input.locale, input.id, {
      artists: favoriteArtists,
      lookingFor,
    }),
  };
}

export function absoluteJourneyShareUrl(siteUrl: string, sharePath: string): string {
  return `${siteUrl.replace(/\/$/, '')}${sharePath}`;
}
