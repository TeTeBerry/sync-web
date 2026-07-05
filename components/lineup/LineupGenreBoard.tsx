'use client';

import type { ScheduleDj } from '../../lib/api';
import { SelectableArtistCard } from './SelectableArtistCard';

export type LineupGenreGroup = {
  genreLabel: string;
  color: string;
  djs: ScheduleDj[];
};

type LineupGenreBoardProps = {
  groups: LineupGenreGroup[];
};

export function LineupGenreBoard({ groups }: LineupGenreBoardProps) {
  return (
    <div className="lineup-genre-groups">
      {groups.map(({ genreLabel, color, djs }) => (
        <section className="lineup-section" key={genreLabel}>
          <div className="lineup-section__header">
            <h3 className="lineup-section__title">
              <span className="lineup-section__accent" style={{ background: color }} />
              {genreLabel}
            </h3>
            <span className="lineup-section__count">{djs.length}</span>
          </div>
          <div className="lineup-genre-grid">
            {djs.map((dj) => (
              <SelectableArtistCard
                key={dj.id}
                id={dj.id}
                name={dj.name}
                accent={color}
                stage={dj.stageLabel ?? dj.stage}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
