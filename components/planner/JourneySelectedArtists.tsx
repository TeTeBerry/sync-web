'use client';

import { useEffect, useState } from 'react';
import type { ScheduleDj, SchedulePerformance } from '../../lib/api';
import { getMessages, type Locale } from '../../lib/i18n';
import { readLineupSelection } from '../../lib/lineup-selection';
import { resolveSelectedArtistNames } from '../../lib/planner-selection';
import { TrackedLink } from '../TrackedLink';

type JourneySelectedArtistsProps = {
  locale: Locale;
  legacyId: number;
  lineupHref: string;
  djs: ScheduleDj[];
  performances: SchedulePerformance[];
};

export function JourneySelectedArtists({
  locale,
  legacyId,
  lineupHref,
  djs,
  performances,
}: JourneySelectedArtistsProps) {
  const copy = getMessages(locale).aiPlanner.journey.experience;
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  useEffect(() => {
    const syncSelection = () => {
      const selection = readLineupSelection(legacyId);
      setSelectedArtists(resolveSelectedArtistNames(selection, djs, performances));
    };
    syncSelection();
    window.addEventListener('storage', syncSelection);
    window.addEventListener('focus', syncSelection);
    return () => {
      window.removeEventListener('storage', syncSelection);
      window.removeEventListener('focus', syncSelection);
    };
  }, [djs, legacyId, performances]);

  return (
    <div className="plan-journey__picks">
      <h3 className="plan-journey__subhead">{copy.selectedArtists}</h3>
      {selectedArtists.length ? (
        <ul className="plan-journey__artist-list">
          {selectedArtists.map((artist) => (
            <li key={artist}>
              <span className="plan-journey__artist-name">{artist}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="plan-journey__empty">{copy.selectedEmpty}</p>
      )}
      <TrackedLink
        className="plan-journey__text-link"
        href={lineupHref}
        eventName="planner_lineup_link_click"
        eventProperties={{ event: String(legacyId), locale, source: 'journey-music' }}
      >
        {copy.editLineup}
      </TrackedLink>
    </div>
  );
}
