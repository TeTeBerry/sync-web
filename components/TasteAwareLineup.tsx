'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FeaturedArtist } from '../lib/lineup-preview';
import { LINEUP_SELECTION_STORAGE_PREFIX, readLineupSelection } from '../lib/lineup-selection';
import { LineupPreview } from './event-detail/LineupPreview';

type LineupPreviewLabels = {
  title: string;
  lead: string;
  stages: string;
  exploreCta: string;
  artistCount: string;
  emptyTitle: string;
  emptyLead: string;
  awaitingTitle?: string;
  awaitingLead?: string;
};

type TasteAwareLineupProps = {
  activityLegacyId: number;
  artists: FeaturedArtist[];
  genres: string[];
  stageLabels: string[];
  artistCount: number;
  lineupHref: string;
  labels: LineupPreviewLabels;
  subscribeEventProperties: Record<string, string>;
  awaitingCopy?: string;
  locale: 'zh' | 'en';
};

function collectPickedArtistIds(activityLegacyId: number): Set<string> {
  const ids = new Set<string>();

  for (const raw of readLineupSelection(activityLegacyId)) {
    const artistId = raw.includes('@') ? raw.slice(0, raw.indexOf('@')) : raw;
    if (artistId) ids.add(artistId);
  }

  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(`${LINEUP_SELECTION_STORAGE_PREFIX}:`)) continue;
      if (key === `${LINEUP_SELECTION_STORAGE_PREFIX}:${activityLegacyId}`) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (typeof item !== 'string' || !item) continue;
        const artistId = item.includes('@') ? item.slice(0, item.indexOf('@')) : item;
        if (artistId) ids.add(artistId);
      }
    }
  } catch {
    // localStorage unavailable
  }

  return ids;
}

function tasteReason(locale: 'zh' | 'en', fromThisFestival: boolean): string {
  if (locale === 'zh') {
    return fromThisFestival ? '你标记过这个 Set——留在你的路线里。' : '你在其他场次追过这个名字——这场也值得守住。';
  }
  return fromThisFestival
    ? 'You marked this set — keep it on your route.'
    : 'You’ve chased this name before — protect it here too.';
}

export function TasteAwareLineup({
  activityLegacyId,
  artists,
  genres,
  stageLabels,
  artistCount,
  lineupHref,
  labels,
  subscribeEventProperties,
  awaitingCopy,
  locale,
}: TasteAwareLineupProps) {
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [thisFestivalPicks, setThisFestivalPicks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const local = new Set(
      readLineupSelection(activityLegacyId).map((raw) =>
        raw.includes('@') ? raw.slice(0, raw.indexOf('@')) : raw,
      ),
    );
    setThisFestivalPicks(local);
    setPickedIds(collectPickedArtistIds(activityLegacyId));
  }, [activityLegacyId]);

  const personalizedArtists = useMemo(() => {
    if (pickedIds.size === 0) {
      return artists.map((artist) => ({
        ...artist,
        reason: artist.reason,
      }));
    }

    const scored = artists.map((artist) => {
      const matched = pickedIds.has(artist.id);
      const fromThis = thisFestivalPicks.has(artist.id);
      return {
        artist: matched
          ? { ...artist, reason: tasteReason(locale, fromThis) }
          : artist,
        score: matched ? (fromThis ? 2 : 1) : 0,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map(({ artist }) => artist);
  }, [artists, locale, pickedIds, thisFestivalPicks]);

  return (
    <LineupPreview
      artists={personalizedArtists}
      genres={genres}
      stageLabels={stageLabels}
      artistCount={artistCount}
      lineupHref={lineupHref}
      labels={labels}
      subscribeEventProperties={subscribeEventProperties}
      awaitingCopy={awaitingCopy}
    />
  );
}
