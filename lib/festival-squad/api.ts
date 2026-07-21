import type {
  FestivalSquadProfile,
  FestivalSquadStats,
  LookingForIntent,
  ProfileVisibility,
  SquadConnectionRequest,
  SquadMatch,
} from './types';
import { DEFAULT_VISIBILITY } from './types';
import { ensureAuthCsrf } from '../auth/client';
import { unwrapApiEnvelope } from '../api';

type Envelope<T> = { data?: T; message?: string; code?: number };

type RequestOptions = RequestInit & {
  /** Force the BFF to mint a fresh Nest bearer (post-login recovery). */
  forceRemint?: boolean;
};

async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const { forceRemint, ...rest } = init ?? {};
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(rest.headers as Record<string, string> | undefined),
  };
  if (forceRemint) headers['x-raven-force-remint'] = '1';
  if (method !== 'GET' && method !== 'HEAD') {
    headers['x-csrf-token'] = await ensureAuthCsrf();
  }
  const response = await fetch(`/api/festival-squad${path}`, {
    ...rest,
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    headers,
  });
  const raw = (await response.json().catch(() => null)) as T | Envelope<T> | null;
  if (!response.ok) {
    const message =
      raw && typeof raw === 'object' && 'message' in raw && typeof raw.message === 'string'
        ? raw.message
        : `Festival Squad request failed (${response.status}).`;
    throw Object.assign(new Error(message), { status: response.status });
  }
  // JSON `null` is a valid Nest "no Squad profile" payload after BFF unwrap.
  if (raw === null) return null as T;
  return unwrapApiEnvelope(raw);
}

type ApiProfile = Omit<FestivalSquadProfile, 'visibility' | 'favoriteArtists'> & {
  favoriteArtistIds?: string[];
  favoriteArtists?: string[];
  visibility?: Partial<ProfileVisibility>;
  matchingPaused?: boolean;
};

function profile(raw: ApiProfile): FestivalSquadProfile {
  return {
    ...raw,
    favoriteArtists: raw.favoriteArtists ?? [],
    visibility: { ...DEFAULT_VISIBILITY, ...raw.visibility },
    matchingPaused: raw.matchingPaused === true,
  };
}

function isApiProfile(value: unknown): value is ApiProfile {
  return Boolean(
    value
      && typeof value === 'object'
      && typeof (value as ApiProfile).id === 'string'
      && (value as ApiProfile).id.trim().length > 0
      && Number.isFinite(Number((value as ApiProfile).eventId)),
  );
}

export async function getSquadProfile(
  eventId: number,
  options?: { forceRemint?: boolean },
): Promise<FestivalSquadProfile | null> {
  const result = await request<ApiProfile | null>(`/events/${eventId}/profile/me`, {
    forceRemint: options?.forceRemint,
  });
  if (!isApiProfile(result)) return null;
  return profile(result);
}

export async function saveSquadProfile(
  input: FestivalSquadProfile,
  favoriteArtistIds: string[],
  unresolvedLineupEntries: Array<{ lineupEntryId: string; status: 'unresolved' }> = [],
): Promise<FestivalSquadProfile> {
  return profile(
    await request<ApiProfile>(`/events/${input.eventId}/profile`, {
      method: 'POST',
      body: JSON.stringify({
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        originCity: input.originCity,
        originCountry: input.originCountry,
        arrivalDate: input.arrivalDate,
        departureDate: input.departureDate,
        accommodationStatus: input.accommodationStatus,
        accommodationType: input.accommodationType,
        accommodationName: input.accommodationName,
        budgetLevel: input.budgetLevel,
        favoriteArtistIds,
        favoriteArtists: input.favoriteArtists ?? [],
        unresolvedLineupEntries,
        favoriteGenres: input.favoriteGenres ?? [],
        lookingFor: input.lookingFor,
        languages: input.languages,
        groupSize: input.groupSize,
        firstTimeAttendee: input.firstTimeAttendee,
        shortNote: input.shortNote,
        visibility: input.visibility,
        matchingPaused: input.matchingPaused,
      }),
    }),
  );
}

export async function updateSquadProfileSettings(
  eventId: number,
  input: { visibility?: Partial<ProfileVisibility>; matchingPaused?: boolean },
): Promise<FestivalSquadProfile> {
  return profile(
    await request<ApiProfile>(`/events/${eventId}/profile/me/settings`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteSquadProfile(eventId: number): Promise<void> {
  await request(`/events/${eventId}/profile/me`, { method: 'DELETE' });
}

export async function getSquadMatches(eventId: number): Promise<SquadMatch[]> {
  const payload = await request<
    | Array<
        Omit<SquadMatch, 'profile'> & {
          profile: ApiProfile;
        }
      >
    | { matches?: unknown }
    | null
  >(`/events/${eventId}/matches`);

  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { matches?: unknown }).matches)
      ? ((payload as { matches: Array<Omit<SquadMatch, 'profile'> & { profile: ApiProfile }> }).matches)
      : [];

  return list
    .filter((match) => isApiProfile(match?.profile))
    .map((match) => ({
      ...match,
      profile: profile(match.profile),
      sharedGenres: match.sharedGenres ?? [],
      sharedArtists: match.sharedArtists ?? [],
      reasons: Array.isArray(match.reasons) ? match.reasons : [],
    }));
}

export async function getSquadStats(eventId: number): Promise<FestivalSquadStats> {
  return request(`/events/${eventId}/travelers`);
}

export async function createConnectionRequest(input: {
  receiverProfileId: string;
  eventId: number;
  intent: LookingForIntent;
  message: string;
}): Promise<SquadConnectionRequest> {
  return request('/connection-request', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getConnectionRequests(): Promise<{
  sent: SquadConnectionRequest[];
  received: SquadConnectionRequest[];
}> {
  const payload = await request<{
    sent?: SquadConnectionRequest[];
    received?: SquadConnectionRequest[];
  } | null>('/connection-request');
  return {
    sent: Array.isArray(payload?.sent) ? payload.sent : [],
    received: Array.isArray(payload?.received) ? payload.received : [],
  };
}

export async function respondToConnectionRequest(
  id: string,
  status: 'accepted' | 'declined' | 'cancelled',
): Promise<SquadConnectionRequest> {
  return request(`/connection-request/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
