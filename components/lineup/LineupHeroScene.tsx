import type { CSSProperties } from 'react';
import { Breadcrumbs } from '../Breadcrumbs';
import { EventImage } from '../EventImage';

export type LineupHeroLabels = {
  eyebrow: string;
  headlineFallback: string;
  lead: string;
  artistsUnit: string;
  stagesUnit: string;
  genresUnit: string;
};

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type LineupHeroSceneProps = {
  eventTitle: string;
  invite?: string;
  image?: string;
  artistCount: number;
  stageCount: number;
  genreCount: number;
  breadcrumbsAriaLabel: string;
  breadcrumbs: BreadcrumbItem[];
  labels: LineupHeroLabels;
};

/**
 * Desire-first hero — festival identity only.
 * Plan CTA lives at the chapter close (60/40 Event Detail balance).
 */
export function LineupHeroScene({
  eventTitle,
  invite,
  image,
  artistCount,
  stageCount,
  genreCount,
  breadcrumbsAriaLabel,
  breadcrumbs,
  labels,
}: LineupHeroSceneProps) {
  const whisper = [
    artistCount > 0 ? `${artistCount} ${labels.artistsUnit}` : null,
    stageCount > 0 ? `${stageCount} ${labels.stagesUnit}` : null,
    genreCount > 0 ? `${genreCount} ${labels.genresUnit}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="lineup-hero" aria-labelledby="lineup-hero-heading" data-reveal>
      <div className="lineup-hero__stage">
        {image ? (
          <EventImage
            src={image}
            alt={eventTitle}
            className="lineup-hero__photo"
            priority
            sizes="100vw"
          />
        ) : null}
        <div className="lineup-hero__atmosphere" aria-hidden="true">
          <div className="lineup-hero__glow" />
          <div className="lineup-hero__scrim" />
        </div>

        <div className="container lineup-hero__frame">
          <Breadcrumbs ariaLabel={breadcrumbsAriaLabel} items={breadcrumbs} />

          <div
            className="lineup-hero__body"
            style={{ '--reveal-delay': '0.08s' } as CSSProperties}
          >
            <p className="lineup-hero__eyebrow">{labels.eyebrow}</p>
            <h1 id="lineup-hero-heading" className="lineup-hero__title">
              {eventTitle}
            </h1>
            <p className="lineup-hero__invite">{invite || labels.headlineFallback}</p>
            <p className="lineup-hero__lead">{labels.lead}</p>
            {whisper ? <p className="lineup-hero__whisper">{whisper}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
