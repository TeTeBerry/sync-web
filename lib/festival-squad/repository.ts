import { parseActivityEndYmd, parseActivityStartYmd } from '../activity-date';
import type { PlannerPreferences, StayPreference, TravelStyle, JourneyType, PersonalPriority } from '../planner-plan';
import { lineupSelectionStorageKey } from '../lineup-selection';
import type {
  AccommodationStatus,
  AccommodationType,
  BudgetLevel,
  FestivalSquadProfile,
  LookingForIntent,
  ProfileVisibility,
} from './types';
import { DEFAULT_VISIBILITY } from './types';

const STORAGE_PREFIX = 'raven-squad-profile';
const CONNECTION_PREFIX = 'raven-squad-connections';
const LOCAL_USER_KEY = 'raven-squad-local-user';

const LOOKING_FOR_VALUES = new Set<LookingForIntent>([
  'festival_buddy',
  'roommate',
  'ride_share',
  'travel_group',
]);

const ACCOMMODATION_STATUS = new Set<AccommodationStatus>([
  'booked',
  'planning',
  'looking_roommates',
  'not_decided',
]);

const ACCOMMODATION_TYPE = new Set<AccommodationType>([
  'dreamville',
  'camping',
  'hotel',
  'hostel',
  'not_decided',
]);

const BUDGET_LEVEL = new Set<BudgetLevel>(['budget', 'comfort', 'premium']);

const TRAVEL_STYLES = new Set<TravelStyle>(['budget', 'smart', 'premium']);
const STAY_PREFERENCES = new Set<StayPreference>(['festival', 'city', 'value']);
const JOURNEY_TYPES = new Set<JourneyType>(['solo', 'friends', 'couple', 'tribe']);
const PERSONAL_PRIORITIES = new Set<PersonalPriority>([
  'artists',
  'discover',
  'party',
  'city',
  'people',
  'budget',
]);

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isYmd(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function asLookingFor(value: unknown): LookingForIntent[] {
  if (!Array.isArray(value)) return ['festival_buddy'];
  const next = value.filter((item): item is LookingForIntent =>
    typeof item === 'string' && LOOKING_FOR_VALUES.has(item as LookingForIntent),
  );
  return next.length ? next : ['festival_buddy'];
}

function asVisibility(value: unknown): ProfileVisibility {
  if (!value || typeof value !== 'object') return { ...DEFAULT_VISIBILITY };
  const raw = value as Record<string, unknown>;
  return {
    showExactCity: raw.showExactCity !== false,
    showCountryOnly: raw.showCountryOnly === true,
    showAccommodationName: raw.showAccommodationName !== false,
    showAccommodationTypeOnly: raw.showAccommodationTypeOnly === true,
    allowConnectionRequests: raw.allowConnectionRequests !== false,
    hideProfile: raw.hideProfile === true,
  };
}

/** Validate/normalize stored profile JSON. Returns null when unusable. */
export function normalizeSquadProfile(
  raw: unknown,
  expectedEventId: number,
): FestivalSquadProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const eventId = typeof o.eventId === 'number' ? o.eventId : Number(o.eventId);
  if (!Number.isFinite(eventId) || eventId !== expectedEventId) return null;

  const id = asString(o.id);
  const userId = asString(o.userId);
  const displayName = asString(o.displayName);
  if (!id || !userId || !displayName) return null;

  const arrivalDate = isYmd(o.arrivalDate) ? o.arrivalDate.trim() : '';
  const departureDate = isYmd(o.departureDate) ? o.departureDate.trim() : arrivalDate;
  if (!arrivalDate) return null;

  const accommodationStatus = ACCOMMODATION_STATUS.has(o.accommodationStatus as AccommodationStatus)
    ? (o.accommodationStatus as AccommodationStatus)
    : 'not_decided';
  const accommodationType = ACCOMMODATION_TYPE.has(o.accommodationType as AccommodationType)
    ? (o.accommodationType as AccommodationType)
    : 'not_decided';
  const budgetLevel = BUDGET_LEVEL.has(o.budgetLevel as BudgetLevel)
    ? (o.budgetLevel as BudgetLevel)
    : 'comfort';

  const groupSizeRaw = typeof o.groupSize === 'number' ? o.groupSize : Number(o.groupSize);
  const groupSize =
    Number.isFinite(groupSizeRaw) && groupSizeRaw >= 1 ? Math.min(8, Math.round(groupSizeRaw)) : 1;

  const now = new Date().toISOString();

  return {
    id,
    userId,
    eventId,
    displayName,
    avatarUrl: asString(o.avatarUrl) || undefined,
    originCity: asString(o.originCity) || '—',
    originCountry: asString(o.originCountry) || undefined,
    arrivalDate,
    departureDate: departureDate || arrivalDate,
    accommodationStatus,
    accommodationType,
    accommodationName: asString(o.accommodationName) || undefined,
    budgetLevel,
    favoriteArtists: asStringArray(o.favoriteArtists),
    favoriteGenres: asStringArray(o.favoriteGenres),
    lookingFor: asLookingFor(o.lookingFor),
    languages: asStringArray(o.languages),
    groupSize,
    firstTimeAttendee: typeof o.firstTimeAttendee === 'boolean' ? o.firstTimeAttendee : undefined,
    shortNote: asString(o.shortNote) || undefined,
    visibility: asVisibility(o.visibility),
    roommatePreferences:
      o.roommatePreferences && typeof o.roommatePreferences === 'object'
        ? (o.roommatePreferences as FestivalSquadProfile['roommatePreferences'])
        : undefined,
    profileCompleteness:
      typeof o.profileCompleteness === 'number' ? o.profileCompleteness : undefined,
    verified: o.verified === true,
    createdAt: asString(o.createdAt) || now,
    updatedAt: asString(o.updatedAt) || now,
  };
}

export function getOrCreateLocalUserId(): string {
  if (!canUseStorage()) return 'local-anonymous';
  const existing = window.localStorage.getItem(LOCAL_USER_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `local-${Date.now()}`;
  window.localStorage.setItem(LOCAL_USER_KEY, id);
  return id;
}

/**
 * Prefer the authenticated Raven user id as Squad ownership key.
 * Persists the binding so later anonymous reads still resolve ownership.
 */
export function resolveSquadOwnerUserId(authUserId?: string | null): string {
  const trimmed = authUserId?.trim();
  if (trimmed) {
    if (canUseStorage()) {
      window.localStorage.setItem(LOCAL_USER_KEY, trimmed);
    }
    return trimmed;
  }
  return getOrCreateLocalUserId();
}

/**
 * Rebind an existing local Squad profile to the authenticated user id.
 * Returns the updated profile, or null when none exists.
 */
export function bindSquadProfileToAuthUser(
  eventId: number,
  authUserId: string,
): FestivalSquadProfile | null {
  const existing = readSquadProfile(eventId);
  if (!existing) {
    resolveSquadOwnerUserId(authUserId);
    return null;
  }
  if (existing.userId === authUserId) {
    resolveSquadOwnerUserId(authUserId);
    return existing;
  }
  return writeSquadProfile({ ...existing, userId: authUserId });
}

function profileKey(eventId: number): string {
  return `${STORAGE_PREFIX}:${eventId}`;
}

function connectionsKey(eventId: number): string {
  return `${CONNECTION_PREFIX}:${eventId}`;
}

export function readSquadProfile(eventId: number): FestivalSquadProfile | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(profileKey(eventId));
    if (!raw) return null;
    return normalizeSquadProfile(JSON.parse(raw), eventId);
  } catch {
    return null;
  }
}

export function writeSquadProfile(profile: FestivalSquadProfile): FestivalSquadProfile {
  const next = { ...profile, updatedAt: new Date().toISOString() };
  if (canUseStorage()) {
    window.localStorage.setItem(profileKey(profile.eventId), JSON.stringify(next));
  }
  return next;
}

export function clearSquadProfile(eventId: number): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(profileKey(eventId));
}

export type StoredConnection = {
  id: string;
  senderProfileId: string;
  receiverProfileId: string;
  eventId: number;
  intent: LookingForIntent;
  message: string;
  status: 'sent' | 'accepted' | 'declined' | 'cancelled' | 'error';
  createdAt: string;
  updatedAt: string;
};

export function readConnections(eventId: number): StoredConnection[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(connectionsKey(eventId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredConnection =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as StoredConnection).id === 'string' &&
        typeof (item as StoredConnection).receiverProfileId === 'string',
    );
  } catch {
    return [];
  }
}

export function writeConnections(eventId: number, connections: StoredConnection[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(connectionsKey(eventId), JSON.stringify(connections));
}

export function upsertConnection(connection: StoredConnection): StoredConnection {
  const list = readConnections(connection.eventId);
  const index = list.findIndex(
    (item) =>
      item.receiverProfileId === connection.receiverProfileId &&
      item.senderProfileId === connection.senderProfileId,
  );
  if (index >= 0) list[index] = connection;
  else list.push(connection);
  writeConnections(connection.eventId, list);
  return connection;
}

export function getConnectionTo(
  eventId: number,
  senderProfileId: string,
  receiverProfileId: string,
): StoredConnection | null {
  return (
    readConnections(eventId).find(
      (item) =>
        item.senderProfileId === senderProfileId &&
        item.receiverProfileId === receiverProfileId,
    ) ?? null
  );
}

function budgetFromTravelStyle(style: TravelStyle): BudgetLevel {
  if (style === 'budget') return 'budget';
  if (style === 'premium') return 'premium';
  return 'comfort';
}

function accommodationFromStay(stay: StayPreference): AccommodationType {
  if (stay === 'festival') return 'dreamville';
  if (stay === 'value') return 'hostel';
  return 'hotel';
}

function lookingForFromJourney(
  journeyType: PlannerPreferences['journeyType'],
): LookingForIntent[] {
  if (journeyType === 'tribe') return ['travel_group', 'festival_buddy'];
  if (journeyType === 'friends') return ['festival_buddy', 'travel_group'];
  if (journeyType === 'couple') return ['festival_buddy'];
  return ['festival_buddy', 'roommate'];
}

function parseOrigin(origin: string): { city: string; country?: string } {
  const parts = origin
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts[0], country: parts.slice(1).join(', ') };
  }
  return { city: origin.trim() };
}

/** Resolve festival start YYYY-MM-DD from structured or free-form activity dates. */
export function resolveFestivalStartYmd(
  festivalStartDate?: string,
  festivalDateLabel?: string,
): string | null {
  if (festivalStartDate) {
    const structured = festivalStartDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (structured) return structured[0];
    const parsed = parseActivityStartYmd(festivalStartDate);
    if (parsed) return parsed;
  }
  return parseActivityStartYmd(festivalDateLabel);
}

export function resolveFestivalEndYmd(
  festivalEndDate?: string,
  festivalDateLabel?: string,
  fallbackStart?: string | null,
): string | null {
  if (festivalEndDate) {
    const structured = festivalEndDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (structured) return structured[0];
    const parsed = parseActivityEndYmd(festivalEndDate);
    if (parsed) return parsed;
  }
  const fromLabel = parseActivityEndYmd(festivalDateLabel);
  if (fromLabel) return fromLabel;
  return fallbackStart ?? null;
}

function addDaysYmd(ymd: string, days: number): string | null {
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export type PrefillInput = {
  eventId: number;
  festivalStartDate?: string;
  festivalEndDate?: string;
  /** Free-form activity.date fallback when structured dates missing. */
  festivalDateLabel?: string;
  preferences?: PlannerPreferences | null;
  favoriteArtists?: string[];
  displayName?: string;
};

/** Prefill Squad Profile from AI Plan preferences + lineup picks. */
export function buildPrefillSquadProfile(input: PrefillInput): Partial<FestivalSquadProfile> {
  const prefs = input.preferences;
  const origin = parseOrigin(prefs?.origin ?? '');
  const start = resolveFestivalStartYmd(input.festivalStartDate, input.festivalDateLabel);
  const end = resolveFestivalEndYmd(input.festivalEndDate, input.festivalDateLabel, start);
  const arrival = start ? addDaysYmd(start, -1) ?? start : '';
  const departure = end ?? '';

  return {
    eventId: input.eventId,
    displayName: input.displayName?.trim() || '',
    originCity: origin.city,
    originCountry: origin.country,
    arrivalDate: arrival,
    departureDate: departure,
    budgetLevel: prefs ? budgetFromTravelStyle(prefs.travelStyle) : 'comfort',
    accommodationType: prefs ? accommodationFromStay(prefs.stayPreference) : 'not_decided',
    accommodationStatus: prefs ? 'planning' : 'not_decided',
    lookingFor: prefs ? lookingForFromJourney(prefs.journeyType) : ['festival_buddy'],
    groupSize:
      prefs?.journeyType === 'solo'
        ? 1
        : prefs?.journeyType === 'couple'
          ? 2
          : prefs?.journeyType === 'friends'
            ? 3
            : prefs?.journeyType === 'tribe'
              ? 4
              : 1,
    favoriteArtists: input.favoriteArtists?.slice(0, 8) ?? [],
    favoriteGenres: [],
    visibility: DEFAULT_VISIBILITY,
  };
}

export function createSquadProfileFromDraft(
  eventId: number,
  draft: Partial<FestivalSquadProfile>,
  authUserId?: string | null,
): FestivalSquadProfile {
  const now = new Date().toISOString();
  const userId = resolveSquadOwnerUserId(authUserId ?? draft.userId);
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `profile-${Date.now()}`;

  const arrivalDate = isYmd(draft.arrivalDate) ? draft.arrivalDate.trim() : now.slice(0, 10);
  const departureDate = isYmd(draft.departureDate) ? draft.departureDate.trim() : arrivalDate;

  return {
    id,
    userId,
    eventId,
    displayName: draft.displayName?.trim() || 'Traveler',
    avatarUrl: draft.avatarUrl,
    originCity: draft.originCity?.trim() || '',
    originCountry: draft.originCountry,
    arrivalDate,
    departureDate,
    accommodationStatus: draft.accommodationStatus ?? 'not_decided',
    accommodationType: draft.accommodationType ?? 'not_decided',
    accommodationName: draft.accommodationName,
    budgetLevel: draft.budgetLevel ?? 'comfort',
    favoriteArtists: draft.favoriteArtists ?? [],
    favoriteGenres: draft.favoriteGenres ?? [],
    lookingFor: draft.lookingFor?.length ? draft.lookingFor : ['festival_buddy'],
    languages: draft.languages,
    groupSize: draft.groupSize ?? 1,
    firstTimeAttendee: draft.firstTimeAttendee,
    shortNote: draft.shortNote,
    visibility: draft.visibility ?? DEFAULT_VISIBILITY,
    roommatePreferences: draft.roommatePreferences,
    profileCompleteness: draft.profileCompleteness ?? 0.7,
    verified: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function readPlannerPreferences(eventId: number): PlannerPreferences | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(`raven-plan-preferences:${eventId}`);
    if (!raw) return null;
    return normalizePlannerPreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Narrow untrusted localStorage JSON into PlannerPreferences. */
export function normalizePlannerPreferences(raw: unknown): PlannerPreferences | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.origin !== 'string' || !o.origin.trim()) return null;
  if (!TRAVEL_STYLES.has(o.travelStyle as TravelStyle)) return null;
  if (!STAY_PREFERENCES.has(o.stayPreference as StayPreference)) return null;
  if (!JOURNEY_TYPES.has(o.journeyType as JourneyType)) return null;

  const priorities = Array.isArray(o.priorities)
    ? o.priorities.filter(
        (item): item is PersonalPriority =>
          typeof item === 'string' && PERSONAL_PRIORITIES.has(item as PersonalPriority),
      )
    : [];

  return {
    origin: o.origin.trim(),
    travelStyle: o.travelStyle as TravelStyle,
    stayPreference: o.stayPreference as StayPreference,
    journeyType: o.journeyType as JourneyType,
    priorities,
  };
}

export function readLineupArtistNames(
  eventId: number,
  nameById: Map<string, string> | Record<string, string>,
): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(lineupSelectionStorageKey(eventId));
    if (!raw) return [];
    const ids = JSON.parse(raw) as unknown;
    if (!Array.isArray(ids)) return [];
    const lookup =
      nameById instanceof Map ? nameById : new Map(Object.entries(nameById));
    const names: string[] = [];
    for (const id of ids) {
      if (typeof id !== 'string' || !id) continue;
      // Slot ids look like `${artistId}@${startMinutes}`
      const artistId = id.includes('@') ? id.slice(0, id.indexOf('@')) : id;
      const name = lookup.get(artistId) ?? lookup.get(id);
      if (name && !names.includes(name)) names.push(name);
    }
    return names;
  } catch {
    return [];
  }
}
