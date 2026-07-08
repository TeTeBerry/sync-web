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
};

type LineupPreviewProps = {
  artists: FeaturedArtist[];
  genres: string[];
  stageLabels: string[];
  artistCount: number;
  lineupHref: string;
  labels: LineupPreviewLabels;
  subscribeEventProperties: Record<string, string>;
};

export function LineupPreview({
  artists,
  genres,
  stageLabels,
  artistCount,
  lineupHref,
  labels,
  subscribeEventProperties,
}: LineupPreviewProps) {
  return (
    <section className="detail-section lineup-preview" aria-labelledby="lineup-preview-title">
      <header className="detail-section__header">
        <div>
          <h2 id="lineup-preview-title" className="detail-section__title">
            {labels.title}
          </h2>
          <p className="detail-section__lead">{labels.lead}</p>
        </div>
        {artistCount > 0 ? (
          <span className="detail-section__meta">{labels.artistCount.replace('{count}', String(artistCount))}</span>
        ) : null}
      </header>

      {artists.length ? (
        <>
          {genres.length ? (
            <div className="lineup-preview__genres" aria-label={labels.title}>
              {genres.map((genre) => (
                <span className="lineup-preview__genre" key={genre}>
                  {genre}
                </span>
              ))}
            </div>
          ) : null}

          {stageLabels.length ? (
            <div className="lineup-preview__stages">
              <span className="lineup-preview__stages-label">{labels.stages}</span>
              <div className="lineup-preview__stage-list">
                {stageLabels.map((stage) => (
                  <span className="lineup-preview__stage" key={stage}>
                    {stage}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="lineup-preview__artists">
            {artists.map((artist) => (
              <article
                className="lineup-preview__artist"
                key={artist.id}
                style={{ '--artist-accent': artist.accent } as CSSProperties}
              >
                <span className="lineup-preview__artist-bar" aria-hidden />
                <div className="lineup-preview__artist-copy">
                  <h3 className="lineup-preview__artist-name">{artist.name}</h3>
                  {artist.genre ? (
                    <span className="lineup-preview__artist-genre">{artist.genre}</span>
                  ) : null}
                  {artist.stage ? (
                    <span className="lineup-preview__artist-stage">{artist.stage}</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="detail-section__empty">
          <p className="detail-section__empty-title">{labels.emptyTitle}</p>
          <p className="detail-section__empty-lead">{labels.emptyLead}</p>
        </div>
      )}

      <footer className="detail-section__footer">
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
