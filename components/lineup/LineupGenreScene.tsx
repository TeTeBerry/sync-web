'use client';

import type { CSSProperties } from 'react';
import type { LineupGenreGroup } from './lineup-types';
import { SelectableArtistName } from './SelectableArtistName';

export type LineupGenreLabels = {
  eyebrow: string;
  title: string;
  lead: string;
};

type LineupGenreSceneProps = {
  groups: LineupGenreGroup[];
  labels: LineupGenreLabels;
  title?: string;
  lead?: string;
  /** One featured name per corridor — a door, not a taxonomy. */
  namesPerLane?: number;
  maxLanes?: number;
};

/**
 * Sound journey — one dominant corridor at a time, not equal-weight genre folders.
 */
export function LineupGenreScene({
  groups,
  labels,
  title,
  lead,
  namesPerLane = 3,
  maxLanes = 3,
}: LineupGenreSceneProps) {
  if (!groups.length) return null;

  const lanes = groups.slice(0, maxLanes);
  const [primary, ...rest] = lanes;

  return (
    <section
      className="lineup-scene lineup-genres"
      aria-labelledby="lineup-genres-heading"
      data-reveal
      style={{ '--reveal-delay': '0.06s' } as CSSProperties}
    >
      <div className="container">
        <header className="lineup-scene__header">
          <p className="lineup-scene__eyebrow">{labels.eyebrow}</p>
          <h2 id="lineup-genres-heading" className="lineup-scene__title">
            {title ?? labels.title}
          </h2>
          <p className="lineup-scene__lead">{lead ?? labels.lead}</p>
        </header>

        {primary ? (
          <article
            className="lineup-genres__primary"
            style={{ '--genre-accent': primary.color } as CSSProperties}
          >
            <p className="lineup-genres__primary-label">{primary.genreLabel}</p>
            <ul className="lineup-genres__primary-names">
              {primary.djs.slice(0, namesPerLane + 1).map((dj) => (
                <li key={dj.id}>
                  <SelectableArtistName
                    id={dj.id}
                    name={dj.name}
                    accent={primary.color}
                    size="default"
                  />
                </li>
              ))}
            </ul>
          </article>
        ) : null}

        {rest.length ? (
          <div className="lineup-genres__echoes">
            {rest.map(({ genreLabel, color, djs }) => (
              <article
                className="lineup-genres__echo"
                key={genreLabel}
                style={{ '--genre-accent': color } as CSSProperties}
              >
                <h3 className="lineup-genres__echo-title">{genreLabel}</h3>
                <ul className="lineup-genres__names">
                  {djs.slice(0, namesPerLane).map((dj) => (
                    <li key={dj.id}>
                      <SelectableArtistName
                        id={dj.id}
                        name={dj.name}
                        accent={color}
                        size="quiet"
                      />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
