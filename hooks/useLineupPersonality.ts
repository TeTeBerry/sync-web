'use client';

import { useEffect, useState } from 'react';
import {
  fetchLineupPersonalityMatch,
  type LineupPersonalityResponse,
} from '../lib/lineup-personality';
import { useAuthSession } from './useAuthSession';

type CacheEntry = {
  promise: Promise<LineupPersonalityResponse | null>;
  value?: LineupPersonalityResponse | null;
};

const matchCache = new Map<string, CacheEntry>();

function loadPersonality(activityLegacyId: number, signedIn: boolean) {
  const key = `${activityLegacyId}:${signedIn ? 'auth' : 'anon'}`;
  const existing = matchCache.get(key);
  if (existing) return existing.promise;

  const promise = fetchLineupPersonalityMatch(activityLegacyId, signedIn).then((value) => {
    const entry = matchCache.get(key);
    if (entry) entry.value = value;
    return value;
  });
  matchCache.set(key, { promise });
  return promise;
}

/**
 * Unified personality state for hero + experience.
 * Session result wins; signed-in lineup-match is the fallback.
 * Shared in-flight cache keeps hero and body on one request.
 */
export function useLineupPersonality(activityLegacyId: number) {
  const auth = useAuthSession();
  const [personality, setPersonality] = useState<LineupPersonalityResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.loading) return;

    let cancelled = false;
    setLoading(true);

    loadPersonality(activityLegacyId, auth.signedIn)
      .then((next) => {
        if (!cancelled) setPersonality(next);
      })
      .catch(() => {
        if (!cancelled) setPersonality(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activityLegacyId, auth.loading, auth.signedIn]);

  return {
    personality,
    loading: auth.loading || loading,
    hasMatch: personality?.available === true,
    unavailableReason:
      personality && !personality.available ? personality.reason : null,
  };
}
