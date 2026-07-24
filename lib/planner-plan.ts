import type { Activity } from './types';
import type { ScheduleDj, SchedulePerformance } from './api';
import { buildEventAiSummary } from './event-ai-summary';
import type { Locale } from './i18n';
import { localizeSessionLabel, localizeStageLabel } from './lineup-display';
import { isOfficialTimedPerformance } from './lineup-timetable';
import { formatDisplayMoney } from './raven-currency';

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

export type PlannerTimelineSet = {
  time: string;
  artist: string;
  stage: string;
  highlight?: boolean;
};

export type PlannerTimelineDay = {
  label: string;
  sets: PlannerTimelineSet[];
};

export type PlannerPlan = {
  vibe: string;
  experiences: string[];
  artistTimeline: {
    days: PlannerTimelineDay[];
  };
  travel: {
    stay: string;
    flight: string;
    transport: string;
  };
  budget: {
    total: string;
    items: { label: string; amount: string; share?: number }[];
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
  stageMain: string;
};

/** Local fallback budget bands are authored in CNY; EN converts to USD. */
function formatCurrency(value: number, locale: Locale): string {
  return formatDisplayMoney(value, 'CNY', locale, { approx: false });
}

function budgetBase(travelStyle: TravelStyle): number {
  if (travelStyle === 'budget') return 1800;
  if (travelStyle === 'premium') return 5200;
  return 3200;
}

function normalizeArtistName(name: string): string {
  return name.trim().toLowerCase();
}

function buildArtistTimeline(
  performances: SchedulePerformance[],
  favoriteArtists: string[],
  fallbackArtists: string[],
  labels: PlannerPlanLabels,
  locale: Locale,
): PlannerTimelineDay[] {
  const priorityArtists = favoriteArtists.length ? favoriteArtists : fallbackArtists;
  const prioritySet = new Set(priorityArtists.map(normalizeArtistName));
  // Only official timed slots — never invent HH:mm for lineup-only festivals.
  const timedPerformances = performances.filter(isOfficialTimedPerformance);

  let selected = timedPerformances.filter((performance) =>
    prioritySet.has(normalizeArtistName(performance.artistName)),
  );

  if (!selected.length && timedPerformances.length) {
    selected = [...timedPerformances]
      .sort((left, right) => (right.popularity ?? 0) - (left.popularity ?? 0))
      .slice(0, Math.max(6, priorityArtists.length * 2));
  }

  if (!selected.length) {
    return [];
  }

  const byDay = new Map<string, SchedulePerformance[]>();
  for (const performance of selected) {
    const key = performance.dateKey || performance.dateLabel || 'day-1';
    const dayPerformances = byDay.get(key) ?? [];
    dayPerformances.push(performance);
    byDay.set(key, dayPerformances);
  }

  return [...byDay.entries()]
    .map(([dateKey, dayPerformances]) => {
      const sorted = [...dayPerformances].sort((left, right) => left.startMinutes - right.startMinutes);
      const rawLabel = sorted[0]?.dateLabel || dateKey;
      return {
        dateKey,
        minStart: sorted[0]?.startMinutes ?? 0,
        day: {
          label: localizeSessionLabel(locale, rawLabel) || rawLabel,
          sets: sorted.map((performance) => {
            const rawStage =
              performance.stageLabel?.trim() || performance.stage?.trim() || labels.stageMain;
            return {
              time: performance.startTime.trim(),
              artist: performance.artistName,
              stage: localizeStageLabel(locale, rawStage) || rawStage,
              highlight:
                favoriteArtists.length > 0 &&
                favoriteArtists.some(
                  (artist) => normalizeArtistName(artist) === normalizeArtistName(performance.artistName),
                ),
            };
          }),
        } satisfies PlannerTimelineDay,
      };
    })
    .sort((left, right) => left.minStart - right.minStart)
    .map((entry) => entry.day);
}

export function buildPlannerPlan(
  activity: Activity,
  djs: ScheduleDj[],
  performances: SchedulePerformance[],
  favoriteArtists: string[],
  preferences: PlannerPreferences,
  locale: Locale,
  labels: PlannerPlanLabels,
): PlannerPlan {
  const summary = buildEventAiSummary(activity, djs, locale);
  const artists = favoriteArtists.length
    ? favoriteArtists
    : summary.mustSee.slice(0, 3).map((artist) => artist.name);
  const city = activity.city ?? activity.area ?? activity.location ?? '';
  const priorities = preferences.priorities.length
    ? preferences.priorities
    : (['artists'] as PersonalPriority[]);

  const experiences = priorities
    .slice(0, 2)
    .map((priority) => labels.experiences[priority])
    .filter(Boolean);

  const base = budgetBase(preferences.travelStyle);
  const accommodation = Math.round(base * 0.42);
  const transport = Math.round(base * 0.28);
  const festival = Math.round(base * 0.22);
  const extras = base - accommodation - transport - festival;

  return {
    vibe: summary.vibe,
    experiences: experiences.length ? experiences : [labels.experiences.artists],
    artistTimeline: {
      days: buildArtistTimeline(performances, favoriteArtists, artists, labels, locale),
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
