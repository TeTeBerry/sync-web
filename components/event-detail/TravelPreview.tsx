import {
  ArrowRight,
  BedDouble,
  Bus,
  CircleDollarSign,
  Luggage,
  Plane,
  Ticket,
} from 'lucide-react';
import type { EventTravelData } from '../../lib/event-travel';
import { TrackedLink } from '../TrackedLink';

type TravelPreviewLabels = {
  title: string;
  lead: string;
  exploreCta: string;
  hotels: string;
  flights: string;
  transport: string;
  tickets: string;
  budget: string;
  packing: string;
};

type TravelPreviewProps = {
  data: EventTravelData;
  travelHref: string;
  labels: TravelPreviewLabels;
  subscribeEventProperties: Record<string, string>;
};

const PREVIEW_ITEMS = [
  { key: 'hotels', icon: BedDouble, section: 'stay' as const },
  { key: 'flights', icon: Plane, section: 'flights' as const },
  { key: 'transport', icon: Bus, section: 'transport' as const },
  { key: 'tickets', icon: Ticket, section: 'tickets' as const },
  { key: 'budget', icon: CircleDollarSign, section: 'budget' as const },
  { key: 'packing', icon: Luggage, section: 'essentials' as const },
] as const;

function previewText(data: EventTravelData, section: (typeof PREVIEW_ITEMS)[number]['section'], key: string): string {
  if (section === 'stay') {
    return data.stay.items.bestAreas[0] ?? data.stay.insight;
  }
  if (section === 'flights') {
    return data.flights.items.nearestAirport;
  }
  if (section === 'transport') {
    return data.transport.items.publicTransit;
  }
  if (section === 'tickets') {
    return data.tickets.items.types[0] ?? data.tickets.insight;
  }
  if (section === 'budget') {
    return data.budget.items.tiers[1]?.estimate ?? data.budget.insight;
  }
  return data.essentials.items.packing[0] ?? data.essentials.insight;
}

export function TravelPreview({
  data,
  travelHref,
  labels,
  subscribeEventProperties,
}: TravelPreviewProps) {
  return (
    <section className="detail-section travel-preview" aria-labelledby="travel-preview-title">
      <header className="detail-section__header">
        <div>
          <h2 id="travel-preview-title" className="detail-section__title">
            {labels.title}
          </h2>
          <p className="detail-section__lead">{labels.lead}</p>
        </div>
      </header>

      <div className="travel-preview__grid">
        {PREVIEW_ITEMS.map(({ key, icon: Icon, section }) => (
          <article className="travel-preview__card" key={key}>
            <span className="travel-preview__icon" aria-hidden>
              <Icon size={18} strokeWidth={2} />
            </span>
            <h3 className="travel-preview__card-title">{labels[key as keyof TravelPreviewLabels]}</h3>
            <p className="travel-preview__card-text">{previewText(data, section, key)}</p>
          </article>
        ))}
      </div>

      <footer className="detail-section__footer">
        <TrackedLink
          className="detail-section__cta"
          href={travelHref}
          eventName="event_travel_explore_click"
          eventProperties={subscribeEventProperties}
        >
          <span>{labels.exploreCta}</span>
          <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
        </TrackedLink>
      </footer>
    </section>
  );
}
