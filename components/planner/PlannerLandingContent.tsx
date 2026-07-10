import { Breadcrumbs } from '../Breadcrumbs';
import { EventImage } from '../EventImage';
import { TrackedLink } from '../TrackedLink';
import type { ScheduleDj, SchedulePerformance } from '../../lib/api';
import type { PlannerLandingData } from '../../lib/planner-landing';
import type { JourneyEntryFrom } from '../../lib/planner-journey';
import { getMessages, localizedPath, type Locale } from '../../lib/i18n';
import { PlannerJourneyScenes } from './PlannerJourneyScenes';
import { PlannerSeoContent } from './PlannerSeoContent';

type PlannerLandingContentProps = {
  locale: Locale;
  eventTitle: string;
  metaDate: string;
  metaLocation: string;
  image?: string;
  landing: PlannerLandingData;
  detailHref: string;
  lineupHref: string;
  travelHref: string;
  legacyId: number;
  entryFrom?: JourneyEntryFrom;
  djs: ScheduleDj[];
  performances: SchedulePerformance[];
};

export function PlannerLandingContent({
  locale,
  eventTitle,
  metaDate,
  metaLocation,
  image,
  landing,
  detailHref,
  lineupHref,
  travelHref,
  legacyId,
  entryFrom,
  djs,
  performances,
}: PlannerLandingContentProps) {
  const t = getMessages(locale);
  const copy = t.aiPlanner.landing;
  const journeyCopy = t.aiPlanner.journey;
  const entryCopy =
    entryFrom === 'lineup'
      ? journeyCopy.entryLineup
      : entryFrom === 'event'
        ? journeyCopy.entryEvent
        : null;
  const heroSubtitle = entryCopy?.heroSubtitle ?? copy.subtitle;
  const subscribeEventProperties = {
    event: String(legacyId),
    locale,
    sourcePath: 'plan-journey',
  };

  const heroTitle = copy.heroTitle.replace('{festival}', eventTitle);
  const metaBits = [metaLocation, metaDate].filter(Boolean);

  return (
    <div className="plan-journey" data-entry={entryFrom ?? undefined}>
      <section
        className="plan-journey__hero"
        aria-labelledby="plan-journey-heading"
      >
        <div
          className={`plan-journey__hero-stage${image ? '' : ' plan-journey__hero-stage--signal'}`}
        >
          {image ? (
            <EventImage
              src={image}
              alt={eventTitle}
              className="plan-journey__hero-photo"
              priority
              sizes="100vw"
            />
          ) : (
            <div className="plan-journey__hero-signal" aria-hidden="true">
              <span className="plan-journey__hero-signal-mark" />
              <span className="plan-journey__hero-signal-title">{eventTitle}</span>
            </div>
          )}
          <div className="plan-journey__hero-atmosphere" aria-hidden="true">
            <div className="plan-journey__hero-glow" />
            <div className="plan-journey__hero-scrim" />
          </div>

          <div className="container container--plan plan-journey__hero-frame">
            <Breadcrumbs
              ariaLabel={t.breadcrumbs.ariaLabel}
              items={[
                { label: t.breadcrumbs.home, href: localizedPath(locale) },
                { label: t.breadcrumbs.events, href: localizedPath(locale, '/events') },
                { label: eventTitle, href: detailHref },
                { label: t.aiPlanner.breadcrumb },
              ]}
            />

            <div className="plan-journey__hero-body">
              <h1 id="plan-journey-heading" className="plan-journey__hero-title">
                {heroTitle}
              </h1>
              <p className="plan-journey__hero-subtitle">{heroSubtitle}</p>
              {metaBits.length ? (
                <p className="plan-journey__hero-meta">{metaBits.join(' · ')}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="container container--plan">
        <PlannerJourneyScenes
          locale={locale}
          legacyId={legacyId}
          landing={landing}
          lineupHref={lineupHref}
          entryFrom={entryFrom}
          djs={djs}
          performances={performances}
        />

        <footer className="plan-journey__footer">
          <PlannerSeoContent locale={locale} eventTitle={eventTitle} landing={landing} />
          <nav className="plan-journey__links" aria-label={copy.linksAria}>
            <TrackedLink
              href={detailHref}
              className="plan-journey__link"
              eventName="planner_detail_link_click"
              eventProperties={subscribeEventProperties}
            >
              {copy.linkFestival}
            </TrackedLink>
            <TrackedLink
              href={lineupHref}
              className="plan-journey__link"
              eventName="planner_lineup_link_click"
              eventProperties={subscribeEventProperties}
            >
              {copy.linkLineup}
            </TrackedLink>
            <TrackedLink
              href={travelHref}
              className="plan-journey__link"
              eventName="planner_travel_link_click"
              eventProperties={subscribeEventProperties}
            >
              {copy.linkTravel}
            </TrackedLink>
          </nav>
        </footer>
      </div>
    </div>
  );
}
