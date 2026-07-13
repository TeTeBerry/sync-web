import { describe, expect, it } from 'vitest';
import { areRelatedGenres, buildConstellationEdges, constellationPosition } from './lineup-constellation';

describe('lineup constellation rules', () => {
  it('keeps the related-genre bridge explicit', () => {
    expect(areRelatedGenres('Melodic Techno', 'Progressive House')).toBe(true);
    expect(areRelatedGenres('Dubstep', 'Bass Music')).toBe(true);
    expect(areRelatedGenres('House', 'Hard Techno')).toBe(false);
  });

  it('builds a sparse, stable relationship graph', () => {
    const artists = [
      { id: 'a', name: 'A', genre: 'Melodic Techno', color: '#fff', category: 'perfect' as const },
      { id: 'b', name: 'B', genre: 'Progressive House', color: '#fff', category: 'adjacent' as const },
    ];
    expect(buildConstellationEdges(artists)).toEqual(buildConstellationEdges(artists));
    expect(buildConstellationEdges(artists)).toHaveLength(3);
    expect(constellationPosition(2, 'adjacent')).toEqual(constellationPosition(2, 'adjacent'));
  });
});
