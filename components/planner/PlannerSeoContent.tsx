import { TravelFAQ } from '../travel/TravelFAQ';
import type { PlannerLandingData } from '../../lib/planner-landing';
import { getMessages, type Locale } from '../../lib/i18n';

type PlannerSeoContentProps = {
  locale: Locale;
  eventTitle: string;
  landing: PlannerLandingData;
};

export function PlannerSeoContent({ locale, eventTitle, landing }: PlannerSeoContentProps) {
  const copy = getMessages(locale).aiPlanner.landing;

  return (
    <aside className="plan-journey__seo" aria-label={copy.seoAria}>
      <details className="plan-journey__seo-details">
        <summary className="plan-journey__seo-summary">{copy.seoSummary}</summary>
        <div className="plan-journey__seo-body">
          <section aria-labelledby="plan-seo-overview">
            <h2 id="plan-seo-overview" className="plan-journey__seo-heading">
              {copy.snapshotTitle}
            </h2>
            <p>{landing.overview}</p>
            <p>
              <strong>{eventTitle}</strong>
              {landing.venue ? ` · ${landing.venue}` : ''}
              {landing.country ? ` · ${landing.country}` : ''}
            </p>
          </section>
          <TravelFAQ items={landing.faq} title={copy.faqTitle} />
        </div>
      </details>
    </aside>
  );
}
