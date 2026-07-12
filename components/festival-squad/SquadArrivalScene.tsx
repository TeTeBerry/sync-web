'use client';

import type { FestivalSquadProfile } from '../../lib/festival-squad';
import type { Locale } from '../../lib/i18n';
import { formatSquadDate, stayLabel, type SquadCopy } from './squad-labels';

type SquadArrivalSceneProps = {
  locale: Locale;
  travelers: FestivalSquadProfile[];
  copy: SquadCopy;
  onJoin: () => void;
};

export function SquadArrivalScene({ locale, travelers, copy, onJoin }: SquadArrivalSceneProps) {
  const whispers = travelers.slice(0, 3);

  return (
    <section className="squad-arrival" aria-labelledby="squad-arrival-title">
      <p className="squad-arrival__presence">{copy.arrival.presence}</p>
      <h2 id="squad-arrival-title" className="squad-arrival__title">
        {copy.arrival.title}
      </h2>
      <p className="squad-arrival__lead">{copy.arrival.lead}</p>

      {whispers.length ? (
        <div className="squad-arrival__trail">
          <div className="squad-arrival__trail-line" aria-hidden />
          <ul className="squad-arrival__whispers">
            {whispers.map((traveler) => (
              <li key={traveler.id} className="squad-arrival__whisper">
                <p className="squad-arrival__name">{traveler.displayName}</p>
                <p className="squad-arrival__path">
                  {[
                    copy.card.arriving.replace('{date}', formatSquadDate(traveler.arrivalDate, locale)),
                    copy.card.staying.replace('{place}', stayLabel(traveler, copy)),
                    traveler.favoriteArtists.slice(0, 2).join(' · '),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {traveler.shortNote ? (
                  <p className="squad-arrival__note">{traveler.shortNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="squad-arrival__empty">{copy.arrival.empty}</p>
      )}

      <button type="button" className="button" onClick={onJoin}>
        {copy.arrival.cta}
      </button>
    </section>
  );
}
