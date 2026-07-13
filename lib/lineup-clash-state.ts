import type { ClashResolutionOptionType } from "./lineup-clash";

export type LineupClashResolutionRecord = {
  conflictId: string;
  optionType: ClashResolutionOptionType;
  keptArtistId?: string;
  deferredArtistId?: string;
  watchWindows?: Array<{
    artistId: string;
    watchFrom?: string;
    watchUntil?: string;
    missedMinutes?: number;
  }>;
  resolvedAt: string;
};

export type LineupClashState = {
  /** Artists kept in My Lineup but not forcing Today's Journey yet. */
  deferredArtistIds: string[];
  /** Artists explicitly prioritized for Today's Journey. */
  journeyArtistIds: string[];
  resolutions: LineupClashResolutionRecord[];
};

const PREFIX = "sync-lineup-clash-state";

export function lineupClashStateKey(
  activityLegacyId: number,
  scope?: string,
): string {
  return `${PREFIX}:${activityLegacyId}${scope ? `:${scope}` : ""}`;
}

export function emptyClashState(): LineupClashState {
  return {
    deferredArtistIds: [],
    journeyArtistIds: [],
    resolutions: [],
  };
}

export function readLineupClashState(
  activityLegacyId: number,
  scope?: string,
): LineupClashState {
  if (typeof window === "undefined") return emptyClashState();
  try {
    const raw = window.localStorage.getItem(
      lineupClashStateKey(activityLegacyId, scope),
    );
    if (!raw) return emptyClashState();
    const parsed = JSON.parse(raw) as Partial<LineupClashState>;
    return {
      deferredArtistIds: Array.isArray(parsed.deferredArtistIds)
        ? parsed.deferredArtistIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
      journeyArtistIds: Array.isArray(parsed.journeyArtistIds)
        ? parsed.journeyArtistIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
      resolutions: Array.isArray(parsed.resolutions)
        ? (parsed.resolutions as LineupClashResolutionRecord[])
        : [],
    };
  } catch {
    return emptyClashState();
  }
}

export function writeLineupClashState(
  activityLegacyId: number,
  state: LineupClashState,
  scope?: string,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      lineupClashStateKey(activityLegacyId, scope),
      JSON.stringify(state),
    );
  } catch {
    // ignore
  }
}

/**
 * Apply a resolution onto clash state without removing My Lineup membership.
 * Journey membership is updated; deferred list absorbs the tradeoff artist.
 */
export function applyClashResolution(
  state: LineupClashState,
  input: {
    conflictId: string;
    optionType: ClashResolutionOptionType;
    artistAId: string;
    artistBId: string;
    watchWindows?: LineupClashResolutionRecord["watchWindows"];
  },
): LineupClashState {
  const deferred = new Set(state.deferredArtistIds);
  const journey = new Set(state.journeyArtistIds);
  let keptArtistId: string | undefined;
  let deferredArtistId: string | undefined;

  if (input.optionType === "keep-artist-a") {
    keptArtistId = input.artistAId;
    deferredArtistId = input.artistBId;
    journey.add(input.artistAId);
    journey.delete(input.artistBId);
    deferred.add(input.artistBId);
    deferred.delete(input.artistAId);
  } else if (input.optionType === "keep-artist-b") {
    keptArtistId = input.artistBId;
    deferredArtistId = input.artistAId;
    journey.add(input.artistBId);
    journey.delete(input.artistAId);
    deferred.add(input.artistAId);
    deferred.delete(input.artistBId);
  } else if (input.optionType === "split-both") {
    journey.add(input.artistAId);
    journey.add(input.artistBId);
    deferred.delete(input.artistAId);
    deferred.delete(input.artistBId);
  } else {
    // decide-later — keep both in My Lineup, neither forces the route yet
    deferred.add(input.artistAId);
    if (input.artistAId !== input.artistBId) deferred.add(input.artistBId);
    journey.delete(input.artistAId);
    journey.delete(input.artistBId);
  }

  const resolutions = [
    ...state.resolutions.filter((item) => item.conflictId !== input.conflictId),
    {
      conflictId: input.conflictId,
      optionType: input.optionType,
      keptArtistId,
      deferredArtistId,
      watchWindows: input.watchWindows,
      resolvedAt: new Date().toISOString(),
    },
  ];

  return {
    deferredArtistIds: [...deferred],
    journeyArtistIds: [...journey],
    resolutions,
  };
}

/** When adding an artist with no clash, promote into journey automatically. */
export function ensureJourneyMembership(
  state: LineupClashState,
  artistId: string,
): LineupClashState {
  if (state.deferredArtistIds.includes(artistId)) return state;
  if (state.journeyArtistIds.includes(artistId)) return state;
  return {
    ...state,
    journeyArtistIds: [...state.journeyArtistIds, artistId],
  };
}

export function removeArtistFromClashState(
  state: LineupClashState,
  artistId: string,
): LineupClashState {
  return {
    deferredArtistIds: state.deferredArtistIds.filter((id) => id !== artistId),
    journeyArtistIds: state.journeyArtistIds.filter((id) => id !== artistId),
    resolutions: state.resolutions.filter(
      (item) =>
        item.keptArtistId !== artistId &&
        item.deferredArtistId !== artistId &&
        !(item.watchWindows ?? []).some(
          (window) => window.artistId === artistId,
        ),
    ),
  };
}
