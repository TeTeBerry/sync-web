'use client';

import type { LookingForIntent, SquadFilterState } from '../../lib/festival-squad';
import { lookingLabel, type SquadCopy } from './squad-labels';

type SquadFilterBarProps = {
  copy: SquadCopy;
  filters: SquadFilterState;
  onChange: (next: SquadFilterState) => void;
};

/** Soft intent question — three paths, not a filter catalog. */
export function SquadFilterBar({ copy, filters, onChange }: SquadFilterBarProps) {
  const intents: Array<LookingForIntent | 'any'> = ['any', 'festival_buddy', 'roommate'];

  return (
    <section className="squad-filters" aria-label={copy.filters.lookingFor}>
      <p className="squad-filters__eyebrow">{copy.filters.pathKicker}</p>
      <h3 className="squad-filters__question">{copy.filters.whisper}</h3>
      <div className="squad-intent-paths" role="list">
        {intents.map((value) => {
          const label = value === 'any' ? copy.filters.anyCompany : lookingLabel(value, copy);
          const active = filters.lookingFor === value;
          return (
            <button
              key={value}
              type="button"
              role="listitem"
              className={`squad-intent-path${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() =>
                onChange({
                  ...filters,
                  lookingFor: value,
                  origin: 'any',
                  arrival: 'any',
                  accommodation: 'any',
                  budget: 'any',
                  music: 'any',
                })
              }
            >
              <span>{label}</span>
              <span className="squad-intent-path__mark" aria-hidden>
                ↗
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
