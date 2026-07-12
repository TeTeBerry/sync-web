import { ArrowRight } from 'lucide-react';
import { TrackedLink } from '../TrackedLink';

type PreviewLabels = {
  kicker: string;
  title: string;
  lead: string;
  travelers: string;
  roommates: string;
  buddies: string;
  rides: string;
  cta: string;
  presence?: string;
};

type FestivalSquadPreviewProps = {
  squadHref: string;
  labels: PreviewLabels;
  eventProperties: Record<string, string>;
};

export function FestivalSquadPreview({
  squadHref,
  labels,
  eventProperties,
}: FestivalSquadPreviewProps) {
  return (
    <section
      className="squad-preview"
      aria-labelledby="squad-preview-title"
      data-reveal
    >
      <div className="squad-preview__atmosphere" aria-hidden>
        <div className="squad-preview__route" />
      </div>

      <div className="squad-preview__content">
        <p className="squad-preview__kicker">
          <span>{labels.kicker}</span>
        </p>
        <h2 id="squad-preview-title" className="squad-preview__title">
          {labels.title}
        </h2>
        <p className="squad-preview__lead">{labels.lead}</p>
        {labels.presence ? <p className="squad-preview__presence">{labels.presence}</p> : null}

        <TrackedLink
          className="button secondary squad-preview__cta"
          href={squadHref}
          eventName="festival_squad_preview_clicked"
          eventProperties={{ ...eventProperties, source: 'event-detail' }}
        >
          <span>{labels.cta}</span>
          <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
        </TrackedLink>
      </div>
    </section>
  );
}
