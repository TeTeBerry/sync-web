'use client';

import type { LookingForIntent } from '../../lib/festival-squad';
import type { SquadCopy } from './squad-labels';

type SquadSafetyNoticeProps = {
  copy: SquadCopy;
  lookingFor?: LookingForIntent[];
};

export function SquadSafetyNotice({ copy, lookingFor = [] }: SquadSafetyNoticeProps) {
  const roommate = lookingFor.includes('roommate');

  return (
    <section
      className={`squad-safety${roommate ? ' squad-safety--roommate' : ''}`}
      aria-labelledby="squad-safety-title"
    >
      <h2 id="squad-safety-title" className="squad-safety__title">
        {copy.safety.title}
      </h2>
      <p className="squad-safety__body">{copy.safety.body}</p>
      {roommate ? <p className="squad-safety__extra">{copy.safety.roommateHint}</p> : null}
    </section>
  );
}
