import type { JourneyShareCardData } from '../../lib/journey-share';
import { JOURNEY_SHARE_SITE_HOST } from '../../lib/journey-share';

export type JourneyShareLabels = {
  eyebrow: string;
  origin: string;
  accommodation: string;
  budget: string;
  artists: string;
  lookingFor: string;
  lookingForLabels: {
    roommate: string;
    festival_buddy: string;
    ride_share: string;
  };
};

type JourneyShareMetadataProps = {
  data: JourneyShareCardData;
  labels: JourneyShareLabels;
};

export function JourneyShareMetadata({ data, labels }: JourneyShareMetadataProps) {
  const looking = data.lookingFor
    .map((intent) => labels.lookingForLabels[intent])
    .filter(Boolean);

  const tripBits = [
    data.origin ? `${labels.origin} ${data.origin}` : '',
    data.accommodation,
    data.budget,
  ].filter(Boolean);

  return (
    <div className="journey-share-meta">
      {tripBits.length ? (
        <div className="journey-share-meta__stanza">
          {tripBits.map((bit) => (
            <p key={bit} className="journey-share-meta__breath">
              {bit}
            </p>
          ))}
        </div>
      ) : null}

      {data.favoriteArtists.length ? (
        <div className="journey-share-meta__row journey-share-meta__row--artists">
          <p className="journey-share-meta__label">{labels.artists}</p>
          <p className="journey-share-meta__artists">{data.favoriteArtists.join(' · ')}</p>
        </div>
      ) : null}

      {looking.length ? (
        <div className="journey-share-meta__row journey-share-meta__row--looking">
          <p className="journey-share-meta__label">{labels.lookingFor}</p>
          <ul className="journey-share-meta__looking">
            {looking.map((item) => (
              <li key={item} className="journey-share-meta__looking-item">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function JourneyShareBrandMark({ height = 18 }: { height?: number }) {
  const width = Math.round((height * 248) / 100);

  return (
    <svg
      className="journey-share-card__brand"
      width={width}
      height={height}
      viewBox="0 0 248 100"
      role="img"
      aria-label="Raven"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="78"
        fill="currentColor"
        fontFamily="var(--font-display), system-ui, sans-serif"
        fontSize="88"
        fontWeight="700"
      >
        R
      </text>
      <text
        x="62"
        y="72"
        fill="currentColor"
        fontFamily="var(--font-display), system-ui, sans-serif"
        fontSize="52"
        fontWeight="700"
      >
        raven
      </text>
    </svg>
  );
}

export function JourneyShareSiteUrl() {
  return <p className="journey-share-card__url">{JOURNEY_SHARE_SITE_HOST}</p>;
}
