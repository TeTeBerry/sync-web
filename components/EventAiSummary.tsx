import { Bell } from 'lucide-react';
import { TrackedLink } from './TrackedLink';
import { InlineEmpty } from './states/InlineEmpty';
import type { EventAiSummary as EventAiSummaryData } from '../lib/event-ai-summary';
import type { Locale } from '../lib/i18n';
import { localizedPath } from '../lib/i18n';

type EventAiSummaryProps = {
  summary: EventAiSummaryData;
  locale: Locale;
  eventTitle: string;
  planHref: string;
  labels: {
    badge: string;
    title: string;
    vibe: string;
    genres: string;
    mustSee: string;
    travel: string;
    planCta: string;
    grounded: string;
    mustSeeEmptyTitle: string;
    mustSeeEmptyLead: string;
    mustSeeEmptyAction: string;
  };
  subscribeEventProperties: Record<string, string>;
};

export function EventAiSummary({
  summary,
  locale,
  eventTitle,
  planHref,
  labels,
  subscribeEventProperties,
}: EventAiSummaryProps) {
  const waitlistHref = `${localizedPath(locale, '/waitlist')}?event=${encodeURIComponent(eventTitle)}`;

  return (
    <section className="event-ai-summary" aria-labelledby="event-ai-summary-title">
      <div className="event-ai-summary__header">
        <div className="event-ai-summary__intro">
          <span className="event-ai-summary__badge">{labels.badge}</span>
          <h2 id="event-ai-summary-title" className="event-ai-summary__title">
            {labels.title}
          </h2>
          <p className="event-ai-summary__grounded">{labels.grounded}</p>
        </div>
        <TrackedLink
          className="button button--compact event-ai-summary__cta"
          href={planHref}
          eventName="event_ai_plan_click"
          eventProperties={subscribeEventProperties}
        >
          {labels.planCta}
        </TrackedLink>
      </div>

      <div className="event-ai-summary__grid">
        <article className="event-ai-summary__card event-ai-summary__card--vibe">
          <span className="event-ai-summary__label">{labels.vibe}</span>
          <p className="event-ai-summary__value">{summary.vibe}</p>
        </article>

        <article className="event-ai-summary__card">
          <span className="event-ai-summary__label">{labels.genres}</span>
          <div className="event-ai-summary__chips" aria-label={labels.genres}>
            {summary.genres.map((genre) => (
              <span className="event-ai-summary__chip" key={genre}>
                {genre}
              </span>
            ))}
          </div>
        </article>

        <article className="event-ai-summary__card event-ai-summary__card--must-see">
          <span className="event-ai-summary__label">{labels.mustSee}</span>
          {summary.mustSee.length ? (
            <ul className="event-ai-summary__artists">
              {summary.mustSee.map((artist) => (
                <li key={artist}>{artist}</li>
              ))}
            </ul>
          ) : (
            <InlineEmpty
              icon={Bell}
              title={labels.mustSeeEmptyTitle}
              lead={labels.mustSeeEmptyLead}
              action={
                <TrackedLink
                  className="inline-empty__link"
                  href={waitlistHref}
                  eventName="event_subscribe_click"
                  eventProperties={{ ...subscribeEventProperties, source: 'must-see-empty' }}
                >
                  {labels.mustSeeEmptyAction}
                </TrackedLink>
              }
            />
          )}
        </article>

        <article className="event-ai-summary__card">
          <span className="event-ai-summary__label">{labels.travel}</span>
          <p className="event-ai-summary__value">{summary.travel}</p>
        </article>
      </div>
    </section>
  );
}
