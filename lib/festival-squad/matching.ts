import type {
  FestivalSquadProfile,
  MatchCompatibilityLabel,
  SquadMatch,
} from './types';

export type MatchReasonCopy = {
  sameArrivalDay: string;
  arrivalWithinOneDay: string;
  sameAccommodation: string;
  sameAccommodationType: string;
  similarBudget: string;
  sameOriginCity: string;
  sameOriginCountry: string;
  sharedArtists: (count: number) => string;
  sharedGenres: (count: number) => string;
  sameLookingFor: string;
  bothFirstTime: string;
  compatibleGroupSize: string;
  arrivalMismatch: string;
  budgetMismatch: string;
};

const WEIGHTS = {
  sameArrivalDay: 28,
  arrivalWithinOneDay: 16,
  sameAccommodation: 22,
  sameAccommodationType: 12,
  similarBudget: 12,
  sameOriginCity: 18,
  sameOriginCountry: 10,
  sharedArtist: 6,
  sharedGenre: 3,
  sameLookingFor: 14,
  bothFirstTime: 4,
  compatibleGroupSize: 3,
} as const;

/** Soft bonuses — never enough alone to enter the match list. */
export const MIN_STRONG_SIGNALS_TO_RANK = 2;

function parseDay(value: string): number | null {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

function dayDiff(a: string, b: string): number | null {
  const left = parseDay(a);
  const right = parseDay(b);
  if (left == null || right == null) return null;
  return Math.round(Math.abs(left - right) / 86_400_000);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function intersection(a: string[], b: string[]): string[] {
  const set = new Set(b.map(normalize));
  return a.filter((item) => set.has(normalize(item)));
}

function labelForScore(score: number, sparseData: boolean): MatchCompatibilityLabel {
  if (sparseData) return 'sparse';
  if (score >= 78) return 'excellent';
  if (score >= 62) return 'strong';
  if (score >= 45) return 'good';
  return 'some_shared';
}

/**
 * Rule-based Raven Match. Explainable weighted signals — not ML.
 * Same festival is assumed by caller (profiles already scoped to one event).
 */
export function scoreSquadMatch(
  viewer: FestivalSquadProfile,
  candidate: FestivalSquadProfile,
  copy: MatchReasonCopy,
): SquadMatch {
  if (viewer.eventId !== candidate.eventId) {
    return {
      profile: candidate,
      score: 0,
      label: 'sparse',
      reasons: [],
      warnings: [],
      sharedArtists: [],
      sharedGenres: [],
      sparseData: true,
      sharedPreferenceCount: 0,
    };
  }

  let score = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];
  let strongSignals = 0;

  const lookingOverlap = viewer.lookingFor.some((intent) => candidate.lookingFor.includes(intent));
  if (lookingOverlap) {
    score += WEIGHTS.sameLookingFor;
    reasons.push(copy.sameLookingFor);
    strongSignals += 1;
  }

  const arrivalGap = dayDiff(viewer.arrivalDate, candidate.arrivalDate);
  if (arrivalGap === 0) {
    score += WEIGHTS.sameArrivalDay;
    reasons.push(copy.sameArrivalDay);
    strongSignals += 1;
  } else if (arrivalGap === 1) {
    score += WEIGHTS.arrivalWithinOneDay;
    reasons.push(copy.arrivalWithinOneDay);
    strongSignals += 1;
  } else if (arrivalGap != null && arrivalGap >= 3) {
    warnings.push(copy.arrivalMismatch);
  }

  const sameName =
    Boolean(viewer.accommodationName && candidate.accommodationName) &&
    normalize(viewer.accommodationName!) === normalize(candidate.accommodationName!);
  if (sameName) {
    score += WEIGHTS.sameAccommodation;
    reasons.push(copy.sameAccommodation);
    strongSignals += 1;
  } else if (
    viewer.accommodationType !== 'not_decided' &&
    candidate.accommodationType !== 'not_decided' &&
    viewer.accommodationType === candidate.accommodationType
  ) {
    score += WEIGHTS.sameAccommodationType;
    reasons.push(copy.sameAccommodationType);
    strongSignals += 1;
  }

  if (viewer.budgetLevel === candidate.budgetLevel) {
    score += WEIGHTS.similarBudget;
    reasons.push(copy.similarBudget);
    strongSignals += 1;
  } else {
    const order: FestivalSquadProfile['budgetLevel'][] = ['budget', 'comfort', 'premium'];
    if (Math.abs(order.indexOf(viewer.budgetLevel) - order.indexOf(candidate.budgetLevel)) >= 2) {
      warnings.push(copy.budgetMismatch);
    }
  }

  if (
    viewer.originCity &&
    candidate.originCity &&
    normalize(viewer.originCity) === normalize(candidate.originCity)
  ) {
    score += WEIGHTS.sameOriginCity;
    reasons.push(copy.sameOriginCity);
    strongSignals += 1;
  } else if (
    viewer.originCountry &&
    candidate.originCountry &&
    normalize(viewer.originCountry) === normalize(candidate.originCountry)
  ) {
    score += WEIGHTS.sameOriginCountry;
    reasons.push(copy.sameOriginCountry);
    strongSignals += 1;
  }

  const sharedArtists = intersection(viewer.favoriteArtists, candidate.favoriteArtists);
  if (sharedArtists.length) {
    score += Math.min(24, sharedArtists.length * WEIGHTS.sharedArtist);
    reasons.push(copy.sharedArtists(sharedArtists.length));
    strongSignals += 1;
  }

  const sharedGenres = intersection(viewer.favoriteGenres, candidate.favoriteGenres);
  if (sharedGenres.length) {
    score += Math.min(12, sharedGenres.length * WEIGHTS.sharedGenre);
    reasons.push(copy.sharedGenres(sharedGenres.length));
    strongSignals += 1;
  }

  if (viewer.firstTimeAttendee === true && candidate.firstTimeAttendee === true) {
    score += WEIGHTS.bothFirstTime;
    reasons.push(copy.bothFirstTime);
  }

  if (Math.abs(viewer.groupSize - candidate.groupSize) <= 1) {
    score += WEIGHTS.compatibleGroupSize;
    reasons.push(copy.compatibleGroupSize);
  }

  const capped = Math.min(100, Math.round(score));
  const sparseData = strongSignals < 3;
  const strongest = reasons.slice(0, 4);

  return {
    profile: candidate,
    score: capped,
    label: labelForScore(capped, sparseData),
    reasons: strongest,
    warnings: warnings.slice(0, 2),
    sharedArtists,
    sharedGenres,
    sparseData,
    sharedPreferenceCount: strongSignals,
  };
}

function hasLookingForOverlap(viewer: FestivalSquadProfile, candidate: FestivalSquadProfile): boolean {
  return viewer.lookingFor.some((intent) => candidate.lookingFor.includes(intent));
}

/**
 * Rank candidates for the Festival Squad list.
 * Requires shared looking-for intent and at least two strong journey signals
 * (weak bonuses like group size alone never qualify).
 */
export function rankSquadMatches(
  viewer: FestivalSquadProfile,
  candidates: FestivalSquadProfile[],
  copy: MatchReasonCopy,
): SquadMatch[] {
  return candidates
    .filter(
      (profile) =>
        profile.id !== viewer.id &&
        !profile.visibility.hideProfile &&
        hasLookingForOverlap(viewer, profile),
    )
    .map((profile) => scoreSquadMatch(viewer, profile, copy))
    .filter((match) => match.sharedPreferenceCount >= MIN_STRONG_SIGNALS_TO_RANK)
    .sort((a, b) => b.score - a.score || a.profile.displayName.localeCompare(b.profile.displayName));
}

export function matchReasonCopyFromMessages(
  reasons: {
    sameArrivalDay: string;
    arrivalWithinOneDay: string;
    sameAccommodation: string;
    sameAccommodationType: string;
    similarBudget: string;
    sameOriginCity: string;
    sameOriginCountry: string;
    sharedArtistsOne: string;
    sharedArtistsMany: string;
    sharedGenresOne: string;
    sharedGenresMany: string;
    sameLookingFor: string;
    bothFirstTime: string;
    compatibleGroupSize: string;
    arrivalMismatch: string;
    budgetMismatch: string;
  },
): MatchReasonCopy {
  return {
    sameArrivalDay: reasons.sameArrivalDay,
    arrivalWithinOneDay: reasons.arrivalWithinOneDay,
    sameAccommodation: reasons.sameAccommodation,
    sameAccommodationType: reasons.sameAccommodationType,
    similarBudget: reasons.similarBudget,
    sameOriginCity: reasons.sameOriginCity,
    sameOriginCountry: reasons.sameOriginCountry,
    sharedArtists: (count) =>
      count === 1
        ? reasons.sharedArtistsOne
        : reasons.sharedArtistsMany.replace('{count}', String(count)),
    sharedGenres: (count) =>
      count === 1
        ? reasons.sharedGenresOne
        : reasons.sharedGenresMany.replace('{count}', String(count)),
    sameLookingFor: reasons.sameLookingFor,
    bothFirstTime: reasons.bothFirstTime,
    compatibleGroupSize: reasons.compatibleGroupSize,
    arrivalMismatch: reasons.arrivalMismatch,
    budgetMismatch: reasons.budgetMismatch,
  };
}

export function englishMatchReasonCopy(): MatchReasonCopy {
  return matchReasonCopyFromMessages({
    sameArrivalDay: 'Same arrival day',
    arrivalWithinOneDay: 'Arriving within one day',
    sameAccommodation: 'Same accommodation',
    sameAccommodationType: 'Similar accommodation type',
    similarBudget: 'Similar budget',
    sameOriginCity: 'Same origin city',
    sameOriginCountry: 'Same origin country',
    sharedArtistsOne: 'One shared favorite artist',
    sharedArtistsMany: '{count} shared favorite artists',
    sharedGenresOne: 'Shared genre taste',
    sharedGenresMany: '{count} shared genres',
    sameLookingFor: 'Looking for similar travel company',
    bothFirstTime: 'Both first-time attendees',
    compatibleGroupSize: 'Compatible group size',
    arrivalMismatch: 'Arrival dates are farther apart',
    budgetMismatch: 'Budget levels differ more',
  });
}

export function chineseMatchReasonCopy(): MatchReasonCopy {
  return matchReasonCopyFromMessages({
    sameArrivalDay: '同一天抵达',
    arrivalWithinOneDay: '抵达日相差一天内',
    sameAccommodation: '住宿相同',
    sameAccommodationType: '住宿类型相近',
    similarBudget: '预算相近',
    sameOriginCity: '同城出发',
    sameOriginCountry: '同国出发',
    sharedArtistsOne: '共同喜欢 1 位艺人',
    sharedArtistsMany: '共同喜欢 {count} 位艺人',
    sharedGenresOne: '曲风相近',
    sharedGenresMany: '{count} 个共同曲风',
    sameLookingFor: '寻找同类旅伴',
    bothFirstTime: '都是首次参加',
    compatibleGroupSize: '队伍规模相近',
    arrivalMismatch: '抵达日期差距较大',
    budgetMismatch: '预算档位差距较大',
  });
}

/** Map Nest matcher reason codes to localized display strings. */
export function localizeMatchReasonCodes(
  codes: string[],
  copy: {
    sameFestival?: string;
    sameArrivalDay: string;
    arrivalWithinOneDay: string;
    sameAccommodation: string;
    sameAccommodationType: string;
    similarBudget: string;
    sameOriginCity: string;
    sameOriginCountry: string;
    sharedArtistsOne: string;
    sharedArtistsMany: string;
    sharedGenresOne: string;
    sharedGenresMany: string;
    sameLookingFor: string;
    bothFirstTime: string;
    compatibleGroupSize: string;
    arrivalMismatch: string;
    budgetMismatch: string;
  },
  counts?: { artists?: number; genres?: number },
): string[] {
  const artists = counts?.artists ?? 0;
  const genres = counts?.genres ?? 0;
  return codes.map((code) => {
    switch (code) {
      case 'sameFestival':
        return copy.sameFestival ?? copy.sameLookingFor;
      case 'sameArrivalDay':
        return copy.sameArrivalDay;
      case 'arrivalWithinOneDay':
        return copy.arrivalWithinOneDay;
      case 'sameAccommodation':
        return copy.sameAccommodation;
      case 'sameAccommodationType':
        return copy.sameAccommodationType;
      case 'similarBudget':
        return copy.similarBudget;
      case 'sameOriginCity':
        return copy.sameOriginCity;
      case 'sameOriginCountry':
        return copy.sameOriginCountry;
      case 'sharedArtistsOne':
        return copy.sharedArtistsOne;
      case 'sharedArtistsMany':
        return copy.sharedArtistsMany.replace('{count}', String(artists));
      case 'sharedGenresOne':
        return copy.sharedGenresOne;
      case 'sharedGenresMany':
        return copy.sharedGenresMany.replace('{count}', String(genres));
      case 'sameLookingFor':
        return copy.sameLookingFor;
      case 'bothFirstTime':
        return copy.bothFirstTime;
      case 'compatibleGroupSize':
        return copy.compatibleGroupSize;
      case 'arrivalMismatch':
        return copy.arrivalMismatch;
      case 'budgetMismatch':
        return copy.budgetMismatch;
      default:
        return code;
    }
  });
}
