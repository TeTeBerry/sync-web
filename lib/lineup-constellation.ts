/**
 * Stable, explainable relationship rules for Lineup discovery. Kept outside
 * React so the graph can later be served by the recommendation API unchanged.
 */
export type ConstellationCategory = 'perfect' | 'adjacent' | 'wildcard' | 'neutral';

export type ConstellationArtistInput = {
  id: string;
  name: string;
  genre: string;
  color: string;
  category: ConstellationCategory;
  matchLabel?: string;
  reason?: string;
};

export type ConstellationEdge = {
  source: string;
  target: string;
  strength: number;
  relationship: 'saved-affinity' | 'genre-similarity' | 'adjacent-style';
  reasons: string[];
};

const RELATED_GENRES: Array<[RegExp, RegExp]> = [
  [/melodic/i, /progressive|trance|indie dance/i],
  [/progressive/i, /melodic|trance|big room/i],
  [/trance/i, /progressive|melodic|psy/i],
  [/tech house/i, /house|disco|garage/i],
  [/hard techno/i, /industrial|techno|hardstyle/i],
  [/dubstep|riddim/i, /bass|drum.{0,3}bass/i],
  [/drum.{0,3}bass/i, /bass|dubstep/i],
  [/deep house/i, /organic|house|melodic/i],
];

export function areRelatedGenres(a: string, b: string): boolean {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left === right || left.includes(right) || right.includes(left)) return true;
  return RELATED_GENRES.some(([first, second]) =>
    (first.test(left) && second.test(right)) || (first.test(right) && second.test(left)),
  );
}

/** Deterministic, sparse graph: only meaningful edges are emitted. */
export function buildConstellationEdges(artists: ConstellationArtistInput[]): ConstellationEdge[] {
  const edges: ConstellationEdge[] = [];
  const priority = artists.filter((artist) => artist.category !== 'neutral');
  for (let index = 0; index < priority.length; index += 1) {
    const artist = priority[index]!;
    edges.push({
      source: 'you',
      target: artist.id,
      strength: artist.category === 'perfect' ? .9 : artist.category === 'adjacent' ? .62 : .42,
      relationship: 'saved-affinity',
      reasons: [artist.reason ?? artist.genre],
    });
    for (const candidate of priority.slice(index + 1)) {
      if (!areRelatedGenres(artist.genre, candidate.genre)) continue;
      edges.push({
        source: artist.id,
        target: candidate.id,
        strength: artist.genre === candidate.genre ? .7 : .45,
        relationship: artist.genre === candidate.genre ? 'genre-similarity' : 'adjacent-style',
        reasons: artist.genre === candidate.genre ? [artist.genre] : [artist.genre, candidate.genre],
      });
    }
  }
  return edges;
}

/** A stable ring layout makes the constellation readable and reduced-motion safe. */
export function constellationPosition(index: number, category: ConstellationCategory) {
  const ring = category === 'perfect' ? 26 : category === 'adjacent' ? 39 : category === 'wildcard' ? 48 : 58;
  const seed = (index * 137.508 + (category === 'perfect' ? 11 : category === 'adjacent' ? 43 : 79)) % 360;
  const angle = (seed * Math.PI) / 180;
  return { x: 50 + Math.cos(angle) * ring, y: 50 + Math.sin(angle) * ring };
}
