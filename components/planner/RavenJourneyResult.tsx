'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Link2 } from 'lucide-react';
import { EventImage } from '../EventImage';
import {
  isBudgetTotalLabel,
  type PriceSource,
  type RavenJourneyFlightOption,
  type RavenJourneyStayOption,
  type RavenJourneyView,
} from '../../lib/raven-journey';
import { getMessages, type Locale } from '../../lib/i18n';

const TIMELINE_LINES_VISIBLE = 2;
const SETS_VISIBLE = 4;

type RavenJourneyResultProps = {
  locale: Locale;
  journey: RavenJourneyView;
  image?: string;
  showLanguageCaveat?: boolean;
  persistenceNotice?: boolean;
  shareUrl?: string;
  onSave: () => void;
  onEditPreferences: () => void;
  onRebuild: () => void;
  isRevealing?: boolean;
  hasRevealed?: boolean;
};

function TravelStay({
  option,
  areaHeadline,
  areaReasons,
  whyLabel,
}: {
  option: RavenJourneyStayOption;
  areaHeadline: string;
  areaReasons: string[];
  whyLabel: string;
}) {
  const why = option.reason?.trim() || areaReasons[0];

  return (
    <article className="raven-journey__story">
      {areaHeadline ? <p className="raven-journey__story-context">{areaHeadline}</p> : null}
      <h4 className="raven-journey__story-title">{option.name}</h4>
      {why ? (
        <p className="raven-journey__story-why">
          <span className="raven-journey__story-why-label">{whyLabel}</span>
          {why}
        </p>
      ) : null}
      {option.note ? <p className="raven-journey__story-note">{option.note}</p> : null}
    </article>
  );
}

function TravelFlight({
  option,
  recommendation,
  reasons,
}: {
  option: RavenJourneyFlightOption;
  recommendation: string;
  reasons: string[];
}) {
  return (
    <article className="raven-journey__story raven-journey__story--support">
      <h4 className="raven-journey__story-title raven-journey__story-title--sm">
        {option.route || recommendation}
      </h4>
      {option.detail ? <p className="raven-journey__story-note">{option.detail}</p> : null}
      {option.price ? <p className="raven-journey__story-price">{option.price}</p> : null}
      {reasons[0] ? <p className="raven-journey__story-why">{reasons[0]}</p> : null}
    </article>
  );
}

function budgetConfidenceCopy(
  confidence: PriceSource,
  copy: ReturnType<typeof getMessages>['aiPlanner']['journeyResult'],
): string | null {
  if (confidence === 'live') return copy.budgetConfidenceLive;
  if (confidence === 'unavailable') return copy.budgetConfidenceUnavailable;
  if (confidence === 'estimated' || confidence === 'user') return copy.budgetConfidenceEstimated;
  return null;
}

function prioritizeSets<T extends { highlight?: boolean }>(sets: T[], limit: number): T[] {
  const highlighted = sets.filter((set) => set.highlight);
  if (highlighted.length >= limit) return highlighted.slice(0, limit);
  const rest = sets.filter((set) => !set.highlight);
  return [...highlighted, ...rest].slice(0, limit);
}

export function RavenJourneyResult({
  locale,
  journey,
  image,
  showLanguageCaveat = false,
  persistenceNotice = true,
  shareUrl,
  onSave,
  onEditPreferences,
  onRebuild,
  isRevealing = false,
  hasRevealed = false,
}: RavenJourneyResultProps) {
  const t = getMessages(locale);
  const copy = t.aiPlanner.journeyResult;
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const shareResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (shareResetTimerRef.current != null) {
        window.clearTimeout(shareResetTimerRef.current);
      }
    };
  }, []);

  const metaBits = useMemo(
    () =>
      [
        journey.destination,
        journey.festivalDates,
        journey.tripNights > 0 ? copy.nights.replace('{n}', String(journey.tripNights)) : null,
        copy.travelers.replace('{n}', String(journey.travelers)),
        journey.origin && journey.origin !== '—'
          ? copy.from.replace('{origin}', journey.origin)
          : null,
      ].filter(Boolean) as string[],
    [copy, journey],
  );

  const handleShare = async () => {
    if (!shareUrl) return;
    if (shareResetTimerRef.current != null) {
      window.clearTimeout(shareResetTimerRef.current);
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareState('copied');
      shareResetTimerRef.current = window.setTimeout(() => setShareState('idle'), 2000);
    } catch {
      setShareState('failed');
      shareResetTimerRef.current = window.setTimeout(() => setShareState('idle'), 2500);
    }
  };

  const shareJourneyLabel =
    shareState === 'copied'
      ? copy.shareCopied
      : shareState === 'failed'
        ? copy.shareFailed
        : copy.shareJourney;

  const showTravel =
    Boolean(journey.stayStrategy.areaHeadline) ||
    journey.stayStrategy.options.length > 0 ||
    journey.flightStrategy.options.length > 0;

  const primaryStay = journey.stayStrategy.options[0];
  const alternateStays = journey.stayStrategy.options.slice(1);
  const primaryFlight = journey.flightStrategy.options[0];
  const alternateFlights = journey.flightStrategy.options.slice(1);
  const musicInsight = journey.insights[0];
  const budgetInsight = journey.budget.insight || journey.insights[1];
  const placeEyebrow = journey.destination || journey.festivalDates || null;
  const heroPromise =
    journey.summary && journey.summary !== copy.lead ? journey.summary : copy.lead;
  const hasMusicDetail =
    journey.festivalExperience.ravenPicks.length > 0 ||
    journey.festivalExperience.conflicts.length > 0;
  const showMusic =
    journey.festivalExperience.nonNegotiables.length > 0 ||
    journey.festivalExperience.dailyFlow.length > 0 ||
    hasMusicDetail ||
    Boolean(musicInsight);
  const budgetLineItems = journey.budget.items.filter((item) => !isBudgetTotalLabel(item.label));
  const breathLines = journey.breath.slice(0, 3);
  const showMetaQuietly = metaBits.length > 0 && breathLines.length === 0;
  const confidenceLine = budgetConfidenceCopy(journey.budget.confidence, copy);

  // Festival-first chapter: Music before Stay (aligned with design bible).
  return (
    <section
      className={`raven-journey${isRevealing ? ' is-revealing' : ''}${hasRevealed ? ' has-revealed' : ''}`}
      aria-labelledby="raven-journey-heading"
      aria-hidden={isRevealing || undefined}
      inert={isRevealing || undefined}
    >
      <header className="raven-journey__reveal" data-journey-reveal>
        {image ? (
          <EventImage
            src={image}
            alt=""
            className="raven-journey__reveal-image"
            sizes="100vw"
            priority
          />
        ) : null}
        <div className="raven-journey__reveal-scrim" aria-hidden />
        <div className="raven-journey__reveal-grain" aria-hidden />
        <div className="raven-journey__reveal-glow" aria-hidden />
        <div className="raven-journey__reveal-copy">
          {placeEyebrow ? <p className="raven-journey__eyebrow">{placeEyebrow}</p> : null}
          <h2 id="raven-journey-heading" className="raven-journey__title">
            {journey.festivalName}
          </h2>
          <p className="raven-journey__lead">{heroPromise}</p>
        </div>
      </header>

      <div className="raven-journey__body">
        {(breathLines.length > 0 || showMetaQuietly) && (
          <section className="raven-journey__context" aria-label={copy.contextKicker} data-journey-reveal>
            {breathLines.length ? (
              <ul className="raven-journey__hero-breath">
                {breathLines.map((line, index) => (
                  <li key={`breath-${index}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="raven-journey__hero-meta">{metaBits.join(' · ')}</p>
            )}
          </section>
        )}

        {showLanguageCaveat ? (
          <p className="raven-journey__whisper" role="note" data-journey-reveal>
            {t.aiPlanner.result.languageCaveat}
          </p>
        ) : null}

        {journey.timeline.length ? (
          <section
            className="raven-journey__section raven-journey__section--timeline"
            aria-labelledby="raven-timeline-heading"
            data-journey-reveal
          >
            <header className="raven-journey__section-head">
              <p className="raven-journey__section-kicker">{copy.timelineKicker}</p>
              <h3 id="raven-timeline-heading" className="raven-journey__section-title">
                {copy.timelineTitle}
              </h3>
            </header>
            <ol className="raven-journey__timeline">
              {journey.timeline.map((day, dayIndex) => {
                const visible = day.lines.slice(0, TIMELINE_LINES_VISIBLE);
                const extra = day.lines.slice(TIMELINE_LINES_VISIBLE);
                return (
                  <li key={`day-${dayIndex}-${day.label}`} className="raven-journey__timeline-day">
                    <div className="raven-journey__timeline-rail" aria-hidden />
                    <div>
                      <h4 className="raven-journey__timeline-label">{day.label}</h4>
                      {day.feeling ? (
                        <p className="raven-journey__timeline-feeling">{day.feeling}</p>
                      ) : null}
                      {visible.length ? (
                        <ul className="raven-journey__list raven-journey__list--tight">
                          {visible.map((line, lineIndex) => (
                            <li key={`day-${dayIndex}-line-${lineIndex}`}>{line}</li>
                          ))}
                        </ul>
                      ) : null}
                      {extra.length ? (
                        <details className="raven-journey__disclosure raven-journey__disclosure--quiet">
                          <summary>{copy.moreDayDetail}</summary>
                          <ul className="raven-journey__list raven-journey__list--tight">
                            {extra.map((line, lineIndex) => (
                              <li key={`day-${dayIndex}-extra-${lineIndex}`}>{line}</li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        {showMusic ? (
          <section
            className="raven-journey__section raven-journey__section--music"
            aria-labelledby="raven-festival-heading"
            data-journey-reveal
          >
            <header className="raven-journey__section-head raven-journey__section-head--bare">
              <h3 id="raven-festival-heading" className="raven-journey__section-title">
                {copy.festivalExperience}
              </h3>
            </header>

            {(journey.festivalExperience.dailyFlow.length > 0 ||
              journey.festivalExperience.setTimesStatus === 'unavailable') && (
              <div className="raven-journey__block raven-journey__block--peak">
                {journey.festivalExperience.setTimesStatus === 'unavailable' ||
                !journey.festivalExperience.dailyFlow.length ? (
                  <p className="raven-journey__empty">{copy.setTimesUnavailable}</p>
                ) : (
                  <div className="raven-journey__chapters">
                    {journey.festivalExperience.dailyFlow.map((day) => {
                      const visibleSets = prioritizeSets(day.sets, SETS_VISIBLE);
                      const hiddenSets = day.sets.filter((set) => !visibleSets.includes(set));
                      return (
                        <section key={day.label} className="raven-journey__chapter">
                          <h4 className="raven-journey__chapter-label">{day.label}</h4>
                          <ol className="raven-journey__chapter-nights">
                            {visibleSets.map((set) => (
                              <li
                                key={`${day.label}-${set.time}-${set.artist}`}
                                className={set.highlight ? 'is-highlight' : undefined}
                              >
                                <p className="raven-journey__chapter-artist">{set.artist}</p>
                                <p className="raven-journey__chapter-scene">
                                  {[set.stage, set.time].filter(Boolean).join(' · ')}
                                </p>
                              </li>
                            ))}
                          </ol>
                          {hiddenSets.length ? (
                            <details className="raven-journey__disclosure raven-journey__disclosure--quiet">
                              <summary>{copy.moreSets}</summary>
                              <ol className="raven-journey__chapter-nights">
                                {hiddenSets.map((set) => (
                                  <li key={`${day.label}-more-${set.time}-${set.artist}`}>
                                    <p className="raven-journey__chapter-artist">{set.artist}</p>
                                    <p className="raven-journey__chapter-scene">
                                      {[set.stage, set.time].filter(Boolean).join(' · ')}
                                    </p>
                                  </li>
                                ))}
                              </ol>
                            </details>
                          ) : null}
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {journey.festivalExperience.nonNegotiables.length ? (
              <div className="raven-journey__block">
                <h4 className="raven-journey__block-title">{copy.nonNegotiables}</h4>
                <ul className="raven-journey__artists">
                  {journey.festivalExperience.nonNegotiables.slice(0, 5).map((artist) => (
                    <li key={artist}>{artist}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {musicInsight ? <p className="raven-journey__insight-line">{musicInsight}</p> : null}

            {hasMusicDetail ? (
              <details className="raven-journey__disclosure">
                <summary>{copy.moreMusicDetail}</summary>
                {journey.festivalExperience.ravenPicks.length ? (
                  <div className="raven-journey__block">
                    <h4 className="raven-journey__block-title">{copy.ravenPicks}</h4>
                    <ul className="raven-journey__list">
                      {journey.festivalExperience.ravenPicks.map((pick, index) => (
                        <li key={`pick-${index}`}>{pick}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {journey.festivalExperience.conflicts.length ? (
                  <div className="raven-journey__block">
                    <h4 className="raven-journey__block-title">{copy.potentialConflicts}</h4>
                    <ul className="raven-journey__list">
                      {journey.festivalExperience.conflicts.map((conflict, index) => (
                        <li key={`conflict-${index}`}>{conflict}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </details>
            ) : null}
          </section>
        ) : null}

        {showTravel ? (
          <section
            className="raven-journey__section raven-journey__section--travel"
            aria-labelledby="raven-travel-heading"
            data-journey-reveal
          >
            <p id="raven-travel-heading" className="raven-journey__editorial-open">
              {copy.travelTitle}
            </p>

            {primaryStay ? (
              <TravelStay
                option={primaryStay}
                areaHeadline={journey.stayStrategy.areaHeadline}
                areaReasons={journey.stayStrategy.areaReasons}
                whyLabel={copy.whyStay}
              />
            ) : journey.stayStrategy.areaHeadline ? (
              <p className="raven-journey__section-lead">{journey.stayStrategy.areaHeadline}</p>
            ) : null}

            {alternateStays.length ? (
              <details className="raven-journey__disclosure">
                <summary>{copy.moreStayOptions}</summary>
                <div className="raven-journey__options">
                  {alternateStays.map((option, index) => (
                    <article key={`stay-${index}-${option.name}`} className="raven-journey__option">
                      <h4 className="raven-journey__option-title">{option.name}</h4>
                      {option.reason ? (
                        <p className="raven-journey__option-reason">{option.reason}</p>
                      ) : null}
                      <p className="raven-journey__option-note">{option.note}</p>
                    </article>
                  ))}
                </div>
              </details>
            ) : null}

            {primaryFlight ? (
              <div className="raven-journey__travel-flight">
                <h4 className="raven-journey__block-title">{copy.flightStrategy}</h4>
                <TravelFlight
                  option={primaryFlight}
                  recommendation={journey.flightStrategy.recommendation}
                  reasons={journey.flightStrategy.reasons}
                />
                {alternateFlights.length ? (
                  <details className="raven-journey__disclosure">
                    <summary>{copy.moreFlightOptions}</summary>
                    <div className="raven-journey__options">
                      {alternateFlights.map((option, index) => (
                        <article
                          key={`flight-${index}-${option.route}`}
                          className="raven-journey__option"
                        >
                          <h4 className="raven-journey__option-title">{option.route}</h4>
                          {option.detail ? (
                            <p className="raven-journey__option-note">{option.detail}</p>
                          ) : null}
                          {option.price ? (
                            <p className="raven-journey__option-price">{option.price}</p>
                          ) : null}
                          {option.tradeoff ? (
                            <p className="raven-journey__option-reason">{option.tradeoff}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {journey.budget.items.length || journey.budget.total ? (
          <section
            className="raven-journey__section raven-journey__section--budget"
            aria-labelledby="raven-budget-heading"
            data-journey-reveal
          >
            {journey.budget.total ? (
              <p className="raven-journey__budget-total" id="raven-budget-heading">
                {journey.budget.total}
              </p>
            ) : (
              <h3 id="raven-budget-heading" className="raven-journey__section-title">
                {copy.budgetTitle}
              </h3>
            )}
            {journey.budget.total ? (
              <p className="raven-journey__budget-caption">{copy.budgetTitle}</p>
            ) : null}
            {confidenceLine ? (
              <p className="raven-journey__budget-confidence">{confidenceLine}</p>
            ) : null}
            {budgetInsight ? <p className="raven-journey__insight-line">{budgetInsight}</p> : null}
            {budgetLineItems.length ? (
              <details className="raven-journey__disclosure" open={!journey.budget.total}>
                <summary>{copy.budgetBreakdown}</summary>
                <ul className="raven-journey__budget-list">
                  {budgetLineItems.map((item) => (
                    <li key={item.label}>
                      <div className="raven-journey__budget-row">
                        <span>{item.label}</span>
                        <span>{item.amount}</span>
                      </div>
                      {item.note ? <p className="raven-journey__muted">{item.note}</p> : null}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        ) : null}

        {journey.essentials.length ? (
          <section
            className="raven-journey__section raven-journey__section--essentials"
            aria-label={copy.essentialsTitle}
            data-journey-reveal
          >
            <details className="raven-journey__disclosure raven-journey__disclosure--quiet">
              <summary>{copy.essentialsToggle}</summary>
              <div className="raven-journey__essentials">
                {journey.essentials.map((group) => (
                  <article key={group.title} className="raven-journey__essentials-group">
                    <h4>{group.title}</h4>
                    <ul className="raven-journey__list raven-journey__list--tight">
                      {group.items.map((item) => (
                        <li key={`${group.title}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </details>
          </section>
        ) : null}

        <footer className="raven-journey__finale" data-journey-reveal>
          <p className="raven-journey__finale-lead">{copy.finaleLead}</p>
          <p className="raven-journey__finale-festival">{journey.festivalName}</p>
          <div className="raven-journey__finale-actions">
            <button type="button" className="raven-journey__cta" onClick={onSave}>
              {copy.save}
              <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          {copy.saveHint ? <p className="raven-journey__save-hint">{copy.saveHint}</p> : null}
          <div className="raven-journey__finale-secondary">
            <button
              type="button"
              className="raven-journey__text-action"
              onClick={handleShare}
              disabled={!shareUrl}
            >
              <Link2 size={14} strokeWidth={2.25} aria-hidden />
              {shareJourneyLabel}
            </button>
          </div>
          <details className="raven-journey__disclosure raven-journey__disclosure--quiet raven-journey__finale-tools">
            <summary>{copy.changeJourney}</summary>
            <div className="raven-journey__finale-tool-actions">
              <button type="button" className="raven-journey__text-action" onClick={onEditPreferences}>
                {copy.editPreferences}
              </button>
              <button type="button" className="raven-journey__text-action" onClick={onRebuild}>
                {copy.rebuild}
              </button>
            </div>
          </details>
          {persistenceNotice ? (
            <p className="raven-journey__persist">{copy.persistenceNotice}</p>
          ) : null}
        </footer>
      </div>
    </section>
  );
}
