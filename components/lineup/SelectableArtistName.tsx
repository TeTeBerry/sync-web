'use client';

import type { CSSProperties } from 'react';
import { useLineupSelection } from './LineupSelectionContext';

type SelectableArtistNameProps = {
  id: string;
  name: string;
  accent?: string;
  meta?: string;
  size?: 'lead' | 'default' | 'quiet';
};

/**
 * Editorial markable artist name — Artist Spotlight primitive.
 * Not a card. Not a database tile.
 */
export function SelectableArtistName({
  id,
  name,
  accent,
  meta,
  size = 'default',
}: SelectableArtistNameProps) {
  const { isSelected, toggle } = useLineupSelection();
  const selected = isSelected(id);

  return (
    <button
      type="button"
      className={[
        'lineup-name',
        `lineup-name--${size}`,
        selected ? 'is-selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={accent ? ({ '--artist-accent': accent } as CSSProperties) : undefined}
      aria-pressed={selected}
      onClick={() => toggle(id)}
    >
      <span className="lineup-name__label">{name}</span>
      {meta ? <span className="lineup-name__meta">{meta}</span> : null}
    </button>
  );
}
