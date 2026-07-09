'use client';

import { useState, type CSSProperties } from 'react';
import type { FestivalFlowDay, FestivalFlowStop } from '../../lib/lineup-flow';
import type { Locale } from '../../lib/i18n';
import type { ScheduleDj } from '../../lib/api';
import { resolveLineupStageLabel } from '../../lib/lineup-display';
import type { LineupGenreGroup } from './lineup-types';
import { SelectableArtistName } from './SelectableArtistName';
import { useLineupSelection } from './LineupSelectionContext';
import { timetableSlotSelectionId } from '../../lib/lineup-selection';
import { MISSING_GENRE_LABEL } from '../../lib/lineup-genre';
import { formatLineupTimeRange } from '../../lib/lineup-timetable';

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
};

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
}: {
  stop: FestivalFlowStop;
  showWhy?: boolean;
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
          stop.genreLabel && stop.genreLabel !== MISSING_GENRE_LABEL
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
}: {
  genreLabel: string;
  color: string;
  djs: LineupGenreGroup['djs'];
  locale: Locale;
  stagesPublished: boolean;
  labels: LineupMapLabels;
}) {
  const [open, setOpen] = useState(false);
  const preview = djs.slice(0, DISCOVERY_PREVIEW);
  const rest = djs.slice(DISCOVERY_PREVIEW);
  const visible = open ? djs : preview;

  return (
    <div
      className="lineup-map__cast-chapter"
      style={{ '--genre-accent': color } as CSSProperties}
    >
      <h3 className="lineup-map__cast-title">{genreLabel}</h3>
      <ul className="lineup-map__cast-names">
        {visible.map((dj) => (
          <li key={dj.id}>
            <SelectableArtistName
              id={dj.id}
              name={dj.name}
              accent={color}
              meta={discoveryStageMeta(locale, dj, stagesPublished)}
            />
          </li>
        ))}
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
}: LineupMapSceneProps) {
  const isFlow = mode === 'flow';
  const title = isFlow
    ? voice?.flowTitle ?? labels.flowTitle
    : voice?.discoveryTitle ?? labels.discoveryTitle;
  const lead = isFlow
    ? voice?.flowLead ?? labels.flowLead
    : voice?.discoveryLead ?? labels.discoveryLead;

  return (
    <section
      className={`lineup-scene lineup-map lineup-map--${mode}`}
      aria-labelledby="lineup-map-heading"
      data-reveal
      style={{ '--reveal-delay': '0.08s' } as CSSProperties}
    >
      <div className="container">
        <header className="lineup-scene__header">
          <p className="lineup-scene__eyebrow">
            {isFlow ? labels.flowEyebrow : labels.discoveryEyebrow}
          </p>
          <h2 id="lineup-map-heading" className="lineup-scene__title">
            {title}
          </h2>
          <p className="lineup-scene__lead">{lead}</p>
          {isFlow && routeIntelligence ? (
            <p className="lineup-map__intelligence">{routeIntelligence}</p>
          ) : null}
        </header>

        {isFlow ? (
          <div className="lineup-map__flow">
            {flowDays.map((day) => (
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
                    <h4 className="lineup-flow__chapter-title">{labels.peaksLabel}</h4>
                    <ol className="lineup-flow__list">
                      {day.peaks.map((stop) => (
                        <li key={`peak-${stop.artistId}-${stop.startMinutes}`}>
                          <FlowStopRow stop={stop} showWhy />
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {day.route.length ? (
                  <div className="lineup-flow__chapter">
                    <h4 className="lineup-flow__chapter-title">{labels.routeLabel}</h4>
                    <ol className="lineup-flow__route">
                      {day.route.map((stop, index) => (
                        <li key={`route-${stop.artistId}-${stop.startMinutes}`}>
                          <span className="lineup-flow__step" aria-hidden="true">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <FlowStopRow stop={stop} showWhy />
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {day.stages.length ? (
                  <details className="lineup-flow__stages">
                    <summary>
                      <span className="lineup-flow__stages-open">{labels.expandStages}</span>
                      <span className="lineup-flow__stages-close">{labels.collapseStages}</span>
                      {stageLabels.length ? (
                        <span className="lineup-flow__stages-meta">
                          {stageLabels.join(' · ')}
                        </span>
                      ) : null}
                    </summary>
                    <div className="lineup-flow__stage-list">
                      {day.stages.map((stage) => (
                        <div className="lineup-flow__stage" key={stage.stageKey}>
                          <h5 className="lineup-flow__stage-title">{stage.stageLabel}</h5>
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
            ))}
          </div>
        ) : (
          <div className="lineup-map__discovery">
            {genres.length > 0 ? (
              <p className="lineup-map__signal">
                <span>{labels.soundMap}</span>
                {genres.slice(0, 6).join(' · ')}
              </p>
            ) : null}

            <div className="lineup-map__cast">
              {genreGroups.map(({ genreLabel, color, djs }) => (
                <DiscoveryChapter
                  key={genreLabel}
                  genreLabel={genreLabel}
                  color={color}
                  djs={djs}
                  locale={locale}
                  stagesPublished={stagesPublished}
                  labels={labels}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
