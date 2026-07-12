import type { FestivalSquadProfile, SquadFilterState, SquadMatch } from './types';

function dayDiff(a: string, b: string): number | null {
  const left = Date.parse(a);
  const right = Date.parse(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return Math.round(Math.abs(left - right) / 86_400_000);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function applySquadFilters(
  matches: SquadMatch[],
  viewer: FestivalSquadProfile,
  filters: SquadFilterState,
): SquadMatch[] {
  return matches.filter((match) => {
    const p = match.profile;

    if (filters.lookingFor !== 'any' && !p.lookingFor.includes(filters.lookingFor)) {
      return false;
    }

    if (filters.origin === 'same_city') {
      if (normalize(p.originCity) !== normalize(viewer.originCity)) return false;
    } else if (filters.origin === 'same_country') {
      if (
        !viewer.originCountry ||
        !p.originCountry ||
        normalize(p.originCountry) !== normalize(viewer.originCountry)
      ) {
        return false;
      }
    }

    if (filters.arrival === 'same_day') {
      if (dayDiff(viewer.arrivalDate, p.arrivalDate) !== 0) return false;
    } else if (filters.arrival === 'within_one_day') {
      const gap = dayDiff(viewer.arrivalDate, p.arrivalDate);
      if (gap == null || gap > 1) return false;
    }

    if (filters.accommodation === 'same') {
      const sameName =
        viewer.accommodationName &&
        p.accommodationName &&
        normalize(viewer.accommodationName) === normalize(p.accommodationName);
      const decidedSameType =
        viewer.accommodationType !== 'not_decided' &&
        p.accommodationType !== 'not_decided' &&
        viewer.accommodationType === p.accommodationType;
      if (!sameName && !decidedSameType) return false;
    } else if (filters.accommodation !== 'any') {
      if (p.accommodationType !== filters.accommodation) return false;
    }

    if (filters.budget === 'similar') {
      if (p.budgetLevel !== viewer.budgetLevel) return false;
    } else if (filters.budget !== 'any') {
      if (p.budgetLevel !== filters.budget) return false;
    }

    if (filters.music === 'shared_artists' && match.sharedArtists.length === 0) return false;
    if (filters.music === 'shared_genres' && match.sharedGenres.length === 0) return false;

    if (filters.other === 'first_time' && p.firstTimeAttendee !== true) return false;
    if (filters.other === 'returning' && p.firstTimeAttendee !== false) return false;
    if (filters.other === 'solo' && p.groupSize !== 1) return false;

    return true;
  });
}

export function summarizeMatches(matches: SquadMatch[], viewer: FestivalSquadProfile) {
  let sameArrivalDay = 0;
  let sameAccommodation = 0;
  let sharedArtists = 0;
  let lookingForRoommates = 0;

  for (const match of matches) {
    if (dayDiff(viewer.arrivalDate, match.profile.arrivalDate) === 0) sameArrivalDay += 1;

    const sameName =
      Boolean(viewer.accommodationName && match.profile.accommodationName) &&
      normalize(viewer.accommodationName!) === normalize(match.profile.accommodationName!);
    const decidedSameType =
      viewer.accommodationType !== 'not_decided' &&
      match.profile.accommodationType !== 'not_decided' &&
      viewer.accommodationType === match.profile.accommodationType;
    if (sameName || decidedSameType) sameAccommodation += 1;

    if (match.sharedArtists.length > 0) sharedArtists += 1;
    if (match.profile.lookingFor.includes('roommate')) lookingForRoommates += 1;
  }

  return { sameArrivalDay, sameAccommodation, sharedArtists, lookingForRoommates };
}
