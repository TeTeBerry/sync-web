import { describe, expect, it } from 'vitest';
import {
  englishMatchReasonCopy,
  rankSquadMatches,
  scoreSquadMatch,
} from './matching';
import type { FestivalSquadProfile } from './types';
import { DEFAULT_VISIBILITY } from './types';

function profile(overrides: Partial<FestivalSquadProfile>): FestivalSquadProfile {
  return {
    id: 'p1',
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
    favoriteArtists: ['Hardwell', 'Maddix'],
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

const copy = englishMatchReasonCopy();

describe('scoreSquadMatch', () => {
  it('scores strong journey overlap as an excellent or strong match', () => {
    const viewer = profile({ id: 'viewer' });
    const candidate = profile({
      id: 'cand',
      displayName: 'Lily',
      favoriteArtists: ['Hardwell', 'Maddix', 'Armin van Buuren'],
    });

    const match = scoreSquadMatch(viewer, candidate, copy);
    expect(match.score).toBeGreaterThanOrEqual(62);
    expect(['excellent', 'strong']).toContain(match.label);
    expect(match.reasons.length).toBeGreaterThan(0);
    expect(match.sharedArtists).toEqual(expect.arrayContaining(['Hardwell', 'Maddix']));
    expect(match.sparseData).toBe(false);
    expect(match.sharedPreferenceCount).toBeGreaterThanOrEqual(2);
  });

  it('marks sparse data when fewer than 3 strong signals match', () => {
    const viewer = profile({ id: 'viewer' });
    const candidate = profile({
      id: 'cand',
      originCity: 'Berlin',
      originCountry: 'Germany',
      arrivalDate: '2026-07-18',
      accommodationType: 'hotel',
      accommodationName: 'City Hotel',
      budgetLevel: 'premium',
      favoriteArtists: ['Amelie Lens'],
      favoriteGenres: ['Techno'],
      lookingFor: ['ride_share'],
      firstTimeAttendee: false,
      groupSize: 4,
    });

    const match = scoreSquadMatch(viewer, candidate, copy);
    expect(match.sparseData).toBe(true);
    expect(match.label).toBe('sparse');
  });

  it('returns zero for different festivals', () => {
    const viewer = profile({ id: 'viewer', eventId: 4 });
    const candidate = profile({ id: 'cand', eventId: 9 });
    const match = scoreSquadMatch(viewer, candidate, copy);
    expect(match.score).toBe(0);
  });

  it('does not count not_decided accommodation as a type match', () => {
    const viewer = profile({
      id: 'viewer',
      accommodationType: 'not_decided',
      accommodationName: undefined,
    });
    const candidate = profile({
      id: 'cand',
      accommodationType: 'not_decided',
      accommodationName: undefined,
      favoriteArtists: [],
      favoriteGenres: [],
      lookingFor: ['festival_buddy'],
      originCity: 'Tokyo',
      originCountry: 'Japan',
      arrivalDate: '2026-07-19',
      budgetLevel: 'premium',
      firstTimeAttendee: false,
      groupSize: 4,
    });

    const match = scoreSquadMatch(viewer, candidate, copy);
    expect(match.reasons.some((reason) => /accommodation|住宿/i.test(reason))).toBe(false);
  });
});

describe('rankSquadMatches', () => {
  it('excludes the viewer, hidden profiles, and ranks by score', () => {
    const viewer = profile({ id: 'viewer' });
    const strong = profile({ id: 'strong', displayName: 'Strong' });
    const weaker = profile({
      id: 'weaker',
      displayName: 'Weaker',
      originCity: 'Beijing',
      originCountry: 'China',
      arrivalDate: '2026-07-16',
      accommodationType: 'hotel',
      accommodationName: 'Hotel One',
      budgetLevel: 'budget',
      favoriteArtists: ['Charlotte de Witte'],
      lookingFor: ['festival_buddy'],
      firstTimeAttendee: false,
      groupSize: 2,
    });
    const hidden = profile({
      id: 'hidden',
      visibility: { ...DEFAULT_VISIBILITY, hideProfile: true },
    });

    const ranked = rankSquadMatches(viewer, [viewer, strong, weaker, hidden], copy);
    expect(ranked.map((m) => m.profile.id)).toEqual(['strong', 'weaker']);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });

  it('excludes candidates without looking-for overlap', () => {
    const viewer = profile({ id: 'viewer', lookingFor: ['roommate'] });
    const noOverlap = profile({
      id: 'ride',
      lookingFor: ['ride_share'],
    });

    const ranked = rankSquadMatches(viewer, [noOverlap], copy);
    expect(ranked).toEqual([]);
  });

  it('excludes weak-only overlaps (group size / first-time alone)', () => {
    const viewer = profile({
      id: 'viewer',
      lookingFor: ['festival_buddy'],
      originCity: 'Shanghai',
      originCountry: 'China',
      arrivalDate: '2026-07-16',
      accommodationType: 'not_decided',
      accommodationName: undefined,
      budgetLevel: 'comfort',
      favoriteArtists: [],
      favoriteGenres: [],
      groupSize: 1,
      firstTimeAttendee: true,
    });
    const weakOnly = profile({
      id: 'weak',
      lookingFor: ['festival_buddy'],
      originCity: 'Lisbon',
      originCountry: 'Portugal',
      arrivalDate: '2026-07-20',
      accommodationType: 'hostel',
      accommodationName: 'Hostel',
      budgetLevel: 'premium',
      favoriteArtists: ['Amelie Lens'],
      favoriteGenres: ['Techno'],
      groupSize: 1,
      firstTimeAttendee: true,
    });

    const ranked = rankSquadMatches(viewer, [weakOnly], copy);
    expect(ranked).toEqual([]);
  });
});
