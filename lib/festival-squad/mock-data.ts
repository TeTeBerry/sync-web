import type { FestivalSquadProfile, FestivalSquadStats } from './types';
import { DEFAULT_VISIBILITY } from './types';

/**
 * MOCK DATA — isolated for Festival Squad MVP.
 * Replace via festival-squad repository / backend API when available.
 * Do not treat these counts as live metrics.
 */
export const MOCK_SQUAD_STATS_BY_EVENT: Record<number, FestivalSquadStats> = {
  // Tomorrowland Belgium (legacyId 4) — realistic illustrative mock
  4: {
    travelerCount: 537,
    lookingForRoommates: 34,
    lookingForBuddies: 51,
    lookingForRideShares: 18,
    lookingForTravelGroups: 22,
  },
};

export const DEFAULT_MOCK_STATS: FestivalSquadStats = {
  travelerCount: 128,
  lookingForRoommates: 34,
  lookingForBuddies: 51,
  lookingForRideShares: 18,
  lookingForTravelGroups: 12,
};

export function getMockSquadStats(eventId: number): FestivalSquadStats {
  return MOCK_SQUAD_STATS_BY_EVENT[eventId] ?? DEFAULT_MOCK_STATS;
}

export type MockFestivalDateRange = {
  start: string;
  end: string;
};

/** Add calendar days to a YYYY-MM-DD string (UTC calendar math). */
export function addDaysYmd(ymd: string, days: number): string | null {
  const match = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function stayName(
  eventId: number,
  type: FestivalSquadProfile['accommodationType'],
  tomorrowlandName: string,
  genericName: string,
): string {
  if (eventId === 4) return tomorrowlandName;
  return genericName;
}

type TravelerSeed = {
  idSuffix: string;
  displayName: string;
  originCity: string;
  originCountry: string;
  /** Days relative to festival start (negative = before). */
  arrivalOffset: number;
  /** Days relative to festival end (positive = after). */
  departureOffset: number;
  accommodationType: FestivalSquadProfile['accommodationType'];
  accommodationNameTl: string;
  accommodationNameGeneric: string;
  budgetLevel: FestivalSquadProfile['budgetLevel'];
  favoriteArtists: string[];
  favoriteGenres?: string[];
  lookingFor: FestivalSquadProfile['lookingFor'];
  groupSize?: number;
  firstTimeAttendee?: boolean;
  languages?: string[];
  shortNote?: string;
  verified?: boolean;
  roommatePreferences?: FestivalSquadProfile['roommatePreferences'];
  profileCompleteness?: number;
};

const TRAVELER_SEEDS: TravelerSeed[] = [
  {
    idSuffix: 'lily',
    displayName: 'Lily',
    originCity: 'Shanghai',
    originCountry: 'China',
    arrivalOffset: -1,
    departureOffset: 1,
    accommodationType: 'dreamville',
    accommodationNameTl: 'DreamVille',
    accommodationNameGeneric: 'Official Camping',
    budgetLevel: 'comfort',
    favoriteArtists: ['Hardwell', 'Maddix', 'Armin van Buuren'],
    lookingFor: ['roommate', 'festival_buddy'],
    roommatePreferences: { genderPreference: 'women' },
    shortNote: 'Looking for calm mornings and big nights.',
    verified: true,
    profileCompleteness: 0.92,
  },
  {
    idSuffix: 'kenji',
    displayName: 'Kenji',
    originCity: 'Tokyo',
    originCountry: 'Japan',
    arrivalOffset: -1,
    departureOffset: 1,
    accommodationType: 'hotel',
    accommodationNameTl: 'Antwerp City Hotel',
    accommodationNameGeneric: 'City Hotel',
    budgetLevel: 'premium',
    favoriteArtists: ['Amelie Lens', 'Charlotte de Witte'],
    favoriteGenres: ['Techno'],
    lookingFor: ['festival_buddy', 'ride_share'],
    firstTimeAttendee: false,
    groupSize: 2,
    languages: ['ja', 'en'],
    shortNote: 'Closing set with Amelie — want company for that walk back.',
  },
  {
    idSuffix: 'mira',
    displayName: 'Mira',
    originCity: 'Berlin',
    originCountry: 'Germany',
    arrivalOffset: 0,
    departureOffset: 0,
    accommodationType: 'camping',
    accommodationNameTl: 'Official Camping',
    accommodationNameGeneric: 'Official Camping',
    budgetLevel: 'budget',
    favoriteArtists: ['Maddix', 'Sub Zero Project'],
    favoriteGenres: ['Hardstyle', 'Big Room'],
    lookingFor: ['travel_group', 'festival_buddy'],
    groupSize: 3,
    firstTimeAttendee: true,
    shortNote: 'First Tomorrowland. Packing earplugs and too much hope.',
  },
  {
    idSuffix: 'owen',
    displayName: 'Owen',
    originCity: 'London',
    originCountry: 'United Kingdom',
    arrivalOffset: -2,
    departureOffset: 1,
    accommodationType: 'dreamville',
    accommodationNameTl: 'DreamVille',
    accommodationNameGeneric: 'Official Camping',
    budgetLevel: 'comfort',
    favoriteArtists: ['Hardwell', 'Martin Garrix'],
    lookingFor: ['roommate', 'ride_share'],
    languages: ['en'],
    verified: true,
    shortNote: 'Arriving early to settle DreamVille before the gates open.',
  },
  {
    idSuffix: 'sofia',
    displayName: 'Sofia',
    originCity: 'São Paulo',
    originCountry: 'Brazil',
    arrivalOffset: -1,
    departureOffset: 1,
    accommodationType: 'hostel',
    accommodationNameTl: 'Boom Hostel',
    accommodationNameGeneric: 'Hostels near venue',
    budgetLevel: 'budget',
    favoriteArtists: ['Armin van Buuren', 'Above & Beyond'],
    favoriteGenres: ['Trance'],
    lookingFor: ['festival_buddy'],
    firstTimeAttendee: true,
    shortNote: 'Trance sunrise people — find me near the Mainstage rail.',
  },
  {
    idSuffix: 'noah',
    displayName: 'Noah',
    originCity: 'Amsterdam',
    originCountry: 'Netherlands',
    arrivalOffset: -1,
    departureOffset: 0,
    accommodationType: 'hotel',
    accommodationNameTl: 'Near De Schorre',
    accommodationNameGeneric: 'Near the venue',
    budgetLevel: 'comfort',
    favoriteArtists: ['Hardwell', 'Maddix', 'Oliver Heldens'],
    lookingFor: ['ride_share', 'festival_buddy'],
    groupSize: 1,
    shortNote: 'Driving from Antwerp station if anyone needs a seat.',
  },
  {
    idSuffix: 'aisha',
    displayName: 'Aisha',
    originCity: 'Dubai',
    originCountry: 'UAE',
    arrivalOffset: 0,
    departureOffset: 1,
    accommodationType: 'dreamville',
    accommodationNameTl: 'DreamVille',
    accommodationNameGeneric: 'Official Camping',
    budgetLevel: 'premium',
    favoriteArtists: ['Swedish House Mafia', 'Hardwell'],
    lookingFor: ['roommate', 'travel_group'],
    roommatePreferences: { genderPreference: 'women' },
    groupSize: 2,
    shortNote: 'DreamVille twin — quiet sleeper, loud days.',
  },
  {
    idSuffix: 'leo',
    displayName: 'Leo',
    originCity: 'Shanghai',
    originCountry: 'China',
    arrivalOffset: -1,
    departureOffset: 1,
    accommodationType: 'dreamville',
    accommodationNameTl: 'DreamVille',
    accommodationNameGeneric: 'Official Camping',
    budgetLevel: 'comfort',
    favoriteArtists: ['Maddix', 'Hardwell', 'Timmy Trumpet'],
    lookingFor: ['festival_buddy', 'roommate'],
    languages: ['zh', 'en'],
    shortNote: 'Same arrival, same area — happy to share shuttles.',
  },
];

/**
 * Mock travelers for a festival.
 * Requires a parseable festival date range — otherwise returns [] so UI can show empty state
 * instead of Tomorrowland-dated travelers on unrelated festivals.
 */
export function getMockTravelers(
  eventId: number,
  dateRange: MockFestivalDateRange | null,
): FestivalSquadProfile[] {
  if (!dateRange?.start || !dateRange?.end) return [];

  const now = new Date().toISOString();
  const travelers: FestivalSquadProfile[] = [];

  for (const seed of TRAVELER_SEEDS) {
    const arrivalDate = addDaysYmd(dateRange.start, seed.arrivalOffset);
    const departureDate = addDaysYmd(dateRange.end, seed.departureOffset);
    if (!arrivalDate || !departureDate) continue;

    travelers.push({
      id: `${eventId}-${seed.idSuffix}`,
      userId: `mock-${eventId}-${seed.idSuffix}`,
      eventId,
      displayName: seed.displayName,
      originCity: seed.originCity,
      originCountry: seed.originCountry,
      arrivalDate,
      departureDate,
      accommodationStatus: 'booked',
      accommodationType: seed.accommodationType,
      accommodationName: stayName(
        eventId,
        seed.accommodationType,
        seed.accommodationNameTl,
        seed.accommodationNameGeneric,
      ),
      budgetLevel: seed.budgetLevel,
      favoriteArtists: seed.favoriteArtists,
      favoriteGenres: seed.favoriteGenres ?? ['Big Room', 'Techno'],
      lookingFor: seed.lookingFor,
      languages: seed.languages ?? ['en'],
      groupSize: seed.groupSize ?? 1,
      firstTimeAttendee: seed.firstTimeAttendee ?? true,
      shortNote: seed.shortNote,
      visibility: DEFAULT_VISIBILITY,
      roommatePreferences: seed.roommatePreferences,
      profileCompleteness: seed.profileCompleteness ?? 0.85,
      verified: seed.verified ?? false,
      createdAt: now,
      updatedAt: now,
    });
  }

  return travelers;
}
