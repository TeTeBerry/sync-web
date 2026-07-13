'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { ScheduleDj } from '../../lib/api';
import {
  buildFestivalDna,
  festivalDnaLead,
  type DnaIntensity,
  type DnaTraitId,
  type FestivalDnaTrait,
} from '../../lib/lineup-dna';
import { fetchFestivalDna } from '../../lib/lineup-discovery-api';
import { getLineupDiscoveryCopy, type Locale } from '../../lib/i18n';

type LineupDnaSceneProps = {
  locale: Locale;
  activityLegacyId: number;
  djs: ScheduleDj[];
};

const DNA_COLORS: Record<string, string> = {
  melodic: '#7c6cff',
  euphoric: '#4cc9f0',
  high_energy: '#ff4f7c',
  underground: '#94a3b8',
  hard: '#f97316',
  groovy: '#22c55e',
  emotional: '#c084fc',
  experimental: '#14b8a6',
  mainstage: '#fbbf24',
};

function intensityFromStrength(strength: number): DnaIntensity {
  if (strength >= 0.45) return 'dominant';
  if (strength >= 0.22) return 'strong';
  return 'soft';
}

/**
 * Festival DNA — musical identity of the festival, not the user.
 * Prefers backend DNA; falls back to local lineup derivation.
 */
export function LineupDnaScene({ locale, activityLegacyId, djs }: LineupDnaSceneProps) {
  const copy = getLineupDiscoveryCopy(locale).dna;
  const localTraits = useMemo(() => buildFestivalDna(djs, locale), [djs, locale]);
  const [traits, setTraits] = useState<FestivalDnaTrait[]>(localTraits);

  useEffect(() => {
    setTraits(localTraits);
    let cancelled = false;
    void (async () => {
      const remote = await fetchFestivalDna(activityLegacyId);
      if (cancelled || !remote?.dimensions?.length) return;
      const mapped: FestivalDnaTrait[] = remote.dimensions.map((dim) => ({
        id: dim.key as DnaTraitId,
        label: dim.label,
        intensity: intensityFromStrength(dim.strength),
        copy: dim.explanation,
        color: DNA_COLORS[dim.key] ?? '#7c6cff',
        weight: Math.round(dim.strength * 100),
      }));
      setTraits(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, [activityLegacyId, localTraits]);

  const lead = festivalDnaLead(traits, locale);

  return (
    <section className="lineup-scene lineup-dna" aria-labelledby="lineup-dna-heading" data-reveal>
      <div className="container">
        <header className="lineup-scene__header">
          <p className="lineup-scene__eyebrow">{copy.eyebrow}</p>
          <h2 id="lineup-dna-heading" className="lineup-scene__title">
            {copy.title}
          </h2>
          <p className="lineup-scene__lead">{lead}</p>
        </header>

        {traits.length ? (
          <div className="lineup-dna__field" aria-hidden="true">
            {traits.map((trait, index) => (
              <div
                key={trait.id}
                className={`lineup-dna__band lineup-dna__band--${trait.intensity}`}
                style={
                  {
                    '--dna-color': trait.color,
                    '--dna-delay': `${index * 0.12}s`,
                    '--dna-offset': `${8 + index * 14}%`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        ) : null}

        <ul className="lineup-dna__traits">
          {traits.map((trait) => (
            <li
              key={trait.id}
              className={`lineup-dna__trait lineup-dna__trait--${trait.intensity}`}
              style={{ '--dna-color': trait.color } as CSSProperties}
            >
              <span className="lineup-dna__trait-label">{trait.label}</span>
              <span className="lineup-dna__trait-copy">{trait.copy}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
