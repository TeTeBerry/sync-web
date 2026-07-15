"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { ScheduleDj } from "../../lib/api";
import {
  DISCOVERY_MOODS,
  discoveryLabelText,
  moodExplorationCopy,
  type DiscoveryArtist,
  type DiscoveryMood,
} from "../../lib/lineup-discovery";
import {
  buildFestivalDna,
  festivalDnaLead,
  type DnaIntensity,
  type DnaTraitId,
  type FestivalDnaTrait,
} from "../../lib/lineup-dna";
import { fetchFestivalDna } from "../../lib/lineup-discovery-api";
import { trackLineupDiscovery } from "../../lib/lineup-analytics";
import { getLineupClashCopy } from "../../lib/lineup-clash-copy";
import { getLineupDiscoveryCopy, type Locale } from "../../lib/i18n";
import { useLineupDiscovery } from "./LineupDiscoveryContext";
import { useLineupSelection } from "./LineupSelectionContext";
import { moodConflictLead } from "./LineupScheduleBadge";

const DNA_COLORS: Record<string, string> = {
  melodic: "#7c6cff",
  euphoric: "#4cc9f0",
  high_energy: "#ff4f7c",
  underground: "#94a3b8",
  hard: "#f97316",
  groovy: "#22c55e",
  emotional: "#c084fc",
  experimental: "#14b8a6",
  mainstage: "#fbbf24",
};

const PRIMARY_MOODS: DiscoveryMood[] = [
  "euphoric",
  "dreamy",
  "heavy",
  "underground",
];

function intensityFromStrength(strength: number): DnaIntensity {
  if (strength >= 0.45) return "dominant";
  if (strength >= 0.22) return "strong";
  return "soft";
}

function ArtistSpotlight({
  artist,
  locale,
  activityLegacyId,
  featured,
}: {
  artist: DiscoveryArtist;
  locale: Locale;
  activityLegacyId: number;
  weekend?: "w1" | "w2";
  featured?: boolean;
}) {
  const { isSelected, toggle, scheduleStatusFor } = useLineupSelection();
  const selected = isSelected(artist.id);
  const copy = getLineupDiscoveryCopy(locale).ai;
  const clashCopy = getLineupClashCopy(locale);
  const status = scheduleStatusFor(artist.id);
  const routeNote =
    status === "fits-route" || status === "not-selected"
      ? null
      : clashCopy.status[status];

  return (
    <article
      className={`lineup-paths__spotlight${featured ? " lineup-paths__spotlight--featured" : ""}${selected ? " is-saved" : ""}`}
      style={{ "--artist-accent": artist.color } as CSSProperties}
    >
      <p className="lineup-paths__label">
        {discoveryLabelText(artist.label, locale)}
      </p>
      <h3 className="lineup-paths__name">{artist.name}</h3>
      {artist.genre ? (
        <p className="lineup-paths__genre">{artist.genre}</p>
      ) : null}
      {artist.editorial ? (
        <p className="lineup-paths__editorial">{artist.editorial}</p>
      ) : artist.reasons[0] ? (
        <p className="lineup-paths__editorial">{artist.reasons[0]}</p>
      ) : null}
      {routeNote ? (
        <p className="lineup-paths__route" data-status={status}>
          {routeNote}
        </p>
      ) : null}
      <div className="lineup-paths__actions">
        <button
          type="button"
          className={`lineup-carry lineup-paths__carry${selected ? " is-saved" : ""}`}
          aria-pressed={selected}
          onClick={() => {
            toggle(artist.id);
            if (!selected) {
              trackLineupDiscovery("ai_discovery_artist_saved", {
                event: String(activityLegacyId),
                artist: artist.id,
                category: artist.category,
              });
              trackLineupDiscovery("journey_updated_from_discovery", {
                event: String(activityLegacyId),
                artist: artist.id,
              });
            }
          }}
        >
          {selected ? copy.remove : copy.add}
        </button>
      </div>
      <span className="visually-hidden">
        {copy.cardAria.replace("{name}", artist.name)}
      </span>
    </article>
  );
}

type LineupAiDiscoverySceneProps = {
  locale: Locale;
  activityLegacyId: number;
  weekend?: "w1" | "w2";
  djs: ScheduleDj[];
  /** Discovery stays inside the timetable chapter when a schedule is available. */
  variant?: "standalone" | "journey";
};

/**
 * Paths into the night — DNA whisper + tonight’s doorway fused into one scene.
 * Mood is an entrance, not a peer chapter.
 */
export function LineupAiDiscoveryScene({
  locale,
  activityLegacyId,
  weekend,
  djs,
  variant = "standalone",
}: LineupAiDiscoverySceneProps) {
  const copy = getLineupDiscoveryCopy(locale);
  const paths = copy.ai;
  const moodCopy = copy.mood;
  const clashCopy = getLineupClashCopy(locale);
  const { bundle, hydrated, mood, setMood } = useLineupDiscovery();
  const { scheduleStatusFor, openConflictCenter, addArtist, conflicts } =
    useLineupSelection();
  const localTraits = useMemo(
    () => buildFestivalDna(djs, locale),
    [djs, locale],
  );
  const [traits, setTraits] = useState<FestivalDnaTrait[]>(localTraits);

  useEffect(() => {
    setTraits(localTraits);
    let cancelled = false;
    void (async () => {
      const remote = await fetchFestivalDna(activityLegacyId, weekend);
      if (cancelled || !remote?.dimensions?.length) return;
      const mapped: FestivalDnaTrait[] = remote.dimensions.map((dim) => ({
        id: dim.key as DnaTraitId,
        label: dim.label,
        intensity: intensityFromStrength(dim.strength),
        copy: dim.explanation,
        color: DNA_COLORS[dim.key] ?? "#7c6cff",
        weight: Math.round(dim.strength * 100),
      }));
      setTraits(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, [activityLegacyId, weekend, localTraits]);

  const dnaLead = festivalDnaLead(traits, locale);
  const dominant = traits.filter((t) => t.intensity !== "soft").slice(0, 3);
  const secondaryMoods = DISCOVERY_MOODS.filter(
    (item) => !PRIMARY_MOODS.includes(item),
  );

  const moodArtists = mood
    ? [
        ...bundle.picked,
        ...bundle.discoveries,
        ...(bundle.wildcard ? [bundle.wildcard] : []),
      ]
    : [];
  const conflicted = moodArtists
    .map((artist) => ({
      artist,
      status: scheduleStatusFor(artist.id),
    }))
    .filter(
      (item) =>
        item.status === "hard-clash" ||
        item.status === "partial-clash" ||
        item.status === "tight-transfer",
    )
    .slice(0, 1);
  const fittingNames = moodArtists
    .filter((artist) => {
      const status = scheduleStatusFor(artist.id);
      return status === "fits-route" || status === "schedule-pending";
    })
    .slice(0, 3)
    .map((artist) => artist.name);

  if (!hydrated) {
    if (variant === "journey") {
      return (
        <div className="lineup-paths lineup-paths--journey" aria-busy="true">
          <p className="lineup-scene__lead">{paths.loading}</p>
        </div>
      );
    }

    return (
      <section
        className="lineup-scene lineup-paths"
        aria-busy="true"
        data-reveal
      >
        <div className="container">
          <p className="lineup-scene__lead">{paths.loading}</p>
        </div>
      </section>
    );
  }

  const featured = bundle.picked[0] ?? bundle.discoveries[0] ?? bundle.wildcard;
  const restPicked = bundle.picked
    .filter((a) => a.id !== featured?.id)
    .slice(0, 2);
  const restDiscoveries = bundle.discoveries
    .filter((a) => a.id !== featured?.id)
    .slice(0, 2);
  const showWildcard =
    bundle.wildcard && bundle.wildcard.id !== featured?.id
      ? bundle.wildcard
      : null;
  const hasContent = Boolean(featured);

  const Wrapper = variant === "journey" ? "div" : "section";

  return (
    <Wrapper
      className={
        variant === "journey"
          ? "lineup-paths lineup-paths--journey"
          : "lineup-scene lineup-paths"
      }
      aria-labelledby={variant === "standalone" ? "lineup-paths-heading" : undefined}
      data-reveal={variant === "standalone" ? true : undefined}
    >
      <div className={variant === "standalone" ? "container" : undefined}>
        <header className="lineup-paths__header">
          {variant === "standalone" ? (
            <h2 id="lineup-paths-heading" className="lineup-paths__title">
              {paths.title}
            </h2>
          ) : (
            <p className="lineup-paths__kicker">{paths.title}</p>
          )}
          <p className="lineup-paths__lead">
            {bundle.hasSignals ? paths.leadSignals : paths.leadFresh}
          </p>
          {dnaLead ? <p className="lineup-paths__dna">{dnaLead}</p> : null}
          {dominant.length ? (
            <ul className="lineup-paths__currents" aria-label={paths.dnaAria}>
              {dominant.map((trait) => (
                <li
                  key={trait.id}
                  style={{ "--dna-color": trait.color } as CSSProperties}
                >
                  {trait.label}
                </li>
              ))}
            </ul>
          ) : null}
        </header>

        <div className="lineup-paths__doorway">
          <p className="lineup-paths__doorway-label">{moodCopy.title}</p>
          <div
            className="lineup-paths__doorway-words"
            role="group"
            aria-label={moodCopy.title}
          >
            {PRIMARY_MOODS.map((item) => (
              <button
                key={item}
                type="button"
                className={`lineup-paths__doorway-word${mood === item ? " is-active" : ""}`}
                aria-pressed={mood === item}
                onClick={() => setMood(mood === item ? null : item)}
              >
                {moodCopy.labels[item]}
              </button>
            ))}
          </div>
          <div
            className="lineup-paths__doorway-more"
            role="group"
            aria-label={moodCopy.moreAria}
          >
            {secondaryMoods.map((item) => (
              <button
                key={item}
                type="button"
                className={mood === item ? "is-active" : ""}
                aria-pressed={mood === item}
                onClick={() => setMood(mood === item ? null : item)}
              >
                {moodCopy.labels[item]}
              </button>
            ))}
          </div>
          {mood ? (
            <p className="lineup-paths__doorway-echo">
              {moodExplorationCopy(mood, locale)}
              {fittingNames.length
                ? ` ${moodCopy.echo} ${fittingNames.join(" · ")}`
                : ""}
            </p>
          ) : null}
          {conflicted.map(({ artist, status }) => {
            const rival = conflicts.find(
              (conflict) =>
                conflict.artistAId === artist.id ||
                conflict.artistBId === artist.id,
            );
            const rivalName =
              rival && rival.artistAId === artist.id
                ? rival.artistBName
                : rival?.artistAName;
            return (
              <p key={artist.id} className="lineup-paths__doorway-tension">
                <span>
                  {rivalName
                    ? moodConflictLead(locale, rivalName)
                    : clashCopy.status[status]}
                </span>
                <button
                  type="button"
                  className="lineup-paths__view"
                  onClick={() => openConflictCenter(rival?.id)}
                >
                  {clashCopy.reviewClash}
                </button>
                <button
                  type="button"
                  className="lineup-paths__view"
                  onClick={() => addArtist(artist.id, { name: artist.name })}
                >
                  {clashCopy.addAnyway}
                </button>
              </p>
            );
          })}
        </div>

        {!hasContent ? (
          <p className="lineup-scene__empty">{paths.empty}</p>
        ) : (
          <div className="lineup-paths__stage">
            {featured ? (
              <ArtistSpotlight
                artist={featured}
                locale={locale}
                activityLegacyId={activityLegacyId}
                featured
              />
            ) : null}

            {restPicked.length || restDiscoveries.length || showWildcard ? (
              <div className="lineup-paths__rail">
                {restPicked.map((artist) => (
                  <ArtistSpotlight
                    key={artist.id}
                    artist={artist}
                    locale={locale}
                    activityLegacyId={activityLegacyId}
                  />
                ))}
                {restDiscoveries.map((artist) => (
                  <ArtistSpotlight
                    key={artist.id}
                    artist={artist}
                    locale={locale}
                    activityLegacyId={activityLegacyId}
                  />
                ))}
                {showWildcard ? (
                  <ArtistSpotlight
                    artist={showWildcard}
                    locale={locale}
                    activityLegacyId={activityLegacyId}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
