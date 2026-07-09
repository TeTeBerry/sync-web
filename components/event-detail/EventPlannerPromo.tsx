import { ArrowRight } from 'lucide-react';
import { TrackedLink } from '../TrackedLink';

type EventPlannerPromoLabels = {
  badge: string;
  title: string;
  lead: string;
  hotels: string;
  transport: string;
  budget: string;
  schedule: string;
  cta: string;
};

type EventPlannerPromoProps = {
  planHref: string;
  labels: EventPlannerPromoLabels;
  subscribeEventProperties: Record<string, string>;
};

export function EventPlannerPromo({
  planHref,
  labels,
  subscribeEventProperties,
}: EventPlannerPromoProps) {
  return (
    <section className="planner-promo planner-promo--immersive" aria-labelledby="planner-promo-title">
      <div className="planner-promo__glow" aria-hidden />
      <div className="planner-promo__content">
        <p className="planner-promo__badge">{labels.badge}</p>
        <h2 id="planner-promo-title" className="planner-promo__title">
          {labels.title}
        </h2>
        <p className="planner-promo__lead">{labels.lead}</p>

        <TrackedLink
          className="button button--glow planner-promo__cta"
          href={planHref}
          eventName="event_plan_click"
          eventProperties={{ ...subscribeEventProperties, source: 'planner-promo' }}
        >
          <span>{labels.cta}</span>
          <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
        </TrackedLink>
      </div>
    </section>
  );
}
