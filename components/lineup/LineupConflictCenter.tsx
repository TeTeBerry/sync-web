'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ClashResolutionOption, LineupConflict } from '../../lib/lineup-clash';
import { artistIdFromSelection } from '../../lib/lineup-clash';
import {
  conflictReasonText,
  formatClashTemplate,
  getLineupClashCopy,
  optionLabel,
} from '../../lib/lineup-clash-copy';
import type { FestivalAtmosphere } from '../../lib/festival-atmosphere';
import type { Locale } from '../../lib/i18n';
import { useLineupDiscovery } from './LineupDiscoveryContext';
import { useLineupSelection } from './LineupSelectionContext';

type LineupConflictCenterProps = {
  locale: Locale;
  atmosphere?: FestivalAtmosphere;
  festivalImage?: string;
};

type NightPhase = 'dusk' | 'peak' | 'late' | 'open';

function isActionable(conflict: LineupConflict) {
  return conflict.type !== 'schedule-pending';
}

function nightPhaseFromMinutes(startMinutes?: number): NightPhase {
  if (startMinutes == null || Number.isNaN(startMinutes)) return 'open';
  const hour = ((startMinutes % (24 * 60)) + 24 * 60) % (24 * 60) / 60;
  if (hour >= 16 && hour < 20) return 'dusk';
  if (hour >= 20 || hour < 1) return 'peak';
  return 'late';
}

/**
 * Tonight’s route — enter the night as a chapter, walk the path, settle one choice.
 */
export function LineupConflictCenter({
  locale,
  atmosphere,
  festivalImage,
}: LineupConflictCenterProps) {
  const {
    conflictCenterOpen,
    closeConflictCenter,
    conflicts,
    focusConflictId,
    resolveConflict,
    ids,
    removeArtist,
    scheduleStatusFor,
    slotForArtist,
  } = useLineupSelection();
  const { bundle } = useLineupDiscovery();
  const copy = getLineupClashCopy(locale);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [editingRoute, setEditingRoute] = useState(false);
  const [decisionCursor, setDecisionCursor] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const routeArtists = useMemo(() => {
    const discoveryNames = new Map<string, string>();
    for (const artist of [
      ...bundle.picked,
      ...bundle.discoveries,
      ...(bundle.wildcard ? [bundle.wildcard] : []),
    ]) {
      discoveryNames.set(artist.id, artist.name);
    }
    for (const conflict of conflicts) {
      discoveryNames.set(conflict.artistAId, conflict.artistAName);
      discoveryNames.set(conflict.artistBId, conflict.artistBName);
    }

    const steps = ids.map((rawId, index) => {
      const artistId = artistIdFromSelection(rawId);
      const slot = slotForArtist(artistId);
      return {
        id: artistId,
        name: slot?.artistName || discoveryNames.get(artistId) || artistId,
        status: scheduleStatusFor(artistId),
        startTime: slot?.startTime,
        stageLabel: slot?.stageLabel,
        startMinutes: slot?.startMinutes,
        phase: nightPhaseFromMinutes(slot?.startMinutes),
        orderFallback: index,
      };
    });

    return steps.sort((a, b) => {
      if (a.startMinutes != null && b.startMinutes != null) {
        return a.startMinutes - b.startMinutes;
      }
      if (a.startMinutes != null) return -1;
      if (b.startMinutes != null) return 1;
      return a.orderFallback - b.orderFallback;
    });
  }, [bundle, conflicts, ids, scheduleStatusFor, slotForArtist]);

  const actionable = useMemo(
    () => conflicts.filter(isActionable),
    [conflicts],
  );

  const pendingCount = conflicts.length - actionable.length;

  const orderedDecisions = useMemo(() => {
    if (!focusConflictId) return actionable;
    const focused = actionable.find((item) => item.id === focusConflictId);
    if (!focused) return actionable;
    return [focused, ...actionable.filter((item) => item.id !== focusConflictId)];
  }, [actionable, focusConflictId]);

  const activeDecision =
    orderedDecisions[
      Math.min(decisionCursor, Math.max(orderedDecisions.length - 1, 0))
    ] ?? null;
  const remainingAfter = Math.max(
    orderedDecisions.length - (activeDecision ? 1 : 0) - decisionCursor,
    0,
  );

  useEffect(() => {
    if (!conflictCenterOpen) return;
    setEditingRoute(false);
    setDecisionCursor(0);
    setSelectedOptionId(null);
    setDetailsOpen(false);
  }, [conflictCenterOpen, focusConflictId]);

  useEffect(() => {
    if (!activeDecision) {
      setSelectedOptionId(null);
      return;
    }
    setSelectedOptionId(
      activeDecision.suggestedOptionId ??
        activeDecision.resolutionOptions[0]?.id ??
        null,
    );
    setDetailsOpen(false);
  }, [activeDecision]);

  useEffect(() => {
    if (!conflictCenterOpen) return;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeConflictCenter();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeConflictCenter, conflictCenterOpen]);

  if (!conflictCenterOpen) return null;

  const hasDecision = Boolean(activeDecision);
  const title = hasDecision ? copy.centerTitle : copy.myLineup;
  const lead = hasDecision
    ? copy.centerLead
    : routeArtists.length
      ? copy.nightHolding
      : copy.routeEmpty;

  return (
    <div
      className="lineup-route-sheet"
      role="presentation"
      data-mode={hasDecision ? 'decide' : 'calm'}
      data-atmosphere={atmosphere}
    >
      <button
        type="button"
        className="lineup-route-sheet__backdrop"
        aria-label={copy.close}
        onClick={closeConflictCenter}
      />
      <div
        ref={dialogRef}
        className="lineup-route-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {festivalImage ? (
          <div
            className="lineup-route-sheet__world"
            style={{ backgroundImage: `url(${festivalImage})` }}
            aria-hidden="true"
          />
        ) : (
          <div className="lineup-route-sheet__world lineup-route-sheet__world--pure" aria-hidden="true" />
        )}
        <div className="lineup-route-sheet__veil" aria-hidden="true" />

        <div className="lineup-route-sheet__content">
          <header className="lineup-route-sheet__header">
            <h2 id={titleId} className="lineup-route-sheet__title">
              {title}
            </h2>
            <p className="lineup-route-sheet__lead">{lead}</p>
            <button
              type="button"
              className="lineup-route-sheet__close"
              onClick={closeConflictCenter}
              aria-label={copy.close}
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>

          {routeArtists.length ? (
            <section
              className={`lineup-route-sheet__route${hasDecision ? ' is-quiet' : ''}`}
              aria-label={copy.myLineup}
            >
              <ol className="lineup-route-sheet__path">
                {routeArtists.map((artist, index) => {
                  const tense =
                    artist.status === 'hard-clash' ||
                    artist.status === 'partial-clash' ||
                    artist.status === 'tight-transfer';
                  const showPhase =
                    index === 0 ||
                    artist.phase !== routeArtists[index - 1]?.phase;
                  return (
                    <li
                      key={artist.id}
                      className={`lineup-route-sheet__step${tense ? ' is-tense' : ''}`}
                      data-phase={artist.phase}
                    >
                      {showPhase && artist.phase !== 'open' ? (
                        <p className="lineup-route-sheet__phase">
                          {copy.nightPhases[artist.phase]}
                        </p>
                      ) : null}
                      <div className="lineup-route-sheet__beat">
                        <span className="lineup-route-sheet__artist">
                          {artist.name}
                        </span>
                        {artist.startTime || artist.stageLabel ? (
                          <span className="lineup-route-sheet__when">
                            {[artist.startTime, artist.stageLabel]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        ) : null}
                      </div>
                      {editingRoute ? (
                        <button
                          type="button"
                          className="lineup-route-sheet__remove"
                          onClick={() => removeArtist(artist.id)}
                        >
                          {copy.removeFromRoute}
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
              {!hasDecision ? (
                <div className="lineup-route-sheet__route-tools">
                  <button
                    type="button"
                    className="lineup-route-sheet__edit"
                    aria-pressed={editingRoute}
                    onClick={() => setEditingRoute((value) => !value)}
                  >
                    {editingRoute ? copy.doneEditingRoute : copy.editRoute}
                  </button>
                </div>
              ) : null}
            </section>
          ) : (
            <p className="lineup-route-sheet__empty">{copy.routeEmpty}</p>
          )}

          {activeDecision ? (
            <section className="lineup-route-sheet__moment" aria-live="polite">
              <ConflictDecision
                conflict={activeDecision}
                locale={locale}
                selectedId={selectedOptionId ?? undefined}
                detailsOpen={detailsOpen}
                onToggleDetails={() => setDetailsOpen((value) => !value)}
                onSelect={setSelectedOptionId}
                onConfirm={(option) => {
                  resolveConflict(activeDecision, option);
                  setDecisionCursor(0);
                }}
              />
              {remainingAfter > 0 ? (
                <p className="lineup-route-sheet__more">
                  {formatClashTemplate(copy.remainingMoments, {
                    count: remainingAfter,
                  })}
                  <button
                    type="button"
                    className="lineup-route-sheet__skip"
                    onClick={() =>
                      setDecisionCursor((value) =>
                        Math.min(value + 1, orderedDecisions.length - 1),
                      )
                    }
                  >
                    {copy.nextMoment}
                  </button>
                </p>
              ) : null}
            </section>
          ) : pendingCount > 0 ? (
            <p className="lineup-route-sheet__pending-note">
              {formatClashTemplate(copy.routePending, { count: pendingCount })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ConflictDecision({
  conflict,
  locale,
  selectedId,
  detailsOpen,
  onToggleDetails,
  onSelect,
  onConfirm,
}: {
  conflict: LineupConflict;
  locale: Locale;
  selectedId?: string;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  onSelect: (optionId: string) => void;
  onConfirm: (option: ClashResolutionOption) => void;
}) {
  const copy = getLineupClashCopy(locale);
  const reasons = conflictReasonText(conflict, locale);
  const selectedOption = conflict.resolutionOptions.find(
    (opt) => opt.id === selectedId,
  );
  const stakes =
    reasons[0] ??
    copy.types[conflict.type];

  const timeLine = [
    conflict.startA && conflict.endA
      ? `${conflict.startA}–${conflict.endA}${conflict.stageA ? ` · ${conflict.stageA}` : ''}`
      : null,
    conflict.artistAId !== conflict.artistBId && conflict.startB && conflict.endB
      ? `${conflict.startB}–${conflict.endB}${conflict.stageB ? ` · ${conflict.stageB}` : ''}`
      : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <div
      id={`lineup-conflict-${conflict.id}`}
      className="lineup-route-decision"
    >
      <h3 className="lineup-route-decision__names">
        {conflict.artistAId === conflict.artistBId ? (
          conflict.artistAName
        ) : (
          <>
            <span>{conflict.artistAName}</span>
            <span className="lineup-route-decision__vs" aria-hidden="true">
              ·
            </span>
            <span>{conflict.artistBName}</span>
          </>
        )}
      </h3>
      <p className="lineup-route-decision__reason">{stakes}</p>

      {(timeLine || conflict.overlapMinutes != null) && (
        <button
          type="button"
          className="lineup-route-decision__details-toggle"
          aria-expanded={detailsOpen}
          onClick={onToggleDetails}
        >
          {detailsOpen ? copy.hideDetails : copy.showDetails}
        </button>
      )}
      {detailsOpen ? (
        <div className="lineup-route-decision__details">
          {timeLine ? (
            <p className="lineup-route-decision__time">{timeLine}</p>
          ) : null}
          {conflict.overlapMinutes ? (
            <p className="lineup-route-decision__time">
              {formatClashTemplate(copy.overlapMeta, {
                minutes: conflict.overlapMinutes,
              })}
            </p>
          ) : null}
          {conflict.transferMinutes != null &&
          conflict.availableTransferMinutes != null ? (
            <p className="lineup-route-decision__time">
              {formatClashTemplate(copy.transferMeta, {
                needed: conflict.transferMinutes,
                available: conflict.availableTransferMinutes,
              })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className="lineup-route-decision__choices"
        role="radiogroup"
        aria-label={copy.resolveClash}
      >
        {conflict.resolutionOptions.map((option) => {
          const selected = selectedId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`lineup-route-decision__choice${selected ? ' is-selected' : ''}`}
              onClick={() => onSelect(option.id)}
            >
              <span>{optionLabel(conflict, option.type, locale)}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="lineup-route-decision__confirm"
        disabled={!selectedOption}
        onClick={() => {
          if (!selectedOption) return;
          onConfirm(selectedOption);
        }}
      >
        {copy.confirm}
      </button>
    </div>
  );
}
