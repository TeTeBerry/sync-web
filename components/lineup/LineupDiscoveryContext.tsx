"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ScheduleDj } from "../../lib/api";
import {
  buildDiscoveryBundle,
  type DiscoveryBundle,
  type DiscoveryMood,
} from "../../lib/lineup-discovery";
import {
  fetchLineupDiscovery,
  getOrCreateAnonymousId,
  mapServerDiscoveryToBundle,
  recordTasteSignal,
} from "../../lib/lineup-discovery-api";
import type { Locale } from "../../lib/i18n";
import { trackLineupDiscovery } from "../../lib/lineup-analytics";
import { useLineupSelection } from "./LineupSelectionContext";

type LineupDiscoveryContextValue = {
  mood: DiscoveryMood | null;
  setMood: (mood: DiscoveryMood | null) => void;
  bundle: DiscoveryBundle;
  hydrated: boolean;
};

const LineupDiscoveryContext =
  createContext<LineupDiscoveryContextValue | null>(null);

export function LineupDiscoveryProvider({
  locale,
  activityLegacyId,
  weekend,
  djs,
  children,
}: {
  locale: Locale;
  activityLegacyId: number;
  weekend?: "w1" | "w2";
  djs: ScheduleDj[];
  children: ReactNode;
}) {
  const { ids, hydrated: selectionHydrated } = useLineupSelection();
  const [mood, setMoodState] = useState<DiscoveryMood | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [serverBundle, setServerBundle] = useState<DiscoveryBundle | null>(
    null,
  );

  useEffect(() => {
    if (!selectionHydrated) return;
    setSavedIds([
      ...new Set(
        ids.map((id) => (id.includes("@") ? id.slice(0, id.indexOf("@")) : id)),
      ),
    ]);
    setHydrated(true);
  }, [selectionHydrated, ids]);

  useEffect(() => {
    if (!hydrated) return;
    trackLineupDiscovery("lineup_discovery_viewed", {
      event: String(activityLegacyId),
      hasSignals: savedIds.length > 0,
    });
  }, [hydrated, activityLegacyId, savedIds.length]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const anonymousId = getOrCreateAnonymousId();
    void (async () => {
      const data = await fetchLineupDiscovery({
        eventId: activityLegacyId,
        weekend,
        mood,
        savedArtistIds: savedIds,
        anonymousId,
      });
      if (cancelled) return;
      if (data) {
        setServerBundle(mapServerDiscoveryToBundle(data, savedIds, locale));
      } else {
        setServerBundle(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, activityLegacyId, weekend, mood, savedIds, locale]);

  const localBundle = useMemo(
    () =>
      buildDiscoveryBundle({
        djs,
        activityLegacyId,
        locale,
        mood,
        savedIds,
      }),
    [djs, activityLegacyId, locale, mood, savedIds],
  );

  const bundle = serverBundle ?? localBundle;

  function setMood(next: DiscoveryMood | null) {
    setMoodState(next);
    if (next) {
      trackLineupDiscovery("mood_selected", {
        event: String(activityLegacyId),
        mood: next,
      });
      void recordTasteSignal({
        anonymousId: getOrCreateAnonymousId(),
        eventId: activityLegacyId,
        signalType: "mood_selected",
        mood: next,
      });
    }
  }

  return (
    <LineupDiscoveryContext.Provider
      value={{ mood, setMood, bundle, hydrated }}
    >
      {children}
    </LineupDiscoveryContext.Provider>
  );
}

export function useLineupDiscovery() {
  const value = useContext(LineupDiscoveryContext);
  if (!value) {
    throw new Error(
      "useLineupDiscovery must be used within LineupDiscoveryProvider",
    );
  }
  return value;
}
