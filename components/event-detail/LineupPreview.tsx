import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import type { FeaturedArtist } from '../../lib/lineup-preview';
import { TrackedLink } from '../TrackedLink';

type LineupPreviewLabels = {
  title: string;
  lead: string;
  stages: string;
  exploreCta: string;
  artistCount: string;
  emptyTitle: string;
  emptyLead: string;
  awaitingTitle?: string;
  awaitingLead?: string;
};

type LineupPreviewProps = {
  artists: FeaturedArtist[];
  genres: string[];
  stageLabels: string[];
  artistCount: number;
  lineupHref: string;
  labels: LineupPreviewLabels;
  subscribeEventProperties: Record<string, string>;
  awaitingCopy?: string;
};

export function LineupPreview({
  artists,
  genres,
  stageLabels,
  artistCount,
  lineupHref,
  labels,
  subscribeEventProperties,
  awaitingCopy,
}: LineupPreviewProps) {
  const [headliner, ...supporting] = artists;
  const cast = supporting.slice(0, 3);

  return (
    <section className="lineup-experience" aria-labelledby="lineup-preview-title">
      <header className="lineup-experience__header">
        <div>
          <h2 id="lineup-preview-title" className="lineup-experience__title">
            {artistCount > 0 ? labels.lead : labels.awaitingTitle ?? labels.emptyTitle}
          </h2>
          {artistCount > 0 && genres.length ? (
            <p className="lineup-experience__sound">{genres.slice(0, 3).join(' · ')}</p>
          ) : null}
        </div>
        {artistCount > 0 ? (
          <p className="lineup-experience__count">
            {labels.artistCount.replace('{count}', String(artistCount))}
          </p>
        ) : null}
      </header>

      {artistCount > 0 ? (
        <div className="lineup-experience__spotlight">
          {headliner ? (
            <article
              className="lineup-experience__headliner"
              style={{ '--artist-accent': headliner.accent } as CSSProperties}
            >
              <h3 className="lineup-experience__name lineup-experience__name--lead">
                {headliner.name}
              </h3>
              {headliner.reason ? (
                <p className="lineup-experience__reason">{headliner.reason}</p>
              ) : (
                <p className="lineup-experience__meta">
                  {[headliner.genre, headliner.stage].filter(Boolean).join(' · ')}
                </p>
              )}
            </article>
          ) : null}

          {cast.length ? (
            <ul className="lineup-experience__cast">
              {cast.map((artist) => (
                <li
                  className="lineup-experience__artist"
                  key={artist.id}
                  style={{ '--artist-accent': artist.accent } as CSSProperties}
                >
                  <h3 className="lineup-experience__name">{artist.name}</h3>
                  {artist.reason ? (
                    <p className="lineup-experience__reason">{artist.reason}</p>
                  ) : (
                    <p className="lineup-experience__meta">
                      {[artist.genre, artist.stage].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : null}

          {stageLabels.length ? (
            <p className="lineup-experience__stages">
              <span>{labels.stages}</span>
              {stageLabels.join(' · ')}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="lineup-experience__awaiting">
          <p className="lineup-experience__awaiting-copy">
            {awaitingCopy ?? labels.awaitingLead ?? labels.emptyLead}
          </p>
        </div>
      )}

      <footer className="lineup-experience__footer">
        <TrackedLink
          className="detail-section__cta"
          href={lineupHref}
          eventName="event_lineup_explore_click"
          eventProperties={subscribeEventProperties}
        >
          <span>{labels.exploreCta}</span>
          <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
        </TrackedLink>
      </footer>
    </section>
  );
}
