import { MapPin, Calendar, Music2, Sparkles, Users } from 'lucide-react';
import type { EventAiSummary } from '../../lib/event-ai-summary';
import type { Activity } from '../../lib/types';

type FestivalSnapshotLabels = {
  title: string;
  location: string;
  date: string;
  genres: string;
  vibe: string;
  headliners: string;
  attendance: string;
  trending: string;
  headlinersEmpty: string;
};

type FestivalSnapshotProps = {
  activity: Activity;
  summary: EventAiSummary;
  metaDate?: string;
  metaLocation?: string;
  labels: FestivalSnapshotLabels;
};

export function FestivalSnapshot({
  activity,
  summary,
  metaDate,
  metaLocation,
  labels,
}: FestivalSnapshotProps) {
  const location = metaLocation || activity.city || activity.location || activity.area;
  const date = metaDate || activity.date;

  return (
    <section className="festival-snapshot" aria-labelledby="festival-snapshot-title">
      <h2 id="festival-snapshot-title" className="festival-snapshot__title">
        {labels.title}
      </h2>

      <div className="festival-snapshot__grid">
        {location ? (
          <article className="festival-snapshot__card">
            <span className="festival-snapshot__icon" aria-hidden>
              <MapPin size={18} strokeWidth={2} />
            </span>
            <div>
              <span className="festival-snapshot__label">{labels.location}</span>
              <p className="festival-snapshot__value">{location}</p>
            </div>
          </article>
        ) : null}

        {date ? (
          <article className="festival-snapshot__card">
            <span className="festival-snapshot__icon" aria-hidden>
              <Calendar size={18} strokeWidth={2} />
            </span>
            <div>
              <span className="festival-snapshot__label">{labels.date}</span>
              <p className="festival-snapshot__value">{date}</p>
            </div>
          </article>
        ) : null}

        <article className="festival-snapshot__card festival-snapshot__card--wide">
          <span className="festival-snapshot__icon" aria-hidden>
            <Music2 size={18} strokeWidth={2} />
          </span>
          <div>
            <span className="festival-snapshot__label">{labels.genres}</span>
            <div className="festival-snapshot__chips">
              {summary.genres.map((genre) => (
                <span className="festival-snapshot__chip" key={genre}>
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </article>

        <article className="festival-snapshot__card festival-snapshot__card--wide">
          <span className="festival-snapshot__icon" aria-hidden>
            <Sparkles size={18} strokeWidth={2} />
          </span>
          <div>
            <span className="festival-snapshot__label">{labels.vibe}</span>
            <p className="festival-snapshot__value">{summary.vibe}</p>
          </div>
        </article>

        <article className="festival-snapshot__card festival-snapshot__card--wide">
          <span className="festival-snapshot__icon" aria-hidden>
            <Users size={18} strokeWidth={2} />
          </span>
          <div>
            <span className="festival-snapshot__label">{labels.headliners}</span>
            {summary.mustSee.length ? (
              <ul className="festival-snapshot__headliners">
                {summary.mustSee.map((artist) => (
                  <li key={artist}>{artist}</li>
                ))}
              </ul>
            ) : (
              <p className="festival-snapshot__value festival-snapshot__value--muted">
                {labels.headlinersEmpty}
              </p>
            )}
          </div>
        </article>

        {activity.hot || activity.attendees ? (
          <article className="festival-snapshot__card">
            <span className="festival-snapshot__icon" aria-hidden>
              <Users size={18} strokeWidth={2} />
            </span>
            <div>
              <span className="festival-snapshot__label">{labels.attendance}</span>
              <p className="festival-snapshot__value">
                {activity.hot ? labels.trending : null}
                {activity.hot && activity.attendees ? ' · ' : null}
                {activity.attendees
                  ? `${activity.attendees.toLocaleString()}+`
                  : null}
              </p>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
