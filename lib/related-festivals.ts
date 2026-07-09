import type { Activity } from './types';
import { getFestivalAtmosphere, type FestivalAtmosphere } from './festival-atmosphere';
import { parseActivityStartYmd } from './activity-date';

function monthFromActivity(activity: Activity): number | null {
  const ymd = activity.startDate?.trim() || parseActivityStartYmd(activity.date);
  if (!ymd) return null;
  const month = Number(ymd.slice(5, 7));
  return Number.isFinite(month) ? month : null;
}

function seasonBucket(month: number | null): 'winter' | 'spring' | 'summer' | 'autumn' | null {
  if (month == null) return null;
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

function scoreRelated(
  current: Activity,
  candidate: Activity,
  currentAtmosphere: FestivalAtmosphere,
  currentMonth: number | null,
  currentSeason: ReturnType<typeof seasonBucket>,
): number {
  let score = 0;
  const candidateAtmosphere = getFestivalAtmosphere(candidate);
  const candidateMonth = monthFromActivity(candidate);
  const candidateSeason = seasonBucket(candidateMonth);

  if (current.city && candidate.city && current.city === candidate.city) score += 8;
  else if (current.area && candidate.area && current.area === candidate.area) score += 5;

  if (currentAtmosphere === candidateAtmosphere) score += 5;

  if (current.region && candidate.region && current.region === candidate.region) score += 2;

  if (
    current.activityType &&
    candidate.activityType &&
    current.activityType === candidate.activityType
  ) {
    score += 1;
  }

  if (currentSeason && candidateSeason && currentSeason === candidateSeason) score += 3;

  if (currentMonth != null && candidateMonth != null) {
    const delta = Math.min(
      Math.abs(currentMonth - candidateMonth),
      12 - Math.abs(currentMonth - candidateMonth),
    );
    if (delta === 0) score += 3;
    else if (delta === 1) score += 2;
    else if (delta <= 2) score += 1;
  }

  if (current.hot && candidate.hot) score += 1;

  return score;
}

/**
 * Curate related journeys by shared place, atmosphere mood, and season —
 * not "next two in the catalog."
 */
export function curateRelatedFestivals(
  current: Activity,
  catalog: Activity[],
  limit = 2,
): Activity[] {
  const currentAtmosphere = getFestivalAtmosphere(current);
  const currentMonth = monthFromActivity(current);
  const currentSeason = seasonBucket(currentMonth);

  return catalog
    .filter((item) => item.legacyId !== current.legacyId)
    .map((item) => ({
      item,
      score: scoreRelated(current, item, currentAtmosphere, currentMonth, currentSeason),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.legacyId - b.item.legacyId;
    })
    .slice(0, limit)
    .map(({ item }) => item);
}
