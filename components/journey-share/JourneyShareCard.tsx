import { EventImage } from '../EventImage';
import type { JourneyShareCardData } from '../../lib/journey-share';
import {
  JourneyShareBrandMark,
  JourneyShareMetadata,
  JourneyShareSiteUrl,
  type JourneyShareLabels,
} from './JourneyShareMetadata';

type JourneyShareCardProps = {
  data: JourneyShareCardData;
  labels: JourneyShareLabels;
  priority?: boolean;
};

export function JourneyShareCard({ data, labels, priority = false }: JourneyShareCardProps) {
  const hasHero = Boolean(data.heroImage);

  return (
    <article
      className={['journey-share-card', hasHero ? '' : 'journey-share-card--fallback']
        .filter(Boolean)
        .join(' ')}
      aria-label={data.festivalName}
    >
      {hasHero ? (
        <div className="journey-share-card__media">
          <EventImage
            src={data.heroImage!}
            alt=""
            className="journey-share-card__media-image"
            priority={priority}
            sizes="(max-width: 640px) 100vw, 420px"
          />
        </div>
      ) : (
        <div className="journey-share-card__map" aria-hidden />
      )}

      <div className="journey-share-card__veil" aria-hidden />

      <div className="journey-share-card__body">
        <p className="journey-share-card__eyebrow">{labels.eyebrow}</p>

        <h2 className="journey-share-card__festival">{data.festivalName}</h2>

        {(data.festivalLocation || data.festivalDate) && (
          <div className="journey-share-card__place">
            {data.festivalLocation ? (
              <p className="journey-share-card__location">{data.festivalLocation}</p>
            ) : null}
            {data.festivalDate ? (
              <p className="journey-share-card__date">{data.festivalDate}</p>
            ) : null}
          </div>
        )}

        <hr className="journey-share-card__rule" />

        <JourneyShareMetadata data={data} labels={labels} />

        <footer className="journey-share-card__footer">
          <JourneyShareBrandMark height={16} />
          <JourneyShareSiteUrl />
        </footer>
      </div>
    </article>
  );
}
