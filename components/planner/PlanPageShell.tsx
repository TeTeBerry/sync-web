'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { AiPlannerFlow } from './AiPlannerFlow';
import type { Activity } from '../../lib/types';
import type { RavenTravelGuidePlan, ScheduleDj, SchedulePerformance } from '../../lib/api';
import type { Locale } from '../../lib/i18n';

type JourneyPhase = 'setup' | 'generating' | 'result' | 'error';

type PlanPageShellProps = {
  locale: Locale;
  activity: Activity;
  eventTitle: string;
  metaDate: string;
  metaLocation: string;
  djs: ScheduleDj[];
  performances: SchedulePerformance[];
  eventPath: string;
  image?: string;
  waitlistHref: string;
  initialRemotePlan?: RavenTravelGuidePlan | null;
  initialGuideId?: string | null;
  landing: ReactNode;
};

export function PlanPageShell({
  locale,
  activity,
  eventTitle,
  metaDate,
  metaLocation,
  djs,
  performances,
  eventPath,
  image,
  waitlistHref,
  initialRemotePlan = null,
  initialGuideId = null,
  landing,
}: PlanPageShellProps) {
  const [phase, setPhase] = useState<JourneyPhase>(() =>
    initialRemotePlan ? 'result' : 'setup',
  );
  const handlePhaseChange = useCallback((next: JourneyPhase) => {
    setPhase(next);
  }, []);

  // Hide SEO/demo landing while generating or showing a real journey so demo
  // content never sits beside user data. FAQ remains in page JSON-LD for SEO.
  const hideDemo = phase === 'result' || phase === 'generating';

  return (
    <div className="plan-page-shell" data-journey-phase={phase}>
      <div
        className={`plan-page-shell__landing${hideDemo ? ' is-collapsed' : ''}`}
        hidden={hideDemo}
        aria-hidden={hideDemo}
      >
        {landing}
      </div>

      <section
        id="planner-form"
        className="section section--plan"
        tabIndex={-1}
      >
        <div className="container container--plan">
          <div className="plan-page__composer">
            <AiPlannerFlow
              locale={locale}
              activity={activity}
              eventTitle={eventTitle}
              metaDate={metaDate}
              metaLocation={metaLocation}
              djs={djs}
              performances={performances}
              eventPath={eventPath}
              image={image}
              waitlistHref={waitlistHref}
              hideHeader
              initialRemotePlan={initialRemotePlan}
              initialGuideId={initialGuideId}
              onPhaseChange={handlePhaseChange}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
