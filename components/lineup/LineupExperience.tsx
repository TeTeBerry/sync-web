"use client";

import type { ScheduleDj, SchedulePerformance } from "../../lib/api";
import type { FestivalFlowDay } from "../../lib/lineup-flow";
import type { LineupChapterVoice } from "../../lib/lineup-voice";
import type { FestivalAtmosphere } from "../../lib/festival-atmosphere";
import type { Locale } from "../../lib/i18n";
import { getLineupDiscoveryCopy } from "../../lib/i18n";
import type { LineupGenreGroup } from "./lineup-types";
import { LineupSelectionBar } from "./LineupSelectionBar";
import { LineupSelectionProvider } from "./LineupSelectionContext";
import { LineupDiscoveryProvider } from "./LineupDiscoveryContext";
import { LineupHeroScene } from "./LineupHeroScene";
import { LineupAiDiscoveryScene } from "./LineupAiDiscoveryScene";
import { ArtistConstellationScene } from "./ArtistConstellationScene";
import { LineupMapScene, type LineupMapLabels } from "./LineupMapScene";
import {
  LineupSetPlannerCta,
  type LineupSetPlannerLabels,
} from "./LineupSetPlannerCta";
import { LineupClashToast } from "./LineupClashToast";
import { LineupConflictCenter } from "./LineupConflictCenter";

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
 * Hero → Paths (doorway fused) → Sound Universe → Tonight’s Journey
 * → Full Lineup (progressive) → Continue the night
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
            image={image}
            artistCount={artistCount}
            stageCount={stageCount}
            genreCount={genreCount}
            breadcrumbsAriaLabel={breadcrumbsAriaLabel}
            breadcrumbs={breadcrumbs}
            weekendContext={weekendContext}
            labels={labels.hero}
          />

          <LineupAiDiscoveryScene
            locale={locale}
            activityLegacyId={activityLegacyId}
            weekend={weekend}
            djs={djs}
          />

          <div className="container lineup-experience-page__selection lineup-experience-page__selection--after-paths">
            <LineupSelectionBar
              locale={locale}
              hint={labels.selection.hint}
              countLabel={labels.selection.count}
              clearLabel={labels.selection.clear}
            />
          </div>

          <ArtistConstellationScene
            locale={locale}
            activityLegacyId={activityLegacyId}
            weekend={weekend}
          />

          {hasFlow ? (
            <LineupMapScene
              mode="flow"
              locale={locale}
              flowDays={flowDays}
              genreGroups={genreGroups}
              genres={genres}
              stageLabels={stageLabels}
              stagesPublished={stagesPublished}
              routeIntelligence={voice.routeIntelligence}
              voice={{
                flowTitle: copy.journey.title,
                flowLead: copy.journey.lead,
                discoveryTitle: copy.full.title,
                discoveryLead: copy.full.lead,
              }}
              labels={{
                ...labels.map,
                flowEyebrow: copy.journey.eyebrow,
                flowTitle: copy.journey.title,
                flowLead: copy.journey.lead,
              }}
              headingId="lineup-journey-heading"
            />
          ) : null}

          <LineupMapScene
            mode="discovery"
            locale={locale}
            flowDays={[]}
            genreGroups={genreGroups}
            genres={genres}
            stageLabels={stageLabels}
            stagesPublished={stagesPublished}
            voice={{
              flowTitle: copy.journey.title,
              flowLead: copy.journey.lead,
              discoveryTitle: copy.full.title,
              discoveryLead: copy.full.lead,
            }}
            labels={{
              ...labels.map,
              discoveryEyebrow: copy.full.eyebrow,
              discoveryTitle: copy.full.title,
              discoveryLead: copy.full.lead,
            }}
            headingId="lineup-full-heading"
            showDiscoveryLabels
            scheduleAware
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

          <LineupClashToast locale={locale} />
          <LineupConflictCenter
            locale={locale}
            atmosphere={atmosphere}
            festivalImage={image}
          />
        </div>
      </LineupDiscoveryProvider>
    </LineupSelectionProvider>
  );
}
