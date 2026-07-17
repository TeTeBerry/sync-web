"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SchedulePerformance } from "../../lib/api";
import {
  artistIdFromSelection,
  detectLineupConflicts,
  getArtistScheduleStatus,
  summarizeConflicts,
  toClashPerformances,
  type ArtistScheduleStatus,
  type ClashPerformance,
  type ClashResolutionOption,
  type LineupConflict,
} from "../../lib/lineup-clash";
import {
  applyClashResolution,
  ensureJourneyMembership,
  emptyClashState,
  readLineupClashState,
  removeArtistFromClashState,
  writeLineupClashState,
  type LineupClashState,
} from "../../lib/lineup-clash-state";
import {
  readLineupSelection,
  writeLineupSelection,
  pruneOffBillLineupSelection,
} from "../../lib/lineup-selection";
import {
  getOrCreateAnonymousId,
  recordTasteSignal,
} from "../../lib/lineup-discovery-api";
import { trackLineupDiscovery } from "../../lib/lineup-analytics";

export type ClashToastState = {
  artistId: string;
  artistName?: string;
  newConflictCount: number;
  conflictIds: string[];
} | null;

type LineupSelectionContextValue = {
  hydrated: boolean;
  count: number;
  ids: string[];
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Add with clash evaluation; returns new conflicts involving this artist. */
  addArtist: (id: string, meta?: { name?: string }) => LineupConflict[];
  removeArtist: (id: string) => void;
  clear: () => void;
  conflicts: LineupConflict[];
  conflictSummary: ReturnType<typeof summarizeConflicts>;
  clashState: LineupClashState;
  journeyArtistIds: string[];
  deferredArtistIds: string[];
  scheduleStatusFor: (artistId: string) => ArtistScheduleStatus;
  slotForArtist: (artistId: string) => ClashPerformance | undefined;
  toast: ClashToastState;
  dismissToast: () => void;
  keepToastForLater: () => void;
  openConflictCenter: (focusConflictId?: string) => void;
  closeConflictCenter: () => void;
  conflictCenterOpen: boolean;
  focusConflictId: string | null;
  resolveConflict: (
    conflict: LineupConflict,
    option: ClashResolutionOption,
  ) => void;
  restoreSavedRoute: (input: {
    selectedIds: string[];
    clashState: LineupClashState;
  }) => void;
  performancesReady: boolean;
};

const LineupSelectionContext =
  createContext<LineupSelectionContextValue | null>(null);

export function LineupSelectionProvider({
  activityLegacyId,
  performances,
  schedulePublished,
  selectionScope,
  children,
}: {
  activityLegacyId: number;
  performances: SchedulePerformance[];
  schedulePublished: boolean;
  selectionScope?: string;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [clashState, setClashState] =
    useState<LineupClashState>(emptyClashState);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<ClashToastState>(null);
  const [conflictCenterOpen, setConflictCenterOpen] = useState(false);
  const [focusConflictId, setFocusConflictId] = useState<string | null>(null);

  const clashPerformances = useMemo(
    () => toClashPerformances(performances),
    [performances],
  );

  useEffect(() => {
    setSelected(new Set(readLineupSelection(activityLegacyId, selectionScope)));
    setClashState(readLineupClashState(activityLegacyId, selectionScope));
    setHydrated(true);
  }, [activityLegacyId, selectionScope]);

  const persistSelection = useCallback(
    (next: Set<string>) => {
      writeLineupSelection(activityLegacyId, [...next], selectionScope);
    },
    [activityLegacyId, selectionScope],
  );

  const persistClash = useCallback(
    (next: LineupClashState) => {
      writeLineupClashState(activityLegacyId, next, selectionScope);
      setClashState(next);
    },
    [activityLegacyId, selectionScope],
  );

  // TML Belgium: drop cancelled acts (e.g. Dimitri Vegas & Like Mike) from saved picks
  // once the official timetable is live — they must not sit in "Waiting on set time".
  useEffect(() => {
    if (!hydrated || !schedulePublished || performances.length === 0) return;

    const { kept, removed } = pruneOffBillLineupSelection({
      activityLegacyId,
      selectedIds: [...selected],
      performanceArtistIds: performances.map((row) => row.artistId),
      schedulePublished,
    });
    if (!removed.length) return;

    const next = new Set(kept);
    setSelected(next);
    persistSelection(next);

    let nextClash = clashState;
    for (const id of removed) {
      nextClash = removeArtistFromClashState(
        nextClash,
        artistIdFromSelection(id),
      );
    }
    persistClash(nextClash);
  }, [
    hydrated,
    schedulePublished,
    performances,
    activityLegacyId,
    selected,
    clashState,
    persistSelection,
    persistClash,
  ]);

  const ids = useMemo(() => [...selected], [selected]);

  const conflicts = useMemo(() => {
    if (!hydrated) return [];
    return detectLineupConflicts({
      selectedArtistIds: ids,
      performances: clashPerformances,
      schedulePublished,
      deferredArtistIds: clashState.deferredArtistIds,
      journeyArtistIds: clashState.journeyArtistIds,
    });
  }, [
    hydrated,
    ids,
    clashPerformances,
    schedulePublished,
    clashState.deferredArtistIds,
    clashState.journeyArtistIds,
  ]);

  const conflictSummary = useMemo(
    () => summarizeConflicts(conflicts),
    [conflicts],
  );

  const scheduleStatusFor = useCallback(
    (artistId: string): ArtistScheduleStatus =>
      getArtistScheduleStatus({
        artistId,
        selectedArtistIds: ids,
        performances: clashPerformances,
        schedulePublished,
        deferredArtistIds: clashState.deferredArtistIds,
        journeyArtistIds: clashState.journeyArtistIds,
      }),
    [
      ids,
      clashPerformances,
      schedulePublished,
      clashState.deferredArtistIds,
      clashState.journeyArtistIds,
    ],
  );

  const slotForArtist = useCallback(
    (artistId: string): ClashPerformance | undefined => {
      const id = artistIdFromSelection(artistId);
      const slots = clashPerformances
        .filter((slot) => slot.artistId === id)
        .sort((a, b) => a.startMinutes - b.startMinutes);
      return slots[0];
    },
    [clashPerformances],
  );

  const removeArtist = useCallback(
    (id: string) => {
      const artistId = artistIdFromSelection(id);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const item of [...next]) {
          if (artistIdFromSelection(item) === artistId || item === id) {
            next.delete(item);
          }
        }
        persistSelection(next);
        return next;
      });
      persistClash(removeArtistFromClashState(clashState, artistId));
      void recordTasteSignal({
        anonymousId: getOrCreateAnonymousId(),
        eventId: activityLegacyId,
        artistId,
        signalType: "artist_removed_from_lineup",
      });
      trackLineupDiscovery("lineup_artist_removed", {
        event: String(activityLegacyId),
        artist: artistId,
      });
    },
    [activityLegacyId, clashState, persistClash, persistSelection],
  );

  const addArtist = useCallback(
    (id: string, meta?: { name?: string }) => {
      const artistId = artistIdFromSelection(id);
      const beforeIds = [...selected];
      const next = new Set(selected);
      next.add(id);
      setSelected(next);
      persistSelection(next);

      let nextClash = ensureJourneyMembership(clashState, artistId);
      persistClash(nextClash);

      void recordTasteSignal({
        anonymousId: getOrCreateAnonymousId(),
        eventId: activityLegacyId,
        artistId,
        signalType: "artist_added_to_lineup",
      });
      trackLineupDiscovery("lineup_artist_added", {
        event: String(activityLegacyId),
        artist: artistId,
      });

      const beforeConflicts = detectLineupConflicts({
        selectedArtistIds: beforeIds,
        performances: clashPerformances,
        schedulePublished,
        deferredArtistIds: nextClash.deferredArtistIds,
        journeyArtistIds: nextClash.journeyArtistIds,
      });
      const afterConflicts = detectLineupConflicts({
        selectedArtistIds: [...next],
        performances: clashPerformances,
        schedulePublished,
        deferredArtistIds: nextClash.deferredArtistIds,
        journeyArtistIds: nextClash.journeyArtistIds,
      });
      const beforeIdsSet = new Set(beforeConflicts.map((c) => c.id));
      const newly = afterConflicts.filter(
        (conflict) =>
          !beforeIdsSet.has(conflict.id) &&
          (conflict.artistAId === artistId || conflict.artistBId === artistId),
      );

      if (newly.length) {
        trackLineupDiscovery("lineup_conflict_detected", {
          event: String(activityLegacyId),
          artist: artistId,
          count: newly.length,
          types: newly.map((c) => c.type).join(","),
        });
        for (const conflict of newly) {
          if (conflict.type === "tight-transfer") {
            trackLineupDiscovery("lineup_tight_transfer_detected", {
              event: String(activityLegacyId),
              conflict: conflict.id,
            });
          }
          if (conflict.type === "schedule-pending") {
            trackLineupDiscovery("lineup_schedule_pending_saved", {
              event: String(activityLegacyId),
              artist: artistId,
            });
          }
        }
        setToast({
          artistId,
          artistName: meta?.name,
          newConflictCount: newly.length,
          conflictIds: newly.map((c) => c.id),
        });
      } else {
        setToast({
          artistId,
          artistName: meta?.name,
          newConflictCount: 0,
          conflictIds: [],
        });
      }

      return newly;
    },
    [
      activityLegacyId,
      clashPerformances,
      clashState,
      persistClash,
      persistSelection,
      schedulePublished,
      selected,
    ],
  );

  const toggle = useCallback(
    (id: string) => {
      const artistId = artistIdFromSelection(id);
      const currentlySelected = [...selected].some(
        (item) => item === id || artistIdFromSelection(item) === artistId,
      );
      if (currentlySelected) {
        removeArtist(id);
        setToast(null);
        return;
      }
      addArtist(id);
    },
    [addArtist, removeArtist, selected],
  );

  const clear = useCallback(() => {
    const next = new Set<string>();
    setSelected(next);
    persistSelection(next);
    persistClash(emptyClashState());
    setToast(null);
  }, [persistClash, persistSelection]);

  const resolveConflict = useCallback(
    (conflict: LineupConflict, option: ClashResolutionOption) => {
      const next = applyClashResolution(clashState, {
        conflictId: conflict.id,
        optionType: option.type,
        artistAId: conflict.artistAId,
        artistBId: conflict.artistBId,
        watchWindows: option.itineraryImpact,
      });
      persistClash(next);
      trackLineupDiscovery("lineup_conflict_resolved", {
        event: String(activityLegacyId),
        conflict: conflict.id,
        option: option.type,
      });
      if (option.type === "decide-later") {
        trackLineupDiscovery("lineup_conflict_deferred", {
          event: String(activityLegacyId),
          conflict: conflict.id,
        });
      }
      if (option.type === "split-both") {
        trackLineupDiscovery("lineup_split_route_selected", {
          event: String(activityLegacyId),
          conflict: conflict.id,
        });
      }
      trackLineupDiscovery("journey_recalculated_after_conflict", {
        event: String(activityLegacyId),
        journeyCount: next.journeyArtistIds.length,
      });
      setToast(null);
    },
    [activityLegacyId, clashState, persistClash],
  );

  const restoreSavedRoute = useCallback(
    (input: { selectedIds: string[]; clashState: LineupClashState }) => {
      const next = new Set(input.selectedIds);
      setSelected(next);
      persistSelection(next);
      persistClash(input.clashState);
      setToast(null);
    },
    [persistClash, persistSelection],
  );

  const openConflictCenter = useCallback(
    (conflictId?: string) => {
      setFocusConflictId(conflictId ?? null);
      setConflictCenterOpen(true);
      trackLineupDiscovery("lineup_conflict_reviewed", {
        event: String(activityLegacyId),
        conflict: conflictId ?? "all",
      });
    },
    [activityLegacyId],
  );

  const closeConflictCenter = useCallback(() => {
    setConflictCenterOpen(false);
    setFocusConflictId(null);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const keepToastForLater = useCallback(() => {
    if (!toast) return;
    const related = conflicts.filter((c) => toast.conflictIds.includes(c.id));
    let next = clashState;
    for (const conflict of related) {
      const option =
        conflict.resolutionOptions.find((o) => o.type === "decide-later") ??
        conflict.resolutionOptions[0];
      if (!option) continue;
      next = applyClashResolution(next, {
        conflictId: conflict.id,
        optionType: option.type,
        artistAId: conflict.artistAId,
        artistBId: conflict.artistBId,
      });
      trackLineupDiscovery("lineup_conflict_deferred", {
        event: String(activityLegacyId),
        conflict: conflict.id,
      });
    }
    persistClash(next);
    setToast(null);
  }, [activityLegacyId, clashState, conflicts, persistClash, toast]);

  const value = useMemo<LineupSelectionContextValue>(
    () => ({
      hydrated,
      count: selected.size,
      ids,
      isSelected: (id: string) => {
        const artistId = artistIdFromSelection(id);
        return [...selected].some(
          (item) => item === id || artistIdFromSelection(item) === artistId,
        );
      },
      toggle,
      addArtist,
      removeArtist,
      clear,
      conflicts,
      conflictSummary,
      clashState,
      journeyArtistIds: clashState.journeyArtistIds,
      deferredArtistIds: clashState.deferredArtistIds,
      scheduleStatusFor,
      slotForArtist,
      toast,
      dismissToast,
      keepToastForLater,
      openConflictCenter,
      closeConflictCenter,
      conflictCenterOpen,
      focusConflictId,
      resolveConflict,
      restoreSavedRoute,
      performancesReady: clashPerformances.length > 0 || !schedulePublished,
    }),
    [
      hydrated,
      selected,
      ids,
      toggle,
      addArtist,
      removeArtist,
      clear,
      conflicts,
      conflictSummary,
      clashState,
      scheduleStatusFor,
      slotForArtist,
      toast,
      dismissToast,
      keepToastForLater,
      openConflictCenter,
      closeConflictCenter,
      conflictCenterOpen,
      focusConflictId,
      resolveConflict,
      restoreSavedRoute,
      clashPerformances.length,
      schedulePublished,
    ],
  );

  return (
    <LineupSelectionContext.Provider value={value}>
      {children}
    </LineupSelectionContext.Provider>
  );
}

export function useLineupSelection(): LineupSelectionContextValue {
  const context = useContext(LineupSelectionContext);
  if (!context) {
    throw new Error(
      "useLineupSelection must be used within LineupSelectionProvider",
    );
  }
  return context;
}
