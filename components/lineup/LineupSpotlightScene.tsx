'use client';

import type { CSSProperties } from 'react';
import type { FeaturedArtist } from '../../lib/lineup-preview';
import { SelectableArtistName } from './SelectableArtistName';

export type LineupSpotlightLabels = {
  eyebrow: string;
  title: string;
  lead: string;
};

type LineupSpotlightSceneProps = {
  artists: FeaturedArtist[];
  soundLine?: string;
  title?: string;
  lead?: string;
  labels: LineupSpotlightLabels;
};

function ArtistPresence({ name, accent }: { name: string; accent: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '·';
  return (
    <span
      className="lineup-spotlight__presence"
      style={{ '--artist-accent': accent } as CSSProperties}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

/**
 * Merged Insights + Featured — one Artist Spotlight scene.
 * Visual presence via monogram when no artist imagery exists in the data model.
 */
export function LineupSpotlightScene({
  artists,
  soundLine,
  title,
  lead,
  labels,
}: LineupSpotlightSceneProps) {
  if (!artists.length) return null;

  const [headliner, ...supporting] = artists;

  return (
    <section
      className="lineup-scene lineup-spotlight"
      aria-labelledby="lineup-spotlight-heading"
      data-reveal
      style={{ '--reveal-delay': '0.04s' } as CSSProperties}
    >
      <div className="container">
        <header className="lineup-scene__header">
          <p className="lineup-scene__eyebrow">{labels.eyebrow}</p>
          <h2 id="lineup-spotlight-heading" className="lineup-scene__title">
            {title ?? labels.title}
          </h2>
          <p className="lineup-scene__lead">{lead ?? labels.lead}</p>
          {soundLine ? <p className="lineup-spotlight__sound">{soundLine}</p> : null}
        </header>

        <div className="lineup-spotlight__stage">
          {headliner ? (
            <div
              className="lineup-spotlight__headliner"
              style={{ '--artist-accent': headliner.accent } as CSSProperties}
            >
              <div className="lineup-spotlight__headliner-row">
                <ArtistPresence name={headliner.name} accent={headliner.accent} />
                <div className="lineup-spotlight__headliner-copy">
                  <SelectableArtistName
                    id={headliner.id}
                    name={headliner.name}
                    accent={headliner.accent}
                    size="lead"
                  />
                  {headliner.reason ? (
                    <p className="lineup-spotlight__reason">{headliner.reason}</p>
                  ) : null}
                  <p className="lineup-spotlight__meta">
                    {[headliner.genre, headliner.stage].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {supporting.length ? (
            <ul className="lineup-spotlight__cast">
              {supporting.map((artist) => (
                <li
                  key={artist.id}
                  className="lineup-spotlight__artist"
                  style={{ '--artist-accent': artist.accent } as CSSProperties}
                >
                  <ArtistPresence name={artist.name} accent={artist.accent} />
                  <div className="lineup-spotlight__artist-copy">
                    <SelectableArtistName
                      id={artist.id}
                      name={artist.name}
                      accent={artist.accent}
                    />
                    {artist.reason ? (
                      <p className="lineup-spotlight__reason">{artist.reason}</p>
                    ) : (
                      <p className="lineup-spotlight__meta">
                        {[artist.genre, artist.stage].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
