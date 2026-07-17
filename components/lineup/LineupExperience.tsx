"use client";

import type { ScheduleDj, SchedulePerformance } from "../../lib/api";
import type { FestivalFlowDay } from "../../lib/lineup-flow";
import type { LineupChapterVoice } from "../../lib/lineup-voice";
import type { FestivalAtmosphere } from "../../lib/festival-atmosphere";
import type { Locale } from "../../lib/i18n";
import type { FestivalScheduleExportMeta } from "../../lib/lineup-schedule-export";
import { getLineupDiscoveryCopy } from "../../lib/i18n";
import type { LineupGenreGroup } from "./lineup-types";
import { LineupSelectionProvider } from "./LineupSelectionContext";
import { LineupDiscoveryProvider } from "./LineupDiscoveryContext";
import { LineupHeroScene } from "./LineupHeroScene";
import { LineupMapScene, type LineupMapLabels } from "./LineupMapScene";
import { LineupAiDiscoveryScene } from "./LineupAiDiscoveryScene";
import { LineupSelectionBar } from "./LineupSelectionBar";
import {
  LineupSetPlannerCta,
  type LineupSetPlannerLabels,
} from "./LineupSetPlannerCta";
import { LineupConflictCenter } from "./LineupConflictCenter";
import { LineupSavedSchedule, LineupSchedulePersistenceProvider } from './LineupSchedulePersistence';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type LineupExperienceProps = {
  locale: Locale;
  activityLegacyId: number;
  weekend?: "w1" | "w2";
  eventTitle: string;
  atmosphere: FestivalAtmosphere;
  invite?: string;
  image?: string;
  artistCount: number;
  stageCount: number;
  genreCount: number;
  djs: ScheduleDj[];
  showTimetable: boolean;
  flowDays: FestivalFlowDay[];
  genreGroups: LineupGenreGroup[];
  genres: string[];
  stageLabels: string[];
  stagesPublished: boolean;
  performances: SchedulePerformance[];
  scheduleMeta: FestivalScheduleExportMeta;
  schedulePublished: boolean;
  voice: LineupChapterVoice;
  planHref: string;
  subscribeEventProperties: Record<string, string>;
  breadcrumbsAriaLabel: string;
  breadcrumbs: BreadcrumbItem[];
  weekendContext?: {
    label: string;
    story: string;
    switchHref: string;
    switchLabel: string;
  };
  labels: {
    map: LineupMapLabels;
    planner: LineupSetPlannerLabels;
    selection: {
      hint: string;
      count: string;
      clear: string;
    };
    hero: {
      artistsUnit: string;
      stagesUnit: string;
      genresUnit: string;
    };
  };
};

/**
 * Continuous festival chapter:
 * Hero → one journey (sound + selections + timetable) → full lineup → plan.
 * The archive is intentionally quieter than the route through the day.
 */
export function LineupExperience({
  locale,
  activityLegacyId,
  weekend,
  eventTitle,
  atmosphere,
  invite,
  image,
  artistCount,
  stageCount,
  genreCount,
  djs,
  showTimetable,
  flowDays,
  genreGroups,
  genres,
  stageLabels,
  stagesPublished,
  performances,
  scheduleMeta,
  schedulePublished,
  voice,
  planHref,
  subscribeEventProperties,
  breadcrumbsAriaLabel,
  breadcrumbs,
  weekendContext,
  labels,
}: LineupExperienceProps) {
  const copy = getLineupDiscoveryCopy(locale);
  const hasFlow = showTimetable && flowDays.length > 0;

  return (
    <LineupSelectionProvider
      activityLegacyId={activityLegacyId}
      performances={performances}
      schedulePublished={schedulePublished}
      selectionScope={weekend}
    >
      <LineupSchedulePersistenceProvider activityLegacyId={activityLegacyId} selectionScope={weekend}>
      <LineupDiscoveryProvider
        locale={locale}
        activityLegacyId={activityLegacyId}
        weekend={weekend}
        djs={djs}
      >
        <div className="lineup-experience-page" data-atmosphere={atmosphere}>
          <LineupHeroScene
            locale={locale}
            eventTitle={eventTitle}
            atmosphere={atmosphere}
            invite={invite}
            worldPremise={voice.spotlightLead}
            image={image}
            artistCount={artistCount}
            stageCount={stageCount}
            genreCount={genreCount}
            breadcrumbsAriaLabel={breadcrumbsAriaLabel}
            breadcrumbs={breadcrumbs}
            weekendContext={weekendContext}
            labels={labels.hero}
          />

          {hasFlow ? (
            <>
              <LineupSavedSchedule locale={locale} djs={djs} performances={performances} />
              <LineupMapScene
                mode="flow"
                locale={locale}
                flowDays={flowDays}
                genreGroups={genreGroups}
                genres={genres}
                stageLabels={stageLabels}
                stagesPublished={stagesPublished}
                routeIntelligence={voice.routeIntelligence}
                voice={voice}
                labels={{
                  ...labels.map,
                  flowEyebrow: copy.journey.eyebrow,
                  flowTitle: copy.journey.title,
                  flowLead: copy.journey.lead,
                }}
                headingId="lineup-journey-heading"
                journeyDiscovery={{
                  activityLegacyId,
                  weekend,
                  djs,
                  atmosphere,
                }}
              />
            </>
          ) : (
            <>
              <LineupAiDiscoveryScene
                locale={locale}
                activityLegacyId={activityLegacyId}
                weekend={weekend}
                djs={djs}
                atmosphere={atmosphere}
              />
            </>
          )}

          <LineupMapScene
            mode="discovery"
            locale={locale}
            flowDays={[]}
            genreGroups={genreGroups}
            genres={genres}
            stageLabels={stageLabels}
            stagesPublished={stagesPublished}
            voice={voice}
            labels={{
              ...labels.map,
              discoveryEyebrow: copy.full.eyebrow,
              discoveryTitle: copy.full.title,
              discoveryLead: copy.full.lead,
            }}
            headingId="lineup-full-heading"
            progressive
          />

          <LineupSetPlannerCta
            planHref={planHref}
            labels={{
              ...labels.planner,
              eyebrow: copy.journey.continueEyebrow,
              title: copy.journey.continueTitle,
              lead: copy.journey.continueLead,
              cta: copy.journey.cta,
            }}
            subscribeEventProperties={subscribeEventProperties}
          />

          <LineupConflictCenter
            locale={locale}
            atmosphere={atmosphere}
            festivalImage={image}
            djs={djs}
            performances={performances}
            scheduleMeta={scheduleMeta}
            activityLegacyId={activityLegacyId}
          />
          <LineupSelectionBar
            locale={locale}
            hint={labels.selection.hint}
            countLabel={labels.selection.count}
            clearLabel={labels.selection.clear}
          />
        </div>
      </LineupDiscoveryProvider>
      </LineupSchedulePersistenceProvider>
    </LineupSelectionProvider>
  );
}
