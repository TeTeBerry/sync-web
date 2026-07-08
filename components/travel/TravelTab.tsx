import type { ReactNode } from 'react';
import {
  BedDouble,
  Bus,
  CircleDollarSign,
  Luggage,
  Plane,
  Ticket,
} from 'lucide-react';
import type { EventTravelData } from '../../lib/event-travel';
import { TravelCTA } from './TravelCTA';
import { TravelFAQ } from './TravelFAQ';
import { TravelSectionCard } from './TravelSectionCard';

type TravelTabLabels = {
  pageTitle: string;
  pageLead: string;
  insightBadge: string;
  official: string;
  unofficial: string;
  stay: string;
  flights: string;
  transport: string;
  tickets: string;
  budget: string;
  essentials: string;
  faq: string;
  bestAreas: string;
  officialStay: string;
  groupNote: string;
  nearestAirport: string;
  arrivalWindow: string;
  departureTips: string;
  airportTransfer: string;
  shuttle: string;
  publicTransit: string;
  parking: string;
  lateNight: string;
  ticketTypes: string;
  resaleNote: string;
  soldOutRisk: string;
  officialTickets: string;
  included: string;
  weather: string;
  packing: string;
  payment: string;
  sim: string;
  safety: string;
  fallbackTitle: string;
  fallbackLead: string;
  ctaHotel: string;
  ctaTransport: string;
  ctaBudget: string;
  ctaPlan: string;
  seoTravelGuide: string;
  seoHotels: string;
  seoTransport: string;
  seoBudget: string;
  seoPacking: string;
  seoSoon: string;
};

type TravelTabProps = {
  data: EventTravelData;
  planHref: string;
  labels: TravelTabLabels;
  subscribeEventProperties: Record<string, string>;
  embedded?: boolean;
};

function OfficialBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="travel-block travel-block--official">
      <span className="travel-block__tag travel-block__tag--official">{label}</span>
      <p className="travel-block__text">{value}</p>
    </div>
  );
}

function RavenBlock({ children }: { children: ReactNode }) {
  return <div className="travel-block travel-block--raven">{children}</div>;
}

function TierGrid({
  items,
}: {
  items: { tier: string; label: string; description: string }[];
}) {
  return (
    <div className="travel-tier-grid">
      {items.map((item) => (
        <article className={`travel-tier travel-tier--${item.tier}`} key={item.tier}>
          <span className="travel-tier__label">{item.label}</span>
          <p className="travel-tier__text">{item.description}</p>
        </article>
      ))}
    </div>
  );
}

export function TravelTab({
  data,
  planHref,
  labels,
  subscribeEventProperties,
  embedded = false,
}: TravelTabProps) {
  const ctaProps = {
    eventName: 'event_plan_click' as const,
    eventProperties: { ...subscribeEventProperties, source: 'travel-tab' },
  };

  return (
    <article className="travel-tab">
      {!embedded ? (
        <header className="travel-tab__header">
          <h2 className="travel-tab__title">{labels.pageTitle}</h2>
          <p className="travel-tab__lead">{labels.pageLead}</p>
        </header>
      ) : null}

      {!data.hasRichData ? (
        <div className="travel-fallback">
          <p className="travel-fallback__title">{labels.fallbackTitle}</p>
          <p className="travel-fallback__lead">{labels.fallbackLead}</p>
          <TravelCTA href={planHref} label={labels.ctaPlan} variant="primary" {...ctaProps} />
        </div>
      ) : null}

      <div className="travel-dashboard">
        <TravelSectionCard
          id="travel-stay"
          title={labels.stay}
          icon={BedDouble}
          insight={data.stay.insight}
          insightBadge={labels.insightBadge}
          officialLabel={labels.official}
          unofficialLabel={labels.unofficial}
          seoLink={{ href: data.seoLinks.hotels, label: labels.seoHotels, comingSoon: true }}
          footer={
            <TravelCTA href={planHref} label={labels.ctaHotel} {...ctaProps} />
          }
        >
          <RavenBlock>
            <h4 className="travel-subheading">{labels.bestAreas}</h4>
            <ul className="travel-chip-list">
              {data.stay.items.bestAreas.map((area) => (
                <li className="travel-chip" key={area}>
                  {area}
                </li>
              ))}
            </ul>
          </RavenBlock>
          {data.stay.items.official.map((item) => (
            <OfficialBlock key={item.label} label={item.label} value={item.value} />
          ))}
          <RavenBlock>
            <TierGrid items={data.stay.items.options} />
            <p className="travel-note">{data.stay.items.groupNote}</p>
          </RavenBlock>
        </TravelSectionCard>

        <TravelSectionCard
          id="travel-flights"
          title={labels.flights}
          icon={Plane}
          insight={data.flights.insight}
          insightBadge={labels.insightBadge}
          officialLabel={labels.official}
          unofficialLabel={labels.unofficial}
          seoLink={{ href: data.seoLinks.travelGuide, label: labels.seoTravelGuide, comingSoon: true }}
        >
          <RavenBlock>
            <dl className="travel-facts">
              <div className="travel-facts__row">
                <dt>{labels.nearestAirport}</dt>
                <dd>{data.flights.items.nearestAirport}</dd>
              </div>
              <div className="travel-facts__row">
                <dt>{labels.arrivalWindow}</dt>
                <dd>{data.flights.items.arrivalWindow}</dd>
              </div>
              <div className="travel-facts__row">
                <dt>{labels.departureTips}</dt>
                <dd>{data.flights.items.departureTips}</dd>
              </div>
              <div className="travel-facts__row">
                <dt>{labels.airportTransfer}</dt>
                <dd>{data.flights.items.airportTransfer}</dd>
              </div>
            </dl>
          </RavenBlock>
        </TravelSectionCard>

        <TravelSectionCard
          id="travel-transport"
          title={labels.transport}
          icon={Bus}
          insight={data.transport.insight}
          insightBadge={labels.insightBadge}
          officialLabel={labels.official}
          unofficialLabel={labels.unofficial}
          seoLink={{ href: data.seoLinks.transportation, label: labels.seoTransport, comingSoon: true }}
          footer={
            <TravelCTA href={planHref} label={labels.ctaTransport} {...ctaProps} />
          }
        >
          <OfficialBlock label={labels.shuttle} value={data.transport.items.shuttle} />
          <RavenBlock>
            <dl className="travel-facts">
              <div className="travel-facts__row">
                <dt>{labels.publicTransit}</dt>
                <dd>{data.transport.items.publicTransit}</dd>
              </div>
              <div className="travel-facts__row">
                <dt>{labels.parking}</dt>
                <dd>{data.transport.items.parking}</dd>
              </div>
              <div className="travel-facts__row">
                <dt>{labels.lateNight}</dt>
                <dd>{data.transport.items.lateNight}</dd>
              </div>
            </dl>
          </RavenBlock>
        </TravelSectionCard>

        <TravelSectionCard
          id="travel-tickets"
          title={labels.tickets}
          icon={Ticket}
          insight={data.tickets.insight}
          insightBadge={labels.insightBadge}
          officialLabel={labels.official}
          unofficialLabel={labels.unofficial}
        >
          {data.tickets.items.officialLink ? (
            <OfficialBlock
              label={labels.officialTickets}
              value={data.tickets.items.officialLink}
            />
          ) : null}
          <RavenBlock>
            <h4 className="travel-subheading">{labels.ticketTypes}</h4>
            <ul className="travel-bullet-list">
              {data.tickets.items.types.map((type) => (
                <li key={type}>{type}</li>
              ))}
            </ul>
            <dl className="travel-facts travel-facts--compact">
              <div className="travel-facts__row">
                <dt>{labels.resaleNote}</dt>
                <dd>{data.tickets.items.resaleNote}</dd>
              </div>
              <div className="travel-facts__row">
                <dt>{labels.soldOutRisk}</dt>
                <dd>{data.tickets.items.soldOutRisk}</dd>
              </div>
            </dl>
          </RavenBlock>
        </TravelSectionCard>

        <TravelSectionCard
          id="travel-budget"
          title={labels.budget}
          icon={CircleDollarSign}
          insight={data.budget.insight}
          insightBadge={labels.insightBadge}
          officialLabel={labels.official}
          unofficialLabel={labels.unofficial}
          seoLink={{ href: data.seoLinks.budget, label: labels.seoBudget, comingSoon: true }}
          footer={
            <TravelCTA href={planHref} label={labels.ctaBudget} {...ctaProps} />
          }
        >
          <RavenBlock>
            <div className="travel-budget-grid">
              {data.budget.items.tiers.map((tier) => (
                <article className={`travel-budget-card travel-budget-card--${tier.tier}`} key={tier.tier}>
                  <span className="travel-budget-card__estimate">{tier.estimate}</span>
                  <p className="travel-budget-card__note">{tier.note}</p>
                </article>
              ))}
            </div>
            <h4 className="travel-subheading">{labels.included}</h4>
            <ul className="travel-bullet-list">
              {data.budget.items.included.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </RavenBlock>
        </TravelSectionCard>

        <TravelSectionCard
          id="travel-essentials"
          title={labels.essentials}
          icon={Luggage}
          insight={data.essentials.insight}
          insightBadge={labels.insightBadge}
          officialLabel={labels.official}
          unofficialLabel={labels.unofficial}
          seoLink={{ href: data.seoLinks.packingList, label: labels.seoPacking, comingSoon: true }}
          footer={
            <TravelCTA href={planHref} label={labels.ctaPlan} variant="primary" {...ctaProps} />
          }
        >
          <RavenBlock>
            <dl className="travel-facts">
              <div className="travel-facts__row">
                <dt>{labels.weather}</dt>
                <dd>{data.essentials.items.weather}</dd>
              </div>
              <div className="travel-facts__row">
                <dt>{labels.packing}</dt>
                <dd>
                  <ul className="travel-bullet-list travel-bullet-list--inline">
                    {data.essentials.items.packing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div className="travel-facts__row">
                <dt>{labels.payment}</dt>
                <dd>{data.essentials.items.payment}</dd>
              </div>
              <div className="travel-facts__row">
                <dt>{labels.sim}</dt>
                <dd>{data.essentials.items.sim}</dd>
              </div>
              <div className="travel-facts__row">
                <dt>{labels.safety}</dt>
                <dd>{data.essentials.items.safety}</dd>
              </div>
            </dl>
          </RavenBlock>
        </TravelSectionCard>
      </div>

      <TravelFAQ items={data.faq} title={labels.faq} />
    </article>
  );
}
