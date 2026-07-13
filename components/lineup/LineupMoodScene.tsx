'use client';

import {
  DISCOVERY_MOODS,
  moodExplorationCopy,
  type DiscoveryMood,
} from '../../lib/lineup-discovery';
import { getLineupClashCopy } from '../../lib/lineup-clash-copy';
import { getLineupDiscoveryCopy, type Locale } from '../../lib/i18n';
import { trackLineupDiscovery } from '../../lib/lineup-analytics';
import { useLineupDiscovery } from './LineupDiscoveryContext';
import { useLineupSelection } from './LineupSelectionContext';
import { moodConflictLead } from './LineupScheduleBadge';

/** Primary doorways shown large; remaining moods stay quieter. */
const PRIMARY_MOODS: DiscoveryMood[] = [
  'euphoric',
  'dreamy',
  'heavy',
  'underground',
];

type LineupMoodSceneProps = {
  locale: Locale;
};

/**
 * Tonight’s doorway — atmospheric mood entrance, not a filter chip rail.
 */
export function LineupMoodScene({ locale }: LineupMoodSceneProps) {
  const copy = getLineupDiscoveryCopy(locale).mood;
  const clashCopy = getLineupClashCopy(locale);
  const { mood, setMood, bundle } = useLineupDiscovery();
  const { scheduleStatusFor, openConflictCenter, addArtist, conflicts } =
    useLineupSelection();

  function select(next: DiscoveryMood) {
    setMood(mood === next ? null : next);
  }

  const secondary = DISCOVERY_MOODS.filter(
    (item) => !PRIMARY_MOODS.includes(item),
  );

  const moodArtists = mood
    ? [
        ...bundle.picked,
        ...bundle.discoveries,
        ...(bundle.wildcard ? [bundle.wildcard] : []),
      ]
    : [];

  const conflicted = moodArtists
    .map((artist) => ({
      artist,
      status: scheduleStatusFor(artist.id),
    }))
    .filter(
      (item) =>
        item.status === 'hard-clash' ||
        item.status === 'partial-clash' ||
        item.status === 'tight-transfer',
    )
    .slice(0, 2);

  const alternative = moodArtists.find((artist) => {
    const status = scheduleStatusFor(artist.id);
    return status === 'fits-route' || status === 'schedule-pending';
  });

  const fittingNames = moodArtists
    .filter((artist) => {
      const status = scheduleStatusFor(artist.id);
      return status === 'fits-route' || status === 'schedule-pending';
    })
    .slice(0, 4)
    .map((artist) => artist.name);

  return (
    <section
      className={`lineup-scene lineup-doorway${mood ? ` lineup-doorway--${mood}` : ''}`}
      aria-labelledby="lineup-mood-heading"
      data-reveal
    >
      <div className="container">
        <header className="lineup-doorway__header">
          <p className="lineup-scene__eyebrow">{copy.eyebrow}</p>
          <h2 id="lineup-mood-heading" className="lineup-doorway__title">
            {copy.title}
          </h2>
          <p className="lineup-doorway__lead">
            {mood ? moodExplorationCopy(mood, locale) : copy.lead}
          </p>
        </header>

        <div className="lineup-doorway__words" role="group" aria-label={copy.title}>
          {PRIMARY_MOODS.map((item) => (
            <button
              key={item}
              type="button"
              className={`lineup-doorway__word${mood === item ? ' is-active' : ''}`}
              aria-pressed={mood === item}
              onClick={() => select(item)}
            >
              {copy.labels[item]}
            </button>
          ))}
        </div>

        <div className="lineup-doorway__more" role="group" aria-label={copy.moreAria}>
          {secondary.map((item) => (
            <button
              key={item}
              type="button"
              className={mood === item ? 'is-active' : ''}
              aria-pressed={mood === item}
              onClick={() => select(item)}
            >
              {copy.labels[item]}
            </button>
          ))}
        </div>

        {mood && fittingNames.length ? (
          <p className="lineup-doorway__echo">
            {copy.echo} {fittingNames.join(' · ')}
          </p>
        ) : null}

        {mood && conflicted.length ? (
          <ul className="lineup-doorway__tensions">
            {conflicted.map(({ artist, status }) => {
              const rival = conflicts.find(
                (conflict) =>
                  conflict.artistAId === artist.id ||
                  conflict.artistBId === artist.id,
              );
              const rivalName =
                rival && rival.artistAId === artist.id
                  ? rival.artistBName
                  : rival?.artistAName;
              return (
                <li key={artist.id} className="lineup-doorway__tension">
                  <div>
                    <p className="lineup-doorway__tension-name">{artist.name}</p>
                    <p className="lineup-doorway__tension-lead">
                      {rivalName
                        ? moodConflictLead(locale, rivalName)
                        : clashCopy.status[status]}
                    </p>
                  </div>
                  <div className="lineup-doorway__tension-actions">
                    <button
                      type="button"
                      className="lineup-doorway__text-action"
                      onClick={() => addArtist(artist.id, { name: artist.name })}
                    >
                      {clashCopy.addAnyway}
                    </button>
                    <button
                      type="button"
                      className="lineup-doorway__text-action"
                      onClick={() => openConflictCenter(rival?.id)}
                    >
                      {clashCopy.reviewClash}
                    </button>
                    {alternative && alternative.id !== artist.id ? (
                      <button
                        type="button"
                        className="lineup-doorway__text-action"
                        onClick={() => {
                          addArtist(alternative.id, { name: alternative.name });
                          trackLineupDiscovery(
                            'mood_alternative_selected_due_to_conflict',
                            {
                              event: artist.id,
                              alternative: alternative.id,
                            },
                          );
                        }}
                      >
                        {clashCopy.findAnother}: {alternative.name}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
