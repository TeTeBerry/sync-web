import type { CSSProperties } from 'react';
import type { LineupTimetableDay } from '../lib/lineup-timetable';
import { formatLineupTimeRange } from '../lib/lineup-timetable';
import { MISSING_GENRE_LABEL } from '../lib/lineup-genre';

type LineupTimetableLabels = {
  time: string;
  artist: string;
  genre: string;
};

type LineupTimetableProps = {
  days: LineupTimetableDay[];
  labels: LineupTimetableLabels;
};

const STAGE_ACCENTS = [
  'var(--primary)',
  'var(--secondary)',
  'var(--cyan-400)',
  '#f97316',
  '#22c55e',
  '#ec4899',
];

function stageAccent(index: number): string {
  return STAGE_ACCENTS[index % STAGE_ACCENTS.length] ?? 'var(--primary)';
}

export function LineupTimetable({ days, labels }: LineupTimetableProps) {
  return (
    <div className="lineup-timetable">
      {days.map((day) => (
        <section className="lineup-timetable__day" key={day.dateKey} aria-label={day.label}>
          <header className="lineup-timetable__day-header">
            <span className="lineup-timetable__day-accent" aria-hidden="true" />
            <div className="lineup-timetable__day-copy">
              <p className="lineup-timetable__day-eyebrow">{day.label}</p>
              <h3 className="lineup-timetable__day-title">{day.bannerDateLabel || day.label}</h3>
            </div>
          </header>

          <div className="lineup-timetable__stages">
            {day.stages.map((stage, stageIndex) => {
              const accent = stage.slots[0]?.genreColor ?? stageAccent(stageIndex);

              return (
                <article
                  className="lineup-timetable__stage"
                  key={`${day.dateKey}-${stage.stageKey}`}
                  style={{ '--stage-accent': accent } as CSSProperties}
                >
                  <header className="lineup-timetable__stage-header">
                    <span className="lineup-timetable__stage-accent" aria-hidden="true" />
                    <h4 className="lineup-timetable__stage-title">{stage.stageLabel}</h4>
                    <span className="lineup-timetable__stage-count">{stage.slots.length}</span>
                  </header>

                  <ol className="lineup-timetable__slots" aria-label={stage.stageLabel}>
                    {stage.slots.map((slot) => {
                      const missingGenre = slot.genreLabel === MISSING_GENRE_LABEL;

                      return (
                        <li
                          className="lineup-timetable__slot"
                          key={`${slot.artistId}-${slot.startMinutes}`}
                        >
                          <time
                            className="lineup-timetable__slot-time"
                            dateTime={slot.startTime}
                            aria-label={labels.time}
                          >
                            {formatLineupTimeRange(slot.startTime, slot.endTime)}
                          </time>
                          <div className="lineup-timetable__slot-body">
                            <span className="lineup-timetable__slot-artist">{slot.artistName}</span>
                            {!missingGenre ? (
                              <span
                                className="lineup-timetable__slot-genre"
                                style={{ '--genre-accent': slot.genreColor ?? accent } as CSSProperties}
                              >
                                {slot.genreLabel}
                              </span>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
