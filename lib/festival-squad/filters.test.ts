import { describe, expect, it } from 'vitest';
import { applySquadFilters, summarizeMatches } from './filters';
import { englishMatchReasonCopy, scoreSquadMatch } from './matching';
import type { FestivalSquadProfile, SquadMatch } from './types';
import { DEFAULT_SQUAD_FILTERS, DEFAULT_VISIBILITY } from './types';

function profile(overrides: Partial<FestivalSquadProfile> = {}): FestivalSquadProfile {
  return {
    id: 'viewer',
    userId: 'u1',
    eventId: 4,
    displayName: 'Alex',
    originCity: 'Shanghai',
    originCountry: 'China',
    arrivalDate: '2026-07-16',
    departureDate: '2026-07-20',
    accommodationStatus: 'booked',
    accommodationType: 'dreamville',
    accommodationName: 'DreamVille',
    budgetLevel: 'comfort',
    favoriteArtists: ['Hardwell'],
    favoriteGenres: ['Big Room'],
    lookingFor: ['festival_buddy', 'roommate'],
    groupSize: 1,
    firstTimeAttendee: true,
    visibility: DEFAULT_VISIBILITY,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function asMatch(candidate: FestivalSquadProfile): SquadMatch {
  return scoreSquadMatch(profile(), candidate, englishMatchReasonCopy());
}

describe('applySquadFilters', () => {
  it('filters by looking-for and same city', () => {
    const viewer = profile();
    const matches = [
      asMatch(profile({ id: 'a', lookingFor: ['roommate'], originCity: 'Shanghai' })),
      asMatch(profile({ id: 'b', lookingFor: ['ride_share'], originCity: 'Tokyo', originCountry: 'Japan' })),
    ];

    const filtered = applySquadFilters(matches, viewer, {
      ...DEFAULT_SQUAD_FILTERS,
      lookingFor: 'roommate',
      origin: 'same_city',
    });

    expect(filtered.map((item) => item.profile.id)).toEqual(['a']);
  });
});

describe('summarizeMatches', () => {
  it('counts shared journey signals', () => {
    const viewer = profile();
    const matches = [
      asMatch(profile({ id: 'a', arrivalDate: '2026-07-16', lookingFor: ['roommate'] })),
      asMatch(
        profile({
          id: 'b',
          arrivalDate: '2026-07-18',
          accommodationType: 'hotel',
          accommodationName: 'Other',
          favoriteArtists: ['Amelie Lens'],
          lookingFor: ['festival_buddy'],
        }),
      ),
    ];

    const summary = summarizeMatches(matches, viewer);
    expect(summary.sameArrivalDay).toBe(1);
    expect(summary.lookingForRoommates).toBe(1);
  });

  it('does not treat mutual not_decided stays as the same accommodation', () => {
    const viewer = profile({
      accommodationType: 'not_decided',
      accommodationName: undefined,
    });
    const matches = [
      asMatch(
        profile({
          id: 'a',
          accommodationType: 'not_decided',
          accommodationName: undefined,
          lookingFor: ['festival_buddy'],
        }),
      ),
    ];

    const summary = summarizeMatches(matches, viewer);
    expect(summary.sameAccommodation).toBe(0);
  });
});
