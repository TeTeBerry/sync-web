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

type Envelope<T> = { data?: T };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (method !== 'GET' && method !== 'HEAD') {
    headers['x-csrf-token'] = await ensureAuthCsrf();
  }
  const response = await fetch(`/api/festival-squad${path}`, {
    ...init,
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    headers,
  });
  const payload = (await response.json()) as T | Envelope<T>;
  if (!response.ok)
    throw new Error(
      (payload as { message?: string }).message ?? 'Festival Squad request failed.',
    );
  return (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as Envelope<T>).data !== undefined
      ? (payload as Envelope<T>).data
      : payload
  ) as T;
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

export async function getSquadProfile(
  eventId: number,
): Promise<FestivalSquadProfile | null> {
  const result = await request<ApiProfile | null>(`/events/${eventId}/profile/me`);
  return result ? profile(result) : null;
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
  const matches = await request<
    Array<
      Omit<SquadMatch, 'profile'> & {
        profile: ApiProfile;
      }
    >
  >(`/events/${eventId}/matches`);
  return matches.map((match) => ({
    ...match,
    profile: profile(match.profile),
    sharedGenres: match.sharedGenres ?? [],
    sharedArtists: match.sharedArtists ?? [],
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
  return request('/connection-request');
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
