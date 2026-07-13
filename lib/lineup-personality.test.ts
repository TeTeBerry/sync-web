import { describe, expect, it } from 'vitest';
import {
  buildPersonalityTestHref,
  buildSpotlightReason,
  isFestivalAtmosphere,
  type LineupRecommendation,
} from './lineup-personality';

function recommendation(partial?: Partial<LineupRecommendation>): LineupRecommendation {
  return {
    djId: '1',
    djName: 'Artist',
    genreLabel: 'Techno',
    matchScore: 0.9,
    dimensionBreakdown: { E: 2, M: 8, S: 3, C: 1 },
    ...partial,
  };
}

describe('lineup-personality', () => {
  it('builds themed personality test hrefs', () => {
    expect(
      buildPersonalityTestHref({
        locale: 'en',
        returnTo: '/en/events/storm-4/lineup#lineup-identity-heading',
        atmosphere: 'electric',
        festival: 'STORM',
      }),
    ).toContain('atmosphere=electric');
  });

  it('accepts known atmospheres only', () => {
    expect(isFestivalAtmosphere('amber')).toBe(true);
    expect(isFestivalAtmosphere('neon-pink')).toBe(false);
  });

  it('prefers highlight for spotlight reasons', () => {
    expect(
      buildSpotlightReason(
        recommendation({ highlight: 'Keep this crest.' }),
        'en',
        'soul',
      ),
    ).toBe('Keep this crest.');
  });

  it('writes dimension-aware soul reasons', () => {
    expect(buildSpotlightReason(recommendation(), 'en', 'soul')).toContain('craft');
    expect(buildSpotlightReason(recommendation(), 'zh', 'soul')).toContain('Techno');
  });
});
