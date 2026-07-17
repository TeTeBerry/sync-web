import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd());

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('lineup personality UI removal', () => {
  it('removes personality-test CTAs from lineup experience and hero', () => {
    const experience = read('components/lineup/LineupExperience.tsx');
    const hero = read('components/lineup/LineupHeroScene.tsx');
    const page = read('app/[locale]/events/[slug]/lineup/page.tsx');
    for (const source of [experience, hero, page]) {
      expect(source).not.toMatch(/personality-test/i);
      expect(source).not.toMatch(/Take the Test/i);
      expect(source).not.toMatch(/useLineupPersonality/);
      expect(source).not.toMatch(/LineupIdentityScene/);
      expect(source).not.toMatch(/Music Profile/i);
      expect(source).not.toMatch(/Festival Personality/i);
    }
  });

  it('centers constellation copy on YOU without personality names', () => {
    const constellation = read('components/lineup/ArtistConstellationScene.tsx');
    expect(constellation).toContain('copy.you');
    expect(constellation).not.toMatch(/Music Profile/i);
    expect(constellation).not.toMatch(/Festival Personality/i);
    expect(constellation).not.toMatch(/personalityDisplayName|personality\.label/);
  });

});
