'use client';

import type { CSSProperties } from 'react';
import { useLineupSelection } from './LineupSelectionContext';

type SelectableArtistCardProps = {
  id: string;
  name: string;
  accent: string;
  stage?: string;
  genre?: string;
};

export function SelectableArtistCard({
  id,
  name,
  accent,
  stage,
  genre,
}: SelectableArtistCardProps) {
  const { isSelected, toggle } = useLineupSelection();
  const selected = isSelected(id);

  return (
    <button
      type="button"
      className={['artist-card', 'artist-card--selectable', selected ? 'artist-card--selected' : '']
        .filter(Boolean)
        .join(' ')}
      style={{ '--artist-accent': accent } as CSSProperties}
      aria-pressed={selected}
      onClick={() => toggle(id)}
    >
      <span className="artist-card__bar" aria-hidden="true" />
      <div className="artist-card__copy">
        <span className="artist-card__name">{name}</span>
        {genre ? <span className="artist-card__genre">{genre}</span> : null}
        {stage ? <span className="artist-card__stage">{stage}</span> : null}
      </div>
      {selected ? <span className="artist-card__mark" aria-hidden="true" /> : null}
    </button>
  );
}
