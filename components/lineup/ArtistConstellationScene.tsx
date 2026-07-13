"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type WheelEvent,
} from "react";
import {
  areRelatedGenres,
  constellationPosition,
  type ConstellationCategory,
} from "../../lib/lineup-constellation";
import type { DiscoveryArtist } from "../../lib/lineup-discovery";
import {
  getOrCreateAnonymousId,
  fetchConstellation,
  recordTasteSignal,
} from "../../lib/lineup-discovery-api";
import { trackLineupDiscovery } from "../../lib/lineup-analytics";
import { getLineupDiscoveryCopy, type Locale } from "../../lib/i18n";
import { getLineupClashCopy } from "../../lib/lineup-clash-copy";
import { conflictsInvolvingArtist } from "../../lib/lineup-clash";
import { useLineupDiscovery } from "./LineupDiscoveryContext";
import { useLineupSelection } from "./LineupSelectionContext";

type UniverseArtist = {
  id: string;
  name: string;
  genre: string;
  color: string;
  category: ConstellationCategory;
  reason: string;
};

type ServerConstellation = {
  nodes?: Array<{
    artistId: string;
    label?: string;
    primaryGenre?: string;
    category?: string;
    relevance?: number;
  }>;
};

function toUniverse(artists: DiscoveryArtist[]): UniverseArtist[] {
  return artists.map((artist) => ({
    id: artist.id,
    name: artist.name,
    genre: artist.genre,
    color: artist.color,
    category:
      artist.category === "picked"
        ? "perfect"
        : artist.category === "discovery"
          ? "adjacent"
          : "wildcard",
    reason: artist.editorial || artist.reasons[0] || artist.genre,
  }));
}

type ArtistConstellationSceneProps = {
  locale: Locale;
  activityLegacyId: number;
  weekend?: "w1" | "w2";
};

/**
 * YOU-centered musical universe — progressive, calm, discovery-driven.
 */
export function ArtistConstellationScene({
  locale,
  activityLegacyId,
  weekend,
}: ArtistConstellationSceneProps) {
  const copy = getLineupDiscoveryCopy(locale).constellation;
  const { bundle, mood } = useLineupDiscovery();
  const {
    isSelected,
    toggle,
    scheduleStatusFor,
    conflicts,
    openConflictCenter,
  } = useLineupSelection();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [entered, setEntered] = useState(false);
  const [serverNearbyIds, setServerNearbyIds] = useState<string[]>([]);
  const pointer = useRef<{ x: number; y: number } | null>(null);

  const artists = useMemo(() => {
    const list = toUniverse([
      ...bundle.picked,
      ...bundle.discoveries,
      ...(bundle.wildcard ? [bundle.wildcard] : []),
    ]);
    return list;
  }, [bundle]);

  useEffect(() => {
    trackLineupDiscovery("constellation_opened", {
      event: String(activityLegacyId),
      mood: mood ?? "none",
    });
    if (bundle.wildcard) {
      trackLineupDiscovery("wildcard_viewed", {
        event: String(activityLegacyId),
        artist: bundle.wildcard.id,
      });
      void recordTasteSignal({
        anonymousId: getOrCreateAnonymousId(),
        eventId: activityLegacyId,
        artistId: bundle.wildcard.id,
        signalType: "wildcard_opened",
      });
    }
    // Warm progressive constellation from backend (semantic graph; layout stays client).
    void fetchConstellation({
      eventId: activityLegacyId,
      weekend,
      mood,
      savedArtistIds: bundle.savedIds,
      anonymousId: getOrCreateAnonymousId(),
    });
  }, [activityLegacyId, mood, bundle.wildcard, bundle.savedIds]);

  useEffect(() => {
    if (!focusedId) {
      setServerNearbyIds([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const remote = (await fetchConstellation({
        eventId: activityLegacyId,
        weekend,
        mood,
        savedArtistIds: bundle.savedIds,
        anonymousId: getOrCreateAnonymousId(),
        focusArtistId: focusedId,
      })) as ServerConstellation | null;
      if (cancelled || !remote?.nodes?.length) return;
      setServerNearbyIds(
        remote.nodes
          .map((node) => node.artistId)
          .filter((id) => id && id !== focusedId)
          .slice(0, 6),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [focusedId, activityLegacyId, weekend, mood, bundle.savedIds]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setEntered(true),
      reducedMotion ? 0 : 80,
    );
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  const focused = artists.find((artist) => artist.id === focusedId) ?? null;
  const localNearby = focused
    ? artists
        .filter(
          (artist) =>
            artist.id !== focused.id &&
            (areRelatedGenres(artist.genre, focused.genre) ||
              artist.category === focused.category),
        )
        .slice(0, 4)
    : [];
  const nearby =
    focused && serverNearbyIds.length
      ? serverNearbyIds
          .map((id) => artists.find((artist) => artist.id === id))
          .filter((artist): artist is UniverseArtist => Boolean(artist))
          .slice(0, 4)
      : localNearby;

  const initial = artists
    .filter((artist) => artist.category === "perfect")
    .slice(0, 5);
  const visible = focused
    ? artists
        .filter(
          (artist) =>
            artist.id === focused.id ||
            nearby.some((related) => related.id === artist.id) ||
            artist.category === "perfect",
        )
        .slice(0, 12)
    : entered
      ? artists.slice(0, Math.min(artists.length, initial.length || 5))
      : initial.slice(0, 1);

  function reset() {
    setFocusedId(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    pointer.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointer.current) return;
    const deltaX = event.clientX - pointer.current.x;
    const deltaY = event.clientY - pointer.current.y;
    pointer.current = { x: event.clientX, y: event.clientY };
    setPan((value) => ({
      x: Math.max(-90, Math.min(90, value.x + deltaX)),
      y: Math.max(-70, Math.min(70, value.y + deltaY)),
    }));
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setZoom((value) =>
      Math.max(0.78, Math.min(1.55, value - event.deltaY * 0.0012)),
    );
  }

  function focusArtist(artist: UniverseArtist) {
    setFocusedId(artist.id);
    setZoom((value) => Math.max(value, 1.06));
    trackLineupDiscovery("constellation_artist_selected", {
      event: String(activityLegacyId),
      artist: artist.id,
    });
    trackLineupDiscovery("constellation_path_explored", {
      event: String(activityLegacyId),
      artist: artist.id,
      nearby: nearby.length,
    });
    void recordTasteSignal({
      anonymousId: getOrCreateAnonymousId(),
      eventId: activityLegacyId,
      artistId: artist.id,
      signalType: "constellation_artist_opened",
      mood: mood ?? undefined,
    });
  }

  return (
    <section
      className={`lineup-scene artist-universe${focused ? " artist-universe--focused" : ""}${reducedMotion ? " artist-universe--reduced" : ""}`}
      aria-labelledby="artist-constellation-heading"
      data-reveal
    >
      <div className="container artist-universe__shell">
        <header className="artist-universe__header">
          <h2
            id="artist-constellation-heading"
            className="artist-universe__title"
          >
            {copy.title}
          </h2>
          <p className="artist-universe__lead">{copy.lead}</p>
        </header>

        <div
          className="artist-universe__viewport"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => {
            pointer.current = null;
          }}
          onWheel={onWheel}
          onClick={reset}
        >
          <div className="artist-universe__fog" aria-hidden="true" />
          <div
            className="artist-universe__camera"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transitionDuration: reducedMotion ? "1ms" : "700ms",
            }}
          >
            {focused ? (
              <svg
                className="artist-universe__paths"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {nearby.map((artist, index) => {
                  const point = constellationPosition(index, artist.category);
                  return (
                    <path
                      key={artist.id}
                      d={`M50,50 Q${(50 + point.x) / 2},${Math.min(82, (50 + point.y) / 2 + 9)} ${point.x},${point.y}`}
                    />
                  );
                })}
              </svg>
            ) : null}

            <button
              type="button"
              className={`artist-universe__self${focused ? " is-muted" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                reset();
              }}
              aria-label={copy.you}
            >
              <span className="artist-universe__self-label" aria-hidden="true">
                {copy.you}
              </span>
            </button>

            {visible.map((artist, index) => {
              const point = focused
                ? artist.id === focused.id
                  ? { x: 50, y: 50 }
                  : constellationPosition(index, artist.category)
                : constellationPosition(index, artist.category);
              const selected = focused?.id === artist.id;
              const showName =
                selected || artist.category === "perfect" || zoom > 1.2;
              const dimmed =
                focused &&
                !selected &&
                !nearby.some((item) => item.id === artist.id);
              return (
                <button
                  key={artist.id}
                  type="button"
                  className={`artist-universe__artist artist-universe__artist--${artist.category}${selected ? " is-focused" : ""}${dimmed ? " is-dimmed" : ""}${isSelected(artist.id) ? " is-saved" : ""}`}
                  style={
                    {
                      "--node-x": `${point.x}%`,
                      "--node-y": `${point.y}%`,
                      "--node-color": artist.color,
                      "--drift-delay": `${(index % 5) * -1.7}s`,
                    } as CSSProperties
                  }
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    focusArtist(artist);
                  }}
                  aria-pressed={selected}
                  aria-label={`${artist.name}. ${artist.genre}. ${artist.reason}`}
                >
                  <span className="artist-universe__node" aria-hidden="true" />
                  {showName ? <small>{artist.name}</small> : null}
                </button>
              );
            })}
          </div>

          {!focused ? (
            <p className="artist-universe__invitation">{copy.invite}</p>
          ) : null}

          <div
            className={`artist-universe__controls${
              focused || zoom !== 1 || pan.x !== 0 || pan.y !== 0
                ? " is-active"
                : ""
            }`}
          >
            <button
              type="button"
              className="artist-universe__reset"
              onClick={reset}
            >
              {copy.reset}
            </button>
          </div>
        </div>

        {focused ? (
          <aside className="artist-universe__detail" aria-live="polite">
            <p className="artist-universe__detail-label">
              {copy.categoryLabels[focused.category]}
            </p>
            <h3>{focused.name}</h3>
            {focused.genre ? (
              <p className="artist-universe__detail-genre">{focused.genre}</p>
            ) : null}
            <p className="artist-universe__detail-reason">{focused.reason}</p>
            {(() => {
              const status = scheduleStatusFor(focused.id);
              if (status === "fits-route" || status === "not-selected")
                return null;
              const note = getLineupClashCopy(locale).status[status];
              if (!note) return null;
              return (
                <p className="artist-universe__route-note" data-status={status}>
                  {note}
                </p>
              );
            })()}
            {nearby.length ? (
              <p className="artist-universe__closest">
                {copy.closest} {nearby.map((artist) => artist.name).join(" · ")}
              </p>
            ) : null}
            <div className="artist-universe__detail-actions">
              <button
                type="button"
                className={`lineup-carry artist-universe__carry${
                  isSelected(focused.id) ? " is-saved" : ""
                }`}
                aria-pressed={isSelected(focused.id)}
                onClick={() => {
                  toggle(focused.id);
                  if (!isSelected(focused.id)) {
                    trackLineupDiscovery("ai_discovery_artist_saved", {
                      event: String(activityLegacyId),
                      artist: focused.id,
                      source: "constellation",
                    });
                  }
                }}
              >
                {isSelected(focused.id) ? copy.remove : copy.add}
              </button>
              {conflictsInvolvingArtist(conflicts, focused.id).length ? (
                <button
                  type="button"
                  className="artist-universe__resolve"
                  onClick={() => {
                    const first = conflictsInvolvingArtist(
                      conflicts,
                      focused.id,
                    )[0];
                    openConflictCenter(first?.id);
                  }}
                >
                  {getLineupClashCopy(locale).resolveInLineup}
                </button>
              ) : null}
            </div>
          </aside>
        ) : null}

        <details className="artist-universe__list">
          <summary>{copy.listFallback}</summary>
          <ul>
            {artists.map((artist) => (
              <li key={artist.id}>
                <button type="button" onClick={() => focusArtist(artist)}>
                  {artist.name}
                </button>
                <span>{artist.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
