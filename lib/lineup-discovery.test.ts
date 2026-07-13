import { describe, expect, it } from 'vitest';
import type { ScheduleDj } from './api';
import {
  buildDiscoveryBundle,
  discoveryLabelText,
  moodExplorationCopy,
} from './lineup-discovery';
import { buildFestivalDna } from './lineup-dna';

const roster: ScheduleDj[] = [
  { id: '1', name: 'Hardwell', genreLabel: 'Big Room', popularity: 90, genreColor: '#4cc9f0' },
  { id: '2', name: 'Maddix', genreLabel: 'Techno', popularity: 80, genreColor: '#a855f7' },
  { id: '3', name: 'Armin', genreLabel: 'Trance', popularity: 95, genreColor: '#22c55e' },
  { id: '4', name: 'Amelie Lens', genreLabel: 'Techno', popularity: 85, genreColor: '#a855f7' },
  { id: '5', name: 'Sub Zero Project', genreLabel: 'Hardstyle', popularity: 70, genreColor: '#f97316' },
  { id: '6', name: 'Fisher', genreLabel: 'Tech House', popularity: 75, genreColor: '#4cc9f0' },
];

describe('lineup discovery', () => {
  it('does not invent personalized counts without saved signals', () => {
    const bundle = buildDiscoveryBundle({
      djs: roster,
      activityLegacyId: 4,
      locale: 'en',
      mood: null,
      savedIds: [],
    });
    expect(bundle.hasSignals).toBe(false);
    expect(bundle.counts).toBeNull();
    expect(bundle.picked.length).toBeGreaterThan(0);
  });

  it('builds saved-artist recommendations without personality labels', () => {
    const bundle = buildDiscoveryBundle({
      djs: roster,
      activityLegacyId: 4,
      locale: 'en',
      mood: null,
      savedIds: ['1'],
    });
    expect(bundle.hasSignals).toBe(true);
    expect(bundle.counts).not.toBeNull();
    const blob = JSON.stringify(bundle).toLowerCase();
    expect(blob).not.toContain('personality');
    expect(blob).not.toContain('melodic explorer');
    expect(blob).not.toContain('hardstyle warrior');
    expect(bundle.picked.some((artist) => artist.id === '1')).toBe(false);
  });

  it('changes discovery emphasis with mood', () => {
    const dreamy = buildDiscoveryBundle({
      djs: roster,
      activityLegacyId: 4,
      locale: 'en',
      mood: 'dreamy',
      savedIds: ['6'],
    });
    const heavy = buildDiscoveryBundle({
      djs: roster,
      activityLegacyId: 4,
      locale: 'en',
      mood: 'heavy',
      savedIds: ['6'],
    });
    expect(moodExplorationCopy('heavy', 'en')).toContain('harder');
    const dreamyIds = dreamy.picked.map((artist) => artist.id).join(',');
    const heavyIds = heavy.picked.map((artist) => artist.id).join(',');
    expect(dreamyIds === heavyIds).toBe(false);
  });

  it('renders a defensible wildcard when possible', () => {
    const bundle = buildDiscoveryBundle({
      djs: roster,
      activityLegacyId: 4,
      locale: 'en',
      mood: null,
      savedIds: ['1', '6'],
    });
    expect(bundle.wildcard).not.toBeNull();
    expect(bundle.wildcard?.category).toBe('wildcard');
  });

  it('exposes only discovery labels', () => {
    expect(discoveryLabelText('picked', 'en')).toBe('Picked for You');
    expect(discoveryLabelText('wildcard', 'zh')).toBe('Raven 惊喜');
  });
});

describe('festival dna', () => {
  it('derives qualitative traits from lineup genres only', () => {
    const traits = buildFestivalDna(roster, 'en');
    expect(traits.length).toBeGreaterThan(0);
    expect(traits.every((trait) => ['soft', 'strong', 'dominant'].includes(trait.intensity))).toBe(
      true,
    );
    expect(JSON.stringify(traits).toLowerCase()).not.toContain('personality');
  });
});
