"use client";

import { useCallback, useState, type ReactNode } from "react";
import { AiPlannerFlow } from "./AiPlannerFlow";
import type { Activity } from "../../lib/types";
import type {
  RavenTravelGuidePlan,
  ScheduleDj,
  SchedulePerformance,
} from "../../lib/api";
import type { Locale } from "../../lib/i18n";
import type { HomepageEstimateContext } from "../../lib/home-budget-estimate";

type JourneyPhase = "setup" | "generating" | "result" | "error";

type PlanPageShellProps = {
  locale: Locale;
  activity: Activity;
  eventTitle: string;
  metaDate: string;
  metaLocation: string;
  djs: ScheduleDj[];
  performances: SchedulePerformance[];
  image?: string;
  waitlistHref: string;
  initialRemotePlan?: RavenTravelGuidePlan | null;
  initialGuideId?: string | null;
  initialOrigin?: string;
  initialEstimate?: HomepageEstimateContext | null;
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
  image,
  waitlistHref,
  initialRemotePlan = null,
  initialGuideId = null,
  initialOrigin = "",
  initialEstimate = null,
  landing,
}: PlanPageShellProps) {
  const [phase, setPhase] = useState<JourneyPhase>(() =>
    initialRemotePlan ? "result" : "setup",
  );
  const handlePhaseChange = useCallback((next: JourneyPhase) => {
    setPhase(next);
  }, []);

  // Hide SEO/demo landing while generating or showing a real journey so demo
  // content never sits beside user data. FAQ remains in page JSON-LD for SEO.
  const hideDemo = phase === "result" || phase === "generating";
  // Result / generating / error leave the composer shell — full-bleed journey stage.
  // Keep a stable DOM depth so AiPlannerFlow does not remount across phase changes.
  const immersive =
    phase === "result" || phase === "generating" || phase === "error";

  return (
    <div className="plan-page-shell" data-journey-phase={phase}>
      <div
        className={`plan-page-shell__landing${hideDemo ? " is-collapsed" : ""}`}
        hidden={hideDemo}
        aria-hidden={hideDemo}
      >
        {landing}
      </div>

      <section
        id="planner-form"
        className={`section section--plan${immersive ? " section--plan-immersive" : ""}`}
        tabIndex={-1}
      >
        <div
          className={
            immersive ? "plan-page__stage" : "container container--plan"
          }
        >
          <div
            className={
              immersive ? "plan-page__stage-inner" : "plan-page__composer"
            }
          >
            <AiPlannerFlow
              locale={locale}
              activity={activity}
              eventTitle={eventTitle}
              metaDate={metaDate}
              metaLocation={metaLocation}
              djs={djs}
              performances={performances}
              image={image}
              waitlistHref={waitlistHref}
              hideHeader
              initialRemotePlan={initialRemotePlan}
              initialGuideId={initialGuideId}
              initialOrigin={initialOrigin}
              initialEstimate={initialEstimate}
              onPhaseChange={handlePhaseChange}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
