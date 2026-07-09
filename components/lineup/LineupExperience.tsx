'use client';

import type { FeaturedArtist } from '../../lib/lineup-preview';
import type { FestivalFlowDay } from '../../lib/lineup-flow';
import type { LineupChapterVoice } from '../../lib/lineup-voice';
import type { Locale } from '../../lib/i18n';
import type { LineupGenreGroup } from './lineup-types';
import { LineupGenreScene, type LineupGenreLabels } from './LineupGenreScene';
import { LineupMapScene, type LineupMapLabels } from './LineupMapScene';
import { LineupSelectionBar } from './LineupSelectionBar';
import { LineupSelectionProvider } from './LineupSelectionContext';
import { LineupSetPlannerCta, type LineupSetPlannerLabels } from './LineupSetPlannerCta';
import { LineupSpotlightScene, type LineupSpotlightLabels } from './LineupSpotlightScene';

type LineupExperienceProps = {
  locale: Locale;
  activityLegacyId: number;
  showTimetable: boolean;
  flowDays: FestivalFlowDay[];
  genreGroups: LineupGenreGroup[];
  featuredArtists: FeaturedArtist[];
  genres: string[];
  stageLabels: string[];
  stagesPublished: boolean;
  soundLine?: string;
  voice: LineupChapterVoice;
  planHref: string;
  subscribeEventProperties: Record<string, string>;
  labels: {
    spotlight: LineupSpotlightLabels;
    genres: LineupGenreLabels;
    map: LineupMapLabels;
    planner: LineupSetPlannerLabels;
    selection: {
      hint: string;
      count: string;
      clear: string;
    };
  };
};

/**
 * One Raven Lineup Experience framework.
 * Festival Flow when timetable exists; Artist Discovery otherwise.
 * Same chapter — adaptive depth + festival-shaped voice.
 */
export function LineupExperience({
  locale,
  activityLegacyId,
  showTimetable,
  flowDays,
  genreGroups,
  featuredArtists,
  genres,
  stageLabels,
  stagesPublished,
  soundLine,
  voice,
  planHref,
  subscribeEventProperties,
  labels,
}: LineupExperienceProps) {
  const mapMode = showTimetable && flowDays.length > 0 ? 'flow' : 'discovery';

  return (
    <LineupSelectionProvider activityLegacyId={activityLegacyId}>
      <div className="lineup-experience-page">
        <div className="container lineup-experience-page__selection">
          <LineupSelectionBar
            hint={labels.selection.hint}
            countLabel={labels.selection.count}
            clearLabel={labels.selection.clear}
          />
        </div>

        <LineupSpotlightScene
          artists={featuredArtists}
          soundLine={soundLine}
          title={voice.spotlightTitle}
          lead={voice.spotlightLead}
          labels={labels.spotlight}
        />

        <LineupGenreScene
          groups={genreGroups}
          labels={labels.genres}
          title={voice.genreTitle}
          lead={voice.genreLead}
          namesPerLane={3}
          maxLanes={3}
        />

        <LineupMapScene
          mode={mapMode}
          locale={locale}
          flowDays={flowDays}
          genreGroups={genreGroups}
          genres={genres}
          stageLabels={stageLabels}
          stagesPublished={stagesPublished}
          routeIntelligence={mapMode === 'flow' ? voice.routeIntelligence : undefined}
          voice={{
            flowTitle: voice.flowTitle,
            flowLead: voice.flowLead,
            discoveryTitle: voice.discoveryTitle,
            discoveryLead: voice.discoveryLead,
          }}
          labels={labels.map}
        />

        <LineupSetPlannerCta
          planHref={planHref}
          labels={labels.planner}
          subscribeEventProperties={subscribeEventProperties}
        />
      </div>
    </LineupSelectionProvider>
  );
}
