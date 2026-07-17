'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import type { FestivalFlowDay, FestivalFlowStop } from '../../lib/lineup-flow';
import type { Locale } from '../../lib/i18n';
import type { ScheduleDj } from '../../lib/api';
import type { FestivalAtmosphere } from '../../lib/festival-atmosphere';
import { resolveLineupStageLabel } from '../../lib/lineup-display';
import type { LineupGenreGroup } from './lineup-types';
import { SelectableArtistName } from './SelectableArtistName';
import { useLineupSelection } from './LineupSelectionContext';
import { useLineupDiscovery } from './LineupDiscoveryContext';
import { timetableSlotSelectionId } from '../../lib/lineup-selection';
import { formatLineupTimeRange } from '../../lib/lineup-timetable';
import { isGenrePlaceholder } from '../../lib/lineup-display';
import {
  artistDiscoveryLabel,
  discoveryLabelText,
  moodExplorationCopy,
} from '../../lib/lineup-discovery';
import { trackLineupDiscovery } from '../../lib/lineup-analytics';
import { getLineupClashCopy } from '../../lib/lineup-clash-copy';
import { LineupScheduleBadge } from './LineupScheduleBadge';
import { LineupAiDiscoveryScene } from './LineupAiDiscoveryScene';

export type LineupMapLabels = {
  flowEyebrow: string;
  flowTitle: string;
  flowLead: string;
  discoveryEyebrow: string;
  discoveryTitle: string;
  discoveryLead: string;
  peaksLabel: string;
  routeLabel: string;
  stagesLabel: string;
  soundMap: string;
  expandStages: string;
  collapseStages: string;
  expandCast: string;
  collapseCast: string;
  moreArtists: string;
};

type LineupMapSceneProps = {
  mode: 'flow' | 'discovery';
  locale: Locale;
  flowDays: FestivalFlowDay[];
  genreGroups: LineupGenreGroup[];
  genres: string[];
  stageLabels: string[];
  /** When false, never show stage meta — even if raw DJ fields contain fallbacks. */
  stagesPublished: boolean;
  routeIntelligence?: string;
  /** Festival-shaped titles override shared i18n when present */
  voice?: {
    flowTitle?: string;
    flowLead?: string;
    discoveryTitle?: string;
    discoveryLead?: string;
  };
  labels: LineupMapLabels;
  headingId?: string;
  showDiscoveryLabels?: boolean;
  scheduleAware?: boolean;
  /** Full lineup starts quiet — open the archive on demand. */
  progressive?: boolean;
  /** The compact discovery entrance is part of the journey when schedule data exists. */
  journeyDiscovery?: {
    activityLegacyId: number;
    weekend?: 'w1' | 'w2';
    djs: ScheduleDj[];
    atmosphere?: FestivalAtmosphere;
  };
};

function routeThroughDoorway(
  day: FestivalFlowDay,
  artistIds: Set<string>,
  locale: Locale,
): FestivalFlowStop[] {
  if (!artistIds.size) return day.route;
  const seen = new Set<string>();
  const stops = day.stages
    .flatMap((stage) =>
      stage.slots
        .filter((slot) => artistIds.has(slot.artistId))
        .map((slot) => ({
          artistId: slot.artistId,
          artistName: slot.artistName,
          stageLabel: stage.stageLabel,
          genreLabel: slot.genreLabel,
          genreColor: slot.genreColor,
          startTime: slot.startTime,
          endTime: slot.endTime,
          startMinutes: slot.startMinutes,
          timeLabel: formatLineupTimeRange(slot.startTime, slot.endTime),
          role: 'rise' as const,
          why:
            locale === 'zh'
              ? `这扇门把你带向 ${stage.stageLabel}。`
              : `This doorway pulls you toward ${stage.stageLabel}.`,
        })),
    )
    .sort((a, b) => a.startMinutes - b.startMinutes)
    .filter((stop) => {
      const key = `${stop.artistId}-${stop.startMinutes}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);

  return stops.length ? stops : day.route;
}

function discoveryStageMeta(
  locale: Locale,
  dj: ScheduleDj,
  stagesPublished: boolean,
): string | undefined {
  return resolveLineupStageLabel(
    locale,
    { stage: dj.stage, stageLabel: dj.stageLabel },
    { stagesPublished },
  );
}

const DISCOVERY_PREVIEW = 6;

function FlowStopRow({
  stop,
  showWhy,
  doorway,
}: {
  stop: FestivalFlowStop;
  showWhy?: boolean;
  /** The selected doorway changes which moments feel like the night's pull. */
  doorway?: boolean;
}) {
  const { isSelected, toggle } = useLineupSelection();
  const selectionId = timetableSlotSelectionId(stop.artistId, stop.startMinutes);
  const selected = isSelected(selectionId);

  return (
    <button
      type="button"
      className={[
        'lineup-flow__stop',
        `lineup-flow__stop--${stop.role}`,
        selected ? 'is-selected' : '',
        doorway ? 'is-doorway' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        stop.genreColor
          ? ({ '--artist-accent': stop.genreColor } as CSSProperties)
          : undefined
      }
      aria-pressed={selected}
      onClick={() => toggle(selectionId)}
    >
      <time className="lineup-flow__time" dateTime={stop.startTime}>
        {stop.timeLabel}
      </time>
      <span className="lineup-flow__artist">{stop.artistName}</span>
      <span className="lineup-flow__place">
        {[
          stop.stageLabel,
          stop.genreLabel && !isGenrePlaceholder(stop.genreLabel)
            ? stop.genreLabel
            : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
      {showWhy && stop.why ? (
        <span className="lineup-flow__why">
          {stop.why}
          {stop.tradeoff ? ` ${stop.tradeoff}` : ''}
        </span>
      ) : null}
    </button>
  );
}

function DiscoveryChapter({
  genreLabel,
  color,
  djs,
  locale,
  stagesPublished,
  labels,
  showDiscoveryLabels,
  scheduleFilter,
  showScheduleStatus = false,
}: {
  genreLabel: string;
  color: string;
  djs: LineupGenreGroup['djs'];
  locale: Locale;
  stagesPublished: boolean;
  labels: LineupMapLabels;
  showDiscoveryLabels?: boolean;
  scheduleFilter: 'all' | 'fits' | 'conflicts' | 'pending';
  showScheduleStatus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { bundle } = useLineupDiscovery();
  const { scheduleStatusFor } = useLineupSelection();

  const filtered = djs.filter((dj) => {
    if (scheduleFilter === 'all') return true;
    const status = scheduleStatusFor(dj.id);
    if (scheduleFilter === 'fits') return status === 'fits-route';
    if (scheduleFilter === 'pending') return status === 'schedule-pending';
    return (
      status === 'hard-clash' ||
      status === 'partial-clash' ||
      status === 'tight-transfer'
    );
  });

  const preview = filtered.slice(0, DISCOVERY_PREVIEW);
  const rest = filtered.slice(DISCOVERY_PREVIEW);
  const visible = open ? filtered : preview;

  if (!filtered.length) return null;

  return (
    <div
      className="lineup-map__cast-chapter"
      style={{ '--genre-accent': color } as CSSProperties}
    >
      <h3 className="lineup-map__cast-title">{genreLabel}</h3>
      <ul className="lineup-map__cast-names">
        {visible.map((dj) => {
          const discovery = showDiscoveryLabels
            ? artistDiscoveryLabel(dj.id, bundle)
            : null;
          const status = scheduleStatusFor(dj.id);
          return (
            <li key={dj.id} id={`lineup-artist-${dj.id}`}>
              <SelectableArtistName
                id={dj.id}
                name={dj.name}
                accent={color}
                meta={discoveryStageMeta(locale, dj, stagesPublished)}
              />
              {showScheduleStatus ? (
                <LineupScheduleBadge locale={locale} status={status} />
              ) : null}
              {discovery ? (
                <span
                  className="lineup-map__discovery-tag"
                  onClick={() =>
                    trackLineupDiscovery('full_lineup_discovery_label_used', {
                      artist: dj.id,
                      label: discovery,
                    })
                  }
                >
                  {discoveryLabelText(discovery, locale)}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      {rest.length > 0 ? (
        <button
          type="button"
          className="lineup-map__cast-more"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open
            ? labels.collapseCast
            : labels.moreArtists.replace('{count}', String(rest.length))}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Scene 5 — same Raven chapter, adaptive depth:
 * Flow = arc narrative + peaks + route + deferred stages
 * Discovery = progressive sound chapters (not a full roster dump)
 */
export function LineupMapScene({
  mode,
  locale,
  flowDays,
  genreGroups,
  genres,
  stageLabels,
  stagesPublished,
  routeIntelligence,
  voice,
  labels,
  headingId = 'lineup-map-heading',
  showDiscoveryLabels = false,
  scheduleAware = false,
  progressive = false,
  journeyDiscovery,
}: LineupMapSceneProps) {
  const isFlow = mode === 'flow';
  const title = isFlow
    ? voice?.flowTitle ?? labels.flowTitle
    : voice?.discoveryTitle ?? labels.discoveryTitle;
  const lead = isFlow
    ? voice?.flowLead ?? labels.flowLead
    : voice?.discoveryLead ?? labels.discoveryLead;
  const clashCopy = getLineupClashCopy(locale);
  const { bundle, mood } = useLineupDiscovery();
  const [scheduleFilter, setScheduleFilter] = useState<
    'all' | 'fits' | 'conflicts' | 'pending'
  >('all');
  const [scheduleLensOpen, setScheduleLensOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(!progressive);
  const previewGroups = progressive ? genreGroups.slice(0, 1) : genreGroups;
  const archiveGroups = progressive ? genreGroups.slice(1) : [];
  const doorwayArtistIds = useMemo(
    () =>
      new Set(
        mood
          ? [
              ...bundle.picked,
              ...bundle.discoveries,
              ...(bundle.wildcard ? [bundle.wildcard] : []),
            ].map((artist) => artist.id)
          : [],
      ),
    [bundle, mood],
  );

  const discoveryBody = (
    <div className="lineup-map__discovery">
      {genres.length > 0 ? (
        <p className="lineup-map__signal">
          <span>{labels.soundMap}</span>
          {genres.slice(0, 6).join(' · ')}
        </p>
      ) : null}

      {scheduleAware && archiveOpen && scheduleLensOpen ? (
        <div
          className="lineup-map__schedule-filters"
          role="group"
          aria-label={clashCopy.myLineup}
        >
          {(
            [
              ['all', clashCopy.filterAll],
              ['fits', clashCopy.filterFits],
              ['conflicts', clashCopy.filterConflicts],
              ['pending', clashCopy.filterPending],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={scheduleFilter === key ? 'is-active' : ''}
              aria-pressed={scheduleFilter === key}
              onClick={() => setScheduleFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : scheduleAware && archiveOpen ? (
        <p className="lineup-map__schedule-whisper">
          <button
            type="button"
            onClick={() => {
              setScheduleLensOpen(true);
              setScheduleFilter('conflicts');
            }}
          >
            {locale === 'zh' ? '先看需要拍板的名字' : 'See names that need a choice'}
          </button>
        </p>
      ) : null}

      <div className="lineup-map__cast">
        {(archiveOpen ? genreGroups : previewGroups).map(
          ({ genreLabel, color, djs }) => (
            <DiscoveryChapter
              key={genreLabel}
              genreLabel={genreLabel}
              color={color}
              djs={djs}
              locale={locale}
              stagesPublished={stagesPublished}
              labels={labels}
              showDiscoveryLabels={showDiscoveryLabels && archiveOpen}
              showScheduleStatus={scheduleAware && archiveOpen}
              scheduleFilter={
                scheduleAware && archiveOpen ? scheduleFilter : 'all'
              }
            />
          ),
        )}
      </div>

      {progressive && !archiveOpen && archiveGroups.length > 0 ? (
        <button
          type="button"
          className="lineup-map__open-archive"
          onClick={() => setArchiveOpen(true)}
        >
          {locale === 'zh'
            ? `展开完整阵容 · 还有 ${archiveGroups.length} 个声音章节`
            : `Open the full archive · ${archiveGroups.length} more sound chapters`}
        </button>
      ) : null}
    </div>
  );

  return (
    <section
      className={`lineup-scene lineup-map lineup-map--${mode}${progressive ? ' lineup-map--progressive' : ''}${isFlow ? ' lineup-map--cinematic' : ''}`}
      aria-labelledby={headingId}
      data-reveal
      style={{ '--reveal-delay': '0.08s' } as CSSProperties}
    >
      <div className="container">
        <header
          className={
            isFlow ? 'lineup-map__night-header' : 'lineup-scene__header'
          }
        >
          {isFlow ? null : (
            <p className="lineup-scene__eyebrow">{labels.discoveryEyebrow}</p>
          )}
          <h2
            id={headingId}
            className={isFlow ? 'lineup-map__night-title' : 'lineup-scene__title'}
          >
            {title}
          </h2>
          <p
            className={isFlow ? 'lineup-map__night-lead' : 'lineup-scene__lead'}
          >
            {lead}
          </p>
          {isFlow && routeIntelligence ? (
            <p className="lineup-map__intelligence">{routeIntelligence}</p>
          ) : null}
          {isFlow && mood ? (
            <p className="lineup-map__night-whisper">
              {moodExplorationCopy(mood, locale)}
            </p>
          ) : null}
        </header>

        {isFlow ? (
          <div className="lineup-map__journey-body">
            {journeyDiscovery ? (
              <LineupAiDiscoveryScene
                locale={locale}
                activityLegacyId={journeyDiscovery.activityLegacyId}
                weekend={journeyDiscovery.weekend}
                djs={journeyDiscovery.djs}
                atmosphere={journeyDiscovery.atmosphere}
                variant="journey"
              />
            ) : null}
            <div className="lineup-map__flow">
            {flowDays.map((day) => {
              const doorwayRoute = routeThroughDoorway(
                day,
                doorwayArtistIds,
                locale,
              );
              const followsDoorway = Boolean(mood && doorwayRoute !== day.route);
              return (
              <article className="lineup-flow__day" key={day.dateKey}>
                <header className="lineup-flow__day-header">
                  <p className="lineup-flow__day-eyebrow">{day.label}</p>
                  <h3 className="lineup-flow__day-title">
                    {day.bannerDateLabel || day.label}
                  </h3>
                  {day.arcLead ? (
                    <p className="lineup-flow__arc">{day.arcLead}</p>
                  ) : null}
                </header>

                {day.peaks.length ? (
                  <div className="lineup-flow__chapter">
                    <h4 className="lineup-flow__chapter-title">
                      {labels.peaksLabel}
                    </h4>
                    <ol className="lineup-flow__list">
                      {day.peaks.map((stop) => (
                        <li key={`peak-${stop.artistId}-${stop.startMinutes}`}>
                          <FlowStopRow
                            stop={stop}
                            showWhy
                            doorway={doorwayArtistIds.has(stop.artistId)}
                          />
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {doorwayRoute.length ? (
                  <div className="lineup-flow__chapter lineup-flow__chapter--route">
                    <h4 className="lineup-flow__chapter-title">
                      {followsDoorway
                        ? locale === 'zh'
                          ? '从这扇门走下去'
                          : 'Follow this doorway'
                        : labels.routeLabel}
                    </h4>
                    <ol className="lineup-flow__route">
                      {doorwayRoute.map((stop, index) => (
                        <li key={`route-${stop.artistId}-${stop.startMinutes}`}>
                          <span className="lineup-flow__step" aria-hidden="true">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <FlowStopRow
                            stop={stop}
                            showWhy
                            doorway={doorwayArtistIds.has(stop.artistId)}
                          />
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {day.stages.length ? (
                  <details className="lineup-flow__stages">
                    <summary>
                      <span className="lineup-flow__stages-open">
                        {labels.expandStages}
                      </span>
                      <span className="lineup-flow__stages-close">
                        {labels.collapseStages}
                      </span>
                      {stageLabels.length ? (
                        <span className="lineup-flow__stages-meta">
                          {stageLabels.join(' · ')}
                        </span>
                      ) : null}
                    </summary>
                    <div className="lineup-flow__stage-list">
                      {day.stages.map((stage) => (
                        <div className="lineup-flow__stage" key={stage.stageKey}>
                          <h5 className="lineup-flow__stage-title">
                            {stage.stageLabel}
                          </h5>
                          <ol className="lineup-flow__list">
                            {stage.slots.map((slot) => (
                              <li key={`${slot.artistId}-${slot.startMinutes}`}>
                                <FlowStopRow
                                  stop={{
                                    artistId: slot.artistId,
                                    artistName: slot.artistName,
                                    stageLabel: stage.stageLabel,
                                    genreLabel: slot.genreLabel,
                                    genreColor: slot.genreColor,
                                    startTime: slot.startTime,
                                    endTime: slot.endTime,
                                    startMinutes: slot.startMinutes,
                                    timeLabel: formatLineupTimeRange(
                                      slot.startTime,
                                      slot.endTime,
                                    ),
                                    role: 'rise',
                                    why: '',
                                  }}
                                  doorway={doorwayArtistIds.has(slot.artistId)}
                                />
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </article>
              );
            })}
            </div>
          </div>
        ) : (
          discoveryBody
        )}
      </div>
    </section>
  );
}
