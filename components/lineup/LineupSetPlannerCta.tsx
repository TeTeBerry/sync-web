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

export function LineupSetPlannerCta({
  planHref,
  labels,
  subscribeEventProperties,
}: LineupSetPlannerCtaProps) {
  return (
    <section
      className="lineup-scene lineup-planner"
      aria-labelledby="lineup-planner-heading"
      data-reveal
      style={{ '--reveal-delay': '0.1s' } as CSSProperties}
    >
      <div className="container">
        <div className="lineup-planner__panel">
          <p className="lineup-planner__eyebrow">{labels.eyebrow}</p>
          <h2 id="lineup-planner-heading" className="lineup-planner__title">
            {labels.title}
          </h2>
          <p className="lineup-planner__lead">{labels.lead}</p>
          <TrackedLink
            className="button button--glow lineup-planner__cta"
            href={planHref}
            eventName="event_plan_click"
            eventProperties={{ ...subscribeEventProperties, source: 'lineup-set-planner' }}
          >
            <span>{labels.cta}</span>
            <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
          </TrackedLink>
        </div>
      </div>
    </section>
  );
}
