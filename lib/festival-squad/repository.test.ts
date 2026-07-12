import { describe, expect, it } from 'vitest';
import {
  buildPrefillSquadProfile,
  createSquadProfileFromDraft,
  normalizePlannerPreferences,
  normalizeSquadProfile,
} from './repository';
import { DEFAULT_VISIBILITY } from './types';

describe('normalizeSquadProfile', () => {
  it('returns null for corrupt payloads', () => {
    expect(normalizeSquadProfile(null, 4)).toBeNull();
    expect(normalizeSquadProfile({ displayName: 'x' }, 4)).toBeNull();
    expect(
      normalizeSquadProfile(
        {
          id: '1',
          userId: 'u',
          eventId: 9,
          displayName: 'A',
          arrivalDate: '2026-07-16',
        },
        4,
      ),
    ).toBeNull();
  });

  it('fills safe defaults for partial valid profiles', () => {
    const profile = normalizeSquadProfile(
      {
        id: 'p1',
        userId: 'u1',
        eventId: 4,
        displayName: 'Lily',
        arrivalDate: '2026-07-16',
        lookingFor: ['roommate', 'not-a-real-intent'],
        visibility: { hideProfile: true },
      },
      4,
    );

    expect(profile).not.toBeNull();
    expect(profile?.lookingFor).toEqual(['roommate']);
    expect(profile?.departureDate).toBe('2026-07-16');
    expect(profile?.budgetLevel).toBe('comfort');
    expect(profile?.visibility.hideProfile).toBe(true);
    expect(profile?.visibility.showExactCity).toBe(true);
    expect(profile?.visibility).toMatchObject({
      ...DEFAULT_VISIBILITY,
      hideProfile: true,
    });
  });
});

describe('normalizePlannerPreferences', () => {
  it('returns null for corrupt preference payloads', () => {
    expect(normalizePlannerPreferences(null)).toBeNull();
    expect(normalizePlannerPreferences({ origin: 'Shanghai' })).toBeNull();
    expect(
      normalizePlannerPreferences({
        origin: '',
        travelStyle: 'smart',
        stayPreference: 'festival',
        journeyType: 'solo',
        priorities: [],
      }),
    ).toBeNull();
  });

  it('accepts valid preferences and drops unknown priorities', () => {
    const prefs = normalizePlannerPreferences({
      origin: 'Shanghai, China',
      travelStyle: 'smart',
      stayPreference: 'festival',
      journeyType: 'solo',
      priorities: ['artists', 'not-real', 'budget'],
    });

    expect(prefs).toEqual({
      origin: 'Shanghai, China',
      travelStyle: 'smart',
      stayPreference: 'festival',
      journeyType: 'solo',
      priorities: ['artists', 'budget'],
    });
  });
});

describe('buildPrefillSquadProfile', () => {
  it('parses free-form festival dates and arrives one day early', () => {
    const draft = buildPrefillSquadProfile({
      eventId: 4,
      festivalDateLabel: '07/17-19',
      preferences: {
        origin: 'Shanghai, China',
        travelStyle: 'smart',
        stayPreference: 'festival',
        journeyType: 'solo',
        priorities: ['artists'],
      },
      favoriteArtists: ['Hardwell'],
    });

    expect(draft.originCity).toBe('Shanghai');
    expect(draft.originCountry).toBe('China');
    expect(draft.arrivalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(draft.accommodationType).toBe('dreamville');
    expect(draft.favoriteArtists).toEqual(['Hardwell']);
  });

  it('prefers structured ISO start/end dates', () => {
    const draft = buildPrefillSquadProfile({
      eventId: 4,
      festivalStartDate: '2026-07-17',
      festivalEndDate: '2026-07-19',
      festivalDateLabel: 'ignored',
    });
    expect(draft.arrivalDate).toBe('2026-07-16');
    expect(draft.departureDate).toBe('2026-07-19');
  });

  it('leaves dates empty when nothing is parseable', () => {
    const draft = buildPrefillSquadProfile({
      eventId: 4,
      festivalDateLabel: 'TBA',
    });
    expect(draft.arrivalDate).toBe('');
    expect(draft.departureDate).toBe('');
  });
});

describe('createSquadProfileFromDraft', () => {
  it('binds profile to authenticated user id', () => {
    const profile = createSquadProfileFromDraft(
      4,
      {
        displayName: 'Ada',
        originCity: 'Shanghai',
        arrivalDate: '2026-07-16',
        departureDate: '2026-07-20',
        lookingFor: ['festival_buddy'],
      },
      'auth-user-123',
    );
    expect(profile.userId).toBe('auth-user-123');
    expect(profile.displayName).toBe('Ada');
  });
});
