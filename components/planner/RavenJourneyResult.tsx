'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Link2 } from 'lucide-react';
import { EventImage } from '../EventImage';
import {
  isBudgetTotalLabel,
  type RavenJourneyFlightOption,
  type RavenJourneyStayOption,
  type RavenJourneyView,
} from '../../lib/raven-journey';
import { getMessages, type Locale } from '../../lib/i18n';

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
  const listedReasons = option.reason?.trim()
    ? areaReasons
    : areaReasons.slice(1);

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
      {listedReasons.length ? (
        <ul className="raven-journey__list raven-journey__list--tight">
          {listedReasons.map((reason, index) => (
            <li key={`stay-reason-${index}`}>{reason}</li>
          ))}
        </ul>
      ) : null}
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
        journey.tripNights > 0
          ? copy.nights.replace('{n}', String(journey.tripNights))
          : null,
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
  const budgetLineItems = journey.budget.items.filter(
    (item) => !isBudgetTotalLabel(item.label),
  );
  const breathLines = journey.breath.slice(0, 4);
  const showMetaQuietly = metaBits.length > 0 && breathLines.length === 0;

  return (
    <section className="raven-journey" aria-labelledby="raven-journey-heading">
      <header className="raven-journey__reveal">
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
        <div className="raven-journey__reveal-glow" aria-hidden />
        <div className="raven-journey__reveal-copy">
          {placeEyebrow ? <p className="raven-journey__eyebrow">{placeEyebrow}</p> : null}
          <h2 id="raven-journey-heading" className="raven-journey__title">
            {journey.festivalName}
          </h2>
          <p className="raven-journey__lead">{heroPromise}</p>
          <div className="raven-journey__actions">
            <button type="button" className="raven-journey__text-action raven-journey__text-action--hero" onClick={onSave}>
              {copy.save}
              <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
            </button>
            <span className="raven-journey__save-hint">{copy.saveHint}</span>
          </div>
        </div>
      </header>

      {(breathLines.length > 0 || showMetaQuietly) && (
        <section className="raven-journey__context" aria-label={copy.contextKicker}>
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

      {showLanguageCaveat || persistenceNotice ? (
        <div className="raven-journey__notes" role="note">
          {showLanguageCaveat ? (
            <p className="raven-journey__caveat">{t.aiPlanner.result.languageCaveat}</p>
          ) : null}
          {persistenceNotice ? <p className="raven-journey__persist">{copy.persistenceNotice}</p> : null}
        </div>
      ) : null}

      {journey.timeline.length ? (
        <section className="raven-journey__section raven-journey__section--timeline" aria-labelledby="raven-timeline-heading">
          <header className="raven-journey__section-head">
            <p className="raven-journey__section-kicker">{copy.timelineKicker}</p>
            <h3 id="raven-timeline-heading" className="raven-journey__section-title">
              {copy.timelineTitle}
            </h3>
          </header>
          <ol className="raven-journey__timeline">
            {journey.timeline.map((day, dayIndex) => (
              <li key={`day-${dayIndex}-${day.label}`} className="raven-journey__timeline-day">
                <div className="raven-journey__timeline-rail" aria-hidden />
                <div>
                  <h4 className="raven-journey__timeline-label">{day.label}</h4>
                  {day.feeling ? <p className="raven-journey__timeline-feeling">{day.feeling}</p> : null}
                  <ul className="raven-journey__list raven-journey__list--tight">
                    {day.lines.map((line, lineIndex) => (
                      <li key={`day-${dayIndex}-line-${lineIndex}`}>{line}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {showMusic ? (
        <section className="raven-journey__section raven-journey__section--music" aria-labelledby="raven-festival-heading">
          <header className="raven-journey__section-head">
            <p className="raven-journey__section-kicker">{copy.festivalKicker}</p>
            <h3 id="raven-festival-heading" className="raven-journey__section-title">
              {copy.festivalExperience}
            </h3>
          </header>

          {(journey.festivalExperience.dailyFlow.length > 0 ||
            journey.festivalExperience.setTimesStatus === 'unavailable') && (
            <div className="raven-journey__block raven-journey__block--peak">
              <h4 className="raven-journey__block-title">{copy.dailyFlow}</h4>
              {journey.festivalExperience.setTimesStatus === 'unavailable' ||
              !journey.festivalExperience.dailyFlow.length ? (
                <p className="raven-journey__empty">{copy.setTimesUnavailable}</p>
              ) : (
                <div className="raven-journey__chapters">
                  {journey.festivalExperience.dailyFlow.map((day) => (
                    <section key={day.label} className="raven-journey__chapter">
                      <h5 className="raven-journey__chapter-label">{day.label}</h5>
                      <ol className="raven-journey__chapter-nights">
                        {day.sets.map((set) => (
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
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {journey.festivalExperience.nonNegotiables.length ? (
            <div className="raven-journey__block">
              <h4 className="raven-journey__block-title">{copy.nonNegotiables}</h4>
              <ul className="raven-journey__artists">
                {journey.festivalExperience.nonNegotiables.map((artist) => (
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
        <section className="raven-journey__section raven-journey__section--travel" aria-labelledby="raven-travel-heading">
          <header className="raven-journey__section-head">
            <p className="raven-journey__section-kicker">{copy.travelKicker}</p>
            <h3 id="raven-travel-heading" className="raven-journey__section-title">
              {copy.travelTitle}
            </h3>
          </header>

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
                    {option.reason ? <p className="raven-journey__option-reason">{option.reason}</p> : null}
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
                      <article key={`flight-${index}-${option.route}`} className="raven-journey__option">
                        <h4 className="raven-journey__option-title">{option.route}</h4>
                        {option.detail ? <p className="raven-journey__option-note">{option.detail}</p> : null}
                        {option.price ? <p className="raven-journey__option-price">{option.price}</p> : null}
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

      {journey.budget.items.length ? (
        <section className="raven-journey__section raven-journey__section--budget" aria-labelledby="raven-budget-heading">
          <header className="raven-journey__section-head">
            <p className="raven-journey__section-kicker">{copy.budgetKicker}</p>
            <h3 id="raven-budget-heading" className="raven-journey__section-title">
              {copy.budgetTitle}
            </h3>
            {journey.budget.total ? (
              <p className="raven-journey__budget-total">{journey.budget.total}</p>
            ) : null}
          </header>
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
        <section className="raven-journey__section raven-journey__section--essentials" aria-labelledby="raven-essentials-heading">
          <header className="raven-journey__section-head">
            <p className="raven-journey__section-kicker">{copy.essentialsKicker}</p>
            <h3 id="raven-essentials-heading" className="raven-journey__section-title">
              {copy.essentialsTitle}
            </h3>
          </header>
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

      <footer className="raven-journey__finale">
        <p className="raven-journey__finale-lead">{copy.finaleLead}</p>
        <p className="raven-journey__finale-festival">{journey.festivalName}</p>
        <p className="raven-journey__save-hint">{copy.saveHint}</p>
        <div className="raven-journey__finale-actions">
          <button type="button" className="button" onClick={onSave}>
            {copy.save}
            <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <div className="raven-journey__finale-secondary">
          <button type="button" className="raven-journey__text-action" onClick={handleShare} disabled={!shareUrl}>
            <Link2 size={14} strokeWidth={2.25} aria-hidden />
            {shareJourneyLabel}
          </button>
          <button type="button" className="raven-journey__text-action" onClick={onEditPreferences}>
            {copy.editPreferences}
          </button>
          <button type="button" className="raven-journey__text-action" onClick={onRebuild}>
            {copy.rebuild}
          </button>
        </div>
      </footer>
    </section>
  );
}
