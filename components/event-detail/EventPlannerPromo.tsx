import { ArrowRight, Calendar, CircleDollarSign, Hotel, Sparkles, Train } from 'lucide-react';
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

const FEATURES = [
  { key: 'hotels', icon: Hotel },
  { key: 'transport', icon: Train },
  { key: 'budget', icon: CircleDollarSign },
  { key: 'schedule', icon: Calendar },
] as const;

export function EventPlannerPromo({
  planHref,
  labels,
  subscribeEventProperties,
}: EventPlannerPromoProps) {
  return (
    <section className="planner-promo" aria-labelledby="planner-promo-title">
      <div className="planner-promo__glow" aria-hidden />
      <div className="planner-promo__content">
        <span className="planner-promo__badge">
          <Sparkles size={14} strokeWidth={2.25} aria-hidden />
          {labels.badge}
        </span>
        <h2 id="planner-promo-title" className="planner-promo__title">
          {labels.title}
        </h2>
        <p className="planner-promo__lead">{labels.lead}</p>

        <ul className="planner-promo__features">
          {FEATURES.map(({ key, icon: Icon }) => (
            <li className="planner-promo__feature" key={key}>
              <span className="planner-promo__feature-icon" aria-hidden>
                <Icon size={16} strokeWidth={2} />
              </span>
              <span>{labels[key]}</span>
            </li>
          ))}
        </ul>

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
