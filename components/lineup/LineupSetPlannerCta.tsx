import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { TrackedLink } from '../TrackedLink';

export type LineupSetPlannerLabels = {
  eyebrow: string;
  title: string;
  lead: string;
  cta: string;
};

type LineupSetPlannerCtaProps = {
  planHref: string;
  labels: LineupSetPlannerLabels;
  subscribeEventProperties: Record<string, string>;
};

/**
 * Immersive handoff into Plan — confidence arriving, not a promo panel.
 */
export function LineupSetPlannerCta({
  planHref,
  labels,
  subscribeEventProperties,
}: LineupSetPlannerCtaProps) {
  return (
    <section
      className="lineup-scene lineup-planner lineup-planner--continue"
      aria-labelledby="lineup-planner-heading"
      data-reveal
      style={{ '--reveal-delay': '0.1s' } as CSSProperties}
    >
      <div className="container lineup-planner__continue-frame">
        <p className="lineup-planner__eyebrow">{labels.eyebrow}</p>
        <h2 id="lineup-planner-heading" className="lineup-planner__title">
          {labels.title}
        </h2>
        <p className="lineup-planner__lead">{labels.lead}</p>
        <TrackedLink
          className="lineup-planner__continue-cta"
          href={planHref}
          eventName="event_plan_click"
          eventProperties={{ ...subscribeEventProperties, source: 'lineup-set-planner' }}
        >
          <span>{labels.cta}</span>
          <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
        </TrackedLink>
      </div>
    </section>
  );
}
