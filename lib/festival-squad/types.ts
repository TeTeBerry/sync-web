/** Festival Squad domain types — frontend MVP. Replace repository with API later. */

export type LookingForIntent = 'festival_buddy' | 'roommate' | 'ride_share' | 'travel_group';

export type AccommodationStatus = 'booked' | 'planning' | 'looking_roommates' | 'not_decided';

export type AccommodationType = 'dreamville' | 'camping' | 'hotel' | 'hostel' | 'not_decided';

export type BudgetLevel = 'budget' | 'comfort' | 'premium';

export type ProfileVisibility = {
  showExactCity: boolean;
  showCountryOnly: boolean;
  showAccommodationName: boolean;
  showAccommodationTypeOnly: boolean;
  allowConnectionRequests: boolean;
  hideProfile: boolean;
};

export type RoommatePreferences = {
  /** Neutral preference label only — never framed as dating. */
  genderPreference?: 'any' | 'same' | 'women' | 'men';
};

export type FestivalSquadProfile = {
  id: string;
  /** Local anonymous id until web auth exists. */
  userId: string;
  eventId: number;
  displayName: string;
  avatarUrl?: string;
  originCity: string;
  originCountry?: string;
  arrivalDate: string;
  departureDate: string;
  accommodationStatus: AccommodationStatus;
  accommodationType: AccommodationType;
  accommodationName?: string;
  budgetLevel: BudgetLevel;
  favoriteArtists: string[];
  favoriteGenres: string[];
  lookingFor: LookingForIntent[];
  languages?: string[];
  groupSize: number;
  firstTimeAttendee?: boolean;
  shortNote?: string;
  visibility: ProfileVisibility;
  /** Removes this profile from new-match discovery without deleting it. */
  matchingPaused?: boolean;
  roommatePreferences?: RoommatePreferences;
  createdAt: string;
  updatedAt: string;
  /** Mock-only completeness for trust indicator. */
  profileCompleteness?: number;
  verified?: boolean;
};

export type ConnectionRequestStatus =
  | 'not_sent'
  | 'sending'
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'error';

export type SquadConnectionRequest = {
  id: string;
  senderProfileId: string;
  receiverProfileId: string;
  eventId: number;
  intent: LookingForIntent;
  message: string;
  status: ConnectionRequestStatus;
  createdAt: string;
  updatedAt: string;
  counterpart?: FestivalSquadProfile;
  sharedArtistIds?: string[];
  reasons?: string[];
};

export type MatchCompatibilityLabel = 'excellent' | 'strong' | 'good' | 'some_shared' | 'sparse';

export type SquadMatch = {
  profile: FestivalSquadProfile;
  score: number;
  label: MatchCompatibilityLabel;
  reasons: string[];
  warnings: string[];
  sharedArtists: string[];
  sharedGenres: string[];
  /** When true, prefer “Based on N shared preferences” over a precise %. */
  sparseData: boolean;
  sharedPreferenceCount: number;
};

export type SquadFilterState = {
  lookingFor: LookingForIntent | 'any';
  origin: 'same_city' | 'same_country' | 'any';
  arrival: 'same_day' | 'within_one_day' | 'any';
  accommodation: AccommodationType | 'same' | 'any';
  budget: BudgetLevel | 'similar' | 'any';
  music: 'shared_artists' | 'shared_genres' | 'any';
  other: 'first_time' | 'returning' | 'solo' | 'any';
};

export type FestivalSquadStats = {
  travelerCount: number;
  lookingForRoommates: number;
  lookingForBuddies: number;
  lookingForRideShares: number;
  lookingForTravelGroups: number;
};

export type MatchSummaryCounts = {
  sameArrivalDay: number;
  sameAccommodation: number;
  sharedArtists: number;
  lookingForRoommates: number;
};

export const DEFAULT_SQUAD_FILTERS: SquadFilterState = {
  lookingFor: 'any',
  origin: 'any',
  arrival: 'any',
  accommodation: 'any',
  budget: 'any',
  music: 'any',
  other: 'any',
};

export const DEFAULT_VISIBILITY: ProfileVisibility = {
  showExactCity: true,
  showCountryOnly: false,
  showAccommodationName: true,
  showAccommodationTypeOnly: false,
  allowConnectionRequests: true,
  hideProfile: false,
};
