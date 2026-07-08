import type { Activity } from './types';
import type { ScheduleDj } from './api';
import { buildEventAiSummary } from './event-ai-summary';
import type { Locale } from './i18n';

export type TravelStyle = 'budget' | 'smart' | 'premium';
export type StayPreference = 'festival' | 'city' | 'value';
export type JourneyType = 'solo' | 'friends' | 'couple' | 'tribe';
export type PersonalPriority = 'artists' | 'discover' | 'party' | 'city' | 'people' | 'budget';

export type PlannerPreferences = {
  origin: string;
  travelStyle: TravelStyle;
  stayPreference: StayPreference;
  journeyType: JourneyType;
  priorities: PersonalPriority[];
};

export type PlannerPlan = {
  vibe: string;
  experiences: string[];
  artistRoute: {
    artists: string[];
    stages: string[];
    conflicts: string[];
    strategy: string;
  };
  travel: {
    stay: string;
    flight: string;
    transport: string;
  };
  budget: {
    total: string;
    items: { label: string; amount: string; share: number }[];
  };
};

type PlannerPlanLabels = {
  experiences: Record<PersonalPriority, string>;
  stay: Record<StayPreference, string>;
  flight: Record<TravelStyle, string>;
  transport: Record<StayPreference, string>;
  budgetItems: {
    accommodation: string;
    transport: string;
    festival: string;
    extras: string;
  };
  strategy: {
    artists: string;
    discover: string;
    party: string;
    default: string;
  };
  conflict: string;
  stageMain: string;
  stageLate: string;
};

function formatCurrency(value: number, locale: Locale): string {
  const code = locale === 'zh' ? 'CNY' : 'USD';
  try {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return locale === 'zh' ? `¥${value.toLocaleString()}` : `$${value.toLocaleString()}`;
  }
}

function budgetBase(travelStyle: TravelStyle): number {
  if (travelStyle === 'budget') return 1800;
  if (travelStyle === 'premium') return 5200;
  return 3200;
}

export function buildPlannerPlan(
  activity: Activity,
  djs: ScheduleDj[],
  favoriteArtists: string[],
  preferences: PlannerPreferences,
  locale: Locale,
  labels: PlannerPlanLabels,
): PlannerPlan {
  const summary = buildEventAiSummary(activity, djs, locale);
  const artists = favoriteArtists.length ? favoriteArtists : summary.mustSee.slice(0, 3);
  const city = activity.city ?? activity.area ?? activity.location ?? '';
  const priorities = preferences.priorities.length
    ? preferences.priorities
    : (['artists'] as PersonalPriority[]);

  const experiences = priorities
    .slice(0, 2)
    .map((priority) => labels.experiences[priority])
    .filter(Boolean);

  const stages = [
    labels.stageMain,
    artists.length > 1 ? labels.stageLate : summary.genres[0] ?? labels.stageLate,
  ];

  const conflicts =
    artists.length > 1
      ? [labels.conflict.replace('{artist1}', artists[0]).replace('{artist2}', artists[1])]
      : [];

  const primaryPriority = priorities[0] ?? 'artists';
  const strategy =
    labels.strategy[primaryPriority as keyof typeof labels.strategy] ?? labels.strategy.default;

  const base = budgetBase(preferences.travelStyle);
  const accommodation = Math.round(base * 0.42);
  const transport = Math.round(base * 0.28);
  const festival = Math.round(base * 0.22);
  const extras = base - accommodation - transport - festival;

  return {
    vibe: summary.vibe,
    experiences: experiences.length ? experiences : [labels.experiences.artists],
    artistRoute: {
      artists,
      stages,
      conflicts,
      strategy,
    },
    travel: {
      stay: labels.stay[preferences.stayPreference].replace('{city}', city),
      flight: labels.flight[preferences.travelStyle]
        .replace('{origin}', preferences.origin)
        .replace('{city}', city),
      transport: labels.transport[preferences.stayPreference].replace('{city}', city),
    },
    budget: {
      total: formatCurrency(base, locale),
      items: [
        { label: labels.budgetItems.accommodation, amount: formatCurrency(accommodation, locale), share: 42 },
        { label: labels.budgetItems.transport, amount: formatCurrency(transport, locale), share: 28 },
        { label: labels.budgetItems.festival, amount: formatCurrency(festival, locale), share: 22 },
        { label: labels.budgetItems.extras, amount: formatCurrency(extras, locale), share: 8 },
      ],
    },
  };
}
