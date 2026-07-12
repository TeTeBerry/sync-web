'use client';

import { ArrowRight } from 'lucide-react';
import { TrackedLink } from '../TrackedLink';

type JourneyCtaLabels = {
  kicker: string;
  title: string;
  lead: string;
  matches: string;
  signalsTitle: string;
  signalOrigin: string;
  signalArrival: string;
  signalStay: string;
  signalBudget: string;
  signalArtists: string;
  cta: string;
  fromOrigin?: string;
  pathLabel?: string;
};

type FestivalSquadJourneyCtaProps = {
  squadHref: string;
  labels: JourneyCtaLabels;
  eventProperties: Record<string, string>;
  /** Real journey facts from the generated plan — shown instead of generic signal copy. */
  journeySignals?: string[];
};

export function FestivalSquadJourneyCta({
  squadHref,
  labels,
  eventProperties,
  journeySignals,
}: FestivalSquadJourneyCtaProps) {
  const hasJourney = Boolean(journeySignals && journeySignals.length > 0);
  const signals = hasJourney
    ? journeySignals!.join(' · ')
    : [labels.signalOrigin, labels.signalArrival, labels.signalStay, labels.signalBudget, labels.signalArtists].join(
        ' · ',
      );

  return (
    <section className="squad-journey-cta" aria-labelledby="squad-journey-cta-title">
      <p className="squad-journey-cta__kicker">{labels.kicker}</p>
      <h3 id="squad-journey-cta-title" className="squad-journey-cta__title">
        {labels.title}
      </h3>
      <p className="squad-journey-cta__lead">{labels.lead}</p>

      <div className="squad-journey-cta__path">
        <p className="squad-journey-cta__path-label">
          {labels.pathLabel ?? labels.signalsTitle}
        </p>
        <p className="squad-journey-cta__signals-line">
          <span className="visually-hidden">{labels.signalsTitle}. </span>
          {signals}
        </p>
      </div>

      <TrackedLink
        className="button secondary"
        href={squadHref}
        eventName="festival_squad_cta_clicked"
        eventProperties={{
          ...eventProperties,
          source: 'journey-result',
          personalized: hasJourney ? '1' : '0',
        }}
      >
        <span>{labels.cta}</span>
        <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
      </TrackedLink>
    </section>
  );
}
