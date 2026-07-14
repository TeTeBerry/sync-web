"use client";

import { useMemo } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { EventImage } from "../EventImage";
import { FestivalSquadJourneyCta } from "../festival-squad/FestivalSquadJourneyCta";
import { JourneyShareSection } from "../journey-share";
import {
  isBudgetTotalLabel,
  type PriceSource,
  type RavenJourneyFlightOption,
  type RavenJourneyStayArea,
  type RavenJourneyView,
} from "../../lib/raven-journey";
import { buildJourneyShareFromView } from "../../lib/journey-share";
import type { PlannerPreferences } from "../../lib/planner-plan";
import { getMessages, type Locale } from "../../lib/i18n";
import type { RavenFestivalWeather } from "../../lib/api";
import { FestivalWeatherReadiness } from "./FestivalWeatherReadiness";

const TIMELINE_LINES_VISIBLE = 1;
const SETS_VISIBLE = 3;
const FESTIVAL_DAYS_VISIBLE = 2;

type RavenJourneyResultProps = {
  locale: Locale;
  journey: RavenJourneyView;
  image?: string;
  showLanguageCaveat?: boolean;
  persistenceNotice?: boolean;
  guideId?: string;
  preferences?: PlannerPreferences | null;
  favoriteArtists?: string[];
  squadHref?: string;
  eventLegacyId?: number;
  weather?: RavenFestivalWeather | null;
  onSave: () => void;
  onEditPreferences: () => void;
  onRebuild: () => void;
  isRevealing?: boolean;
  hasRevealed?: boolean;
};

function FestivalStayGuide({
  areas,
  festivalName,
  locale,
}: {
  areas: RavenJourneyStayArea[];
  festivalName: string;
  locale: Locale;
}) {
  const isEnglish = locale === "en";
  const [primaryArea, ...alternateAreas] = areas;
  const hotelSearchHref = (area: RavenJourneyStayArea) => {
    const search = new URLSearchParams({
      q: `${area.area} ${festivalName} hotels`,
    });
    return `https://www.google.com/travel/search?${search.toString()}`;
  };

  if (!primaryArea) return null;

  return (
    <div className="raven-journey__stay-guide">
      <article className="raven-journey__stay-area raven-journey__stay-area--base">
        <p className="raven-journey__stay-kicker">
          {isEnglish ? "Raven's base for the weekend" : "Raven 推荐的周末落脚点"}
        </p>
        <h4 className="raven-journey__stay-name">{primaryArea.area}</h4>
        {primaryArea.tags.length ? (
          <p className="raven-journey__stay-tags">
            {primaryArea.tags
              .slice(0, 3)
              .map((tag) => tag.replaceAll("_", " "))
              .join(" · ")}
          </p>
        ) : null}
        <p className="raven-journey__stay-reason">{primaryArea.reason}</p>
        {primaryArea.estimate ? (
          <p className="raven-journey__stay-estimate">{primaryArea.estimate}</p>
        ) : null}
        <a
          className="raven-journey__stay-link"
          href={hotelSearchHref(primaryArea)}
          target="_blank"
          rel="noreferrer"
        >
          {isEnglish ? "Find hotels in this area" : "在这个区域找酒店"}{" "}
          <ArrowUpRight size={15} aria-hidden />
        </a>
      </article>

      {alternateAreas.length ? (
        <aside
          className="raven-journey__stay-alternatives"
          aria-label={isEnglish ? "Other stay areas" : "其他住宿区域"}
        >
          <p className="raven-journey__stay-alternatives-label">
            {isEnglish ? "If your weekend leans another way" : "如果你的周末想走另一种节奏"}
          </p>
          <ul>
            {alternateAreas.slice(0, 2).map((area) => (
              <li key={area.area}>
                <div>
                  <a href={hotelSearchHref(area)} target="_blank" rel="noreferrer">
                    {area.area}
                    <ArrowUpRight size={13} aria-hidden />
                  </a>
                  <p>{area.reason}</p>
                </div>
                {area.tags.length ? (
                  <span>{area.tags.slice(0, 2).map((tag) => tag.replaceAll("_", " ")).join(" · ")}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </div>
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
      {option.badge ? (
        <span className="raven-journey__flight-badge">{option.badge}</span>
      ) : null}
      <h4 className="raven-journey__story-title raven-journey__story-title--route">
        {option.route || recommendation}
      </h4>
      {option.detail ? (
        <p className="raven-journey__story-note">{option.detail}</p>
      ) : null}
      {option.price ? (
        <p className="raven-journey__story-price">{option.price}</p>
      ) : null}
      {option.tradeoff || option.recommendationReason || reasons[0] ? (
        <p className="raven-journey__story-why">
          {option.tradeoff || option.recommendationReason || reasons[0]}
        </p>
      ) : null}
    </article>
  );
}

function budgetConfidenceCopy(
  confidence: PriceSource,
  copy: ReturnType<typeof getMessages>["aiPlanner"]["journeyResult"],
): string | null {
  if (confidence === "live") return copy.budgetConfidenceLive;
  if (confidence === "unavailable") return copy.budgetConfidenceUnavailable;
  if (confidence === "estimated" || confidence === "user")
    return copy.budgetConfidenceEstimated;
  return null;
}

function prioritizeSets<T extends { highlight?: boolean }>(
  sets: T[],
  limit: number,
): T[] {
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
  guideId,
  preferences,
  favoriteArtists,
  squadHref,
  eventLegacyId,
  weather,
  onSave,
  onEditPreferences,
  onRebuild,
  isRevealing = false,
  hasRevealed = false,
}: RavenJourneyResultProps) {
  const t = getMessages(locale);
  const copy = t.aiPlanner.journeyResult;
  const shareCopy = t.aiPlanner.journeyShare;
  const isEnglish = locale === "en";
  const metaBits = useMemo(
    () =>
      [
        journey.destination,
        journey.festivalDates,
        journey.tripNights > 0
          ? copy.nights.replace("{n}", String(journey.tripNights))
          : null,
        copy.travelers.replace("{n}", String(journey.travelers)),
        journey.origin && journey.origin !== "—"
          ? copy.from.replace("{origin}", journey.origin)
          : null,
      ].filter(Boolean) as string[],
    [copy, journey],
  );

  const showTravel =
    Boolean(journey.stayStrategy.areaHeadline) ||
    (journey.stayStrategy.recommendedAreas?.length ?? 0) > 0 ||
    journey.stayStrategy.options.length > 0 ||
    journey.flightStrategy.options.length > 0;

  const alternateStays = journey.stayStrategy.options.slice(1);
  const primaryFlight = journey.flightStrategy.options[0];
  const alternateFlights = journey.flightStrategy.options.slice(1);
  const musicInsight = journey.insights[0];
  const budgetInsight = journey.budget.insight || journey.insights[1];
  const placeEyebrow = journey.destination || journey.festivalDates || null;
  const heroPromise =
    journey.summary && journey.summary !== copy.lead
      ? journey.summary
      : copy.lead;
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
  const breathLines = journey.breath.slice(0, 2);
  const visibleMusicDays = journey.festivalExperience.dailyFlow.slice(
    0,
    FESTIVAL_DAYS_VISIBLE,
  );
  const hiddenMusicDays = journey.festivalExperience.dailyFlow.slice(
    FESTIVAL_DAYS_VISIBLE,
  );
  const showMetaQuietly = metaBits.length > 0 && breathLines.length === 0;
  const confidenceLine = budgetConfidenceCopy(journey.budget.confidence, copy);

  const journeyShareData = useMemo(() => {
    if (!guideId) return null;
    return buildJourneyShareFromView({
      id: guideId,
      locale,
      journey,
      preferences,
      favoriteArtists,
      heroImage: image,
    });
  }, [favoriteArtists, guideId, image, journey, locale, preferences]);

  // Festival-first chapter: Music before Stay (aligned with design bible).
  return (
    <section
      className={`raven-journey${isRevealing ? " is-revealing" : ""}${hasRevealed ? " has-revealed" : ""}`}
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
          {placeEyebrow ? (
            <p className="raven-journey__eyebrow">{placeEyebrow}</p>
          ) : null}
          <h2 id="raven-journey-heading" className="raven-journey__title">
            {journey.festivalName}
          </h2>
          <p className="raven-journey__lead">{heroPromise}</p>
        </div>
      </header>

      <div className="raven-journey__body">
        {(breathLines.length > 0 || showMetaQuietly) && (
          <section
            className="raven-journey__context"
            aria-label={copy.contextKicker}
            data-journey-reveal
          >
            {breathLines.length ? (
              <ul className="raven-journey__hero-breath">
                {breathLines.map((line, index) => (
                  <li key={`breath-${index}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="raven-journey__hero-meta">{metaBits.join(" · ")}</p>
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
            <details className="raven-journey__timeline-disclosure">
              <summary id="raven-timeline-heading">
                <span className="raven-journey__section-kicker">
                  {copy.timelineKicker}
                </span>
                <span className="raven-journey__section-title">
                  {copy.timelineTitle}
                </span>
              </summary>
              <ol className="raven-journey__timeline">
                {journey.timeline.map((day, dayIndex) => {
                  const visible = day.lines.slice(0, TIMELINE_LINES_VISIBLE);
                  const extra = day.lines.slice(TIMELINE_LINES_VISIBLE);
                  return (
                    <li
                      key={`day-${dayIndex}-${day.label}`}
                      className="raven-journey__timeline-day"
                    >
                      <div
                        className="raven-journey__timeline-rail"
                        aria-hidden
                      />
                      <div>
                        <h4 className="raven-journey__timeline-label">
                          {day.label}
                        </h4>
                        {day.feeling ? (
                          <p className="raven-journey__timeline-feeling">
                            {day.feeling}
                          </p>
                        ) : null}
                        {visible.length ? (
                          <ul className="raven-journey__list raven-journey__list--tight">
                            {visible.map((line, lineIndex) => (
                              <li key={`day-${dayIndex}-line-${lineIndex}`}>
                                {line}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {extra.length ? (
                          <details className="raven-journey__disclosure raven-journey__disclosure--quiet">
                            <summary>{copy.moreDayDetail}</summary>
                            <ul className="raven-journey__list raven-journey__list--tight">
                              {extra.map((line, lineIndex) => (
                                <li key={`day-${dayIndex}-extra-${lineIndex}`}>
                                  {line}
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </details>
          </section>
        ) : null}

        {showMusic ? (
          <section
            className="raven-journey__section raven-journey__section--music"
            aria-labelledby="raven-festival-heading"
            data-journey-reveal
          >
            <header className="raven-journey__section-head raven-journey__section-head--bare">
              <h3
                id="raven-festival-heading"
                className="raven-journey__section-title"
              >
                {copy.festivalExperience}
              </h3>
            </header>

            {(journey.festivalExperience.dailyFlow.length > 0 ||
              journey.festivalExperience.setTimesStatus === "unavailable") && (
              <div className="raven-journey__block raven-journey__block--peak">
                {journey.festivalExperience.setTimesStatus === "unavailable" ||
                !journey.festivalExperience.dailyFlow.length ? (
                  <p className="raven-journey__empty">
                    {copy.setTimesUnavailable}
                  </p>
                ) : (
                  <div className="raven-journey__chapters">
                    {visibleMusicDays.map((day) => {
                      const visibleSets = prioritizeSets(
                        day.sets,
                        SETS_VISIBLE,
                      );
                      const hiddenSets = day.sets.filter(
                        (set) => !visibleSets.includes(set),
                      );
                      return (
                        <section
                          key={day.label}
                          className="raven-journey__chapter"
                        >
                          <h4 className="raven-journey__chapter-label">
                            {day.label}
                          </h4>
                          <ol className="raven-journey__chapter-nights">
                            {visibleSets.map((set) => (
                              <li
                                key={`${day.label}-${set.time}-${set.artist}`}
                                className={
                                  set.highlight ? "is-highlight" : undefined
                                }
                              >
                                <p className="raven-journey__chapter-artist">
                                  {set.artist}
                                </p>
                                <p className="raven-journey__chapter-scene">
                                  {[set.stage, set.time]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              </li>
                            ))}
                          </ol>
                          {hiddenSets.length ? (
                            <details className="raven-journey__disclosure raven-journey__disclosure--quiet">
                              <summary>{copy.moreSets}</summary>
                              <ol className="raven-journey__chapter-nights">
                                {hiddenSets.map((set) => (
                                  <li
                                    key={`${day.label}-more-${set.time}-${set.artist}`}
                                  >
                                    <p className="raven-journey__chapter-artist">
                                      {set.artist}
                                    </p>
                                    <p className="raven-journey__chapter-scene">
                                      {[set.stage, set.time]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </p>
                                  </li>
                                ))}
                              </ol>
                            </details>
                          ) : null}
                        </section>
                      );
                    })}
                    {hiddenMusicDays.length ? (
                      <details className="raven-journey__disclosure raven-journey__disclosure--quiet">
                        <summary>{copy.moreSets}</summary>
                        {hiddenMusicDays.map((day) => (
                          <section
                            key={day.label}
                            className="raven-journey__chapter"
                          >
                            <h4 className="raven-journey__chapter-label">
                              {day.label}
                            </h4>
                            <ol className="raven-journey__chapter-nights">
                              {day.sets.map((set) => (
                                <li
                                  key={`${day.label}-${set.time}-${set.artist}`}
                                  className={
                                    set.highlight ? "is-highlight" : undefined
                                  }
                                >
                                  <p className="raven-journey__chapter-artist">
                                    {set.artist}
                                  </p>
                                  <p className="raven-journey__chapter-scene">
                                    {[set.stage, set.time]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                </li>
                              ))}
                            </ol>
                          </section>
                        ))}
                      </details>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {journey.festivalExperience.nonNegotiables.length ? (
              <div className="raven-journey__block">
                <h4 className="raven-journey__block-title">
                  {copy.nonNegotiables}
                </h4>
                <ul className="raven-journey__artists">
                  {journey.festivalExperience.nonNegotiables
                    .slice(0, 5)
                    .map((artist) => (
                      <li key={artist}>{artist}</li>
                    ))}
                </ul>
              </div>
            ) : null}

            {musicInsight ? (
              <p className="raven-journey__insight-line">{musicInsight}</p>
            ) : null}

            {hasMusicDetail ? (
              <details className="raven-journey__disclosure">
                <summary>{copy.moreMusicDetail}</summary>
                {journey.festivalExperience.ravenPicks.length ? (
                  <div className="raven-journey__block">
                    <h4 className="raven-journey__block-title">
                      {copy.ravenPicks}
                    </h4>
                    <ul className="raven-journey__list">
                      {journey.festivalExperience.ravenPicks.map(
                        (pick, index) => (
                          <li key={`pick-${index}`}>{pick}</li>
                        ),
                      )}
                    </ul>
                  </div>
                ) : null}
                {journey.festivalExperience.conflicts.length ? (
                  <div className="raven-journey__block">
                    <h4 className="raven-journey__block-title">
                      {copy.potentialConflicts}
                    </h4>
                    <ul className="raven-journey__list">
                      {journey.festivalExperience.conflicts.map(
                        (conflict, index) => (
                          <li key={`conflict-${index}`}>{conflict}</li>
                        ),
                      )}
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
            <p
              id="raven-travel-heading"
              className="raven-journey__editorial-open"
            >
              {copy.travelTitle}
            </p>

            {journey.stayStrategy.recommendedAreas?.length ? (
              <FestivalStayGuide
                areas={journey.stayStrategy.recommendedAreas}
                festivalName={journey.festivalName}
                locale={locale}
              />
            ) : journey.stayStrategy.areaHeadline ? (
              <p className="raven-journey__section-lead">
                {journey.stayStrategy.areaHeadline}
              </p>
            ) : null}

            {!journey.stayStrategy.recommendedAreas?.length &&
            alternateStays.length ? (
              <details className="raven-journey__disclosure">
                <summary>{copy.moreStayOptions}</summary>
                <div className="raven-journey__options">
                  {alternateStays.map((option, index) => (
                    <article
                      key={`stay-${index}-${option.name}`}
                      className="raven-journey__option"
                    >
                      <h4 className="raven-journey__option-title">
                        {option.name}
                      </h4>
                      {option.reason ? (
                        <p className="raven-journey__option-reason">
                          {option.reason}
                        </p>
                      ) : null}
                      <p className="raven-journey__option-note">
                        {option.note}
                      </p>
                    </article>
                  ))}
                </div>
              </details>
            ) : null}

            {primaryFlight ? (
              <div className="raven-journey__travel-flight">
                <p className="raven-journey__travel-flight-kicker">
                  {copy.flightStrategy}
                </p>
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
                          {option.badge ? (
                            <span className="raven-journey__flight-badge">
                              {option.badge}
                            </span>
                          ) : null}
                          <h4 className="raven-journey__option-title">
                            {option.route}
                          </h4>
                          {option.detail ? (
                            <p className="raven-journey__option-note">
                              {option.detail}
                            </p>
                          ) : null}
                          {option.price ? (
                            <p className="raven-journey__option-price">
                              {option.price}
                            </p>
                          ) : null}
                          {option.tradeoff ? (
                            <p className="raven-journey__option-reason">
                              {option.tradeoff}
                            </p>
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

        {weather ? (
          <FestivalWeatherReadiness locale={locale} weather={weather} />
        ) : null}

        {journey.budget.items.length || journey.budget.total ? (
          <section
            className="raven-journey__section raven-journey__section--budget"
            aria-labelledby="raven-budget-heading"
            data-journey-reveal
          >
            <div className="raven-journey__budget-confidence-scene">
              <p className="raven-journey__budget-kicker">{copy.budgetKicker}</p>
              {journey.budget.total ? (
                <p
                  className="raven-journey__budget-total"
                  id="raven-budget-heading"
                >
                  {journey.budget.total}
                </p>
              ) : (
                <h3
                  id="raven-budget-heading"
                  className="raven-journey__section-title"
                >
                  {copy.budgetTitle}
                </h3>
              )}
              <p className="raven-journey__budget-caption">{copy.budgetTitle}</p>
              {confidenceLine ? (
                <p className="raven-journey__budget-confidence">
                  {confidenceLine}
                </p>
              ) : null}
              {budgetInsight ? (
                <p className="raven-journey__insight-line">{budgetInsight}</p>
              ) : null}
            </div>
            {budgetLineItems.length ? (
              <details
                className="raven-journey__disclosure"
                open={!journey.budget.total}
              >
                <summary>{copy.budgetBreakdown}</summary>
                <ul className="raven-journey__budget-list">
                  {budgetLineItems.map((item) => (
                    <li key={item.label}>
                      <div className="raven-journey__budget-row">
                        <span>{item.label}</span>
                        <span>{item.amount}</span>
                      </div>
                      {item.note ? (
                        <p className="raven-journey__muted">{item.note}</p>
                      ) : null}
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
                  <article
                    key={group.title}
                    className="raven-journey__essentials-group"
                  >
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
          <p className="raven-journey__finale-festival">
            {journey.festivalName}
          </p>
          <div className="raven-journey__finale-actions">
            <button
              type="button"
              className="raven-journey__cta"
              onClick={onSave}
            >
              {copy.save}
              <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          {copy.saveHint ? (
            <p className="raven-journey__save-hint">{copy.saveHint}</p>
          ) : null}
          <details className="raven-journey__disclosure raven-journey__disclosure--quiet raven-journey__finale-tools">
            <summary>{copy.changeJourney}</summary>
            <div className="raven-journey__finale-tool-actions">
              <button
                type="button"
                className="raven-journey__text-action"
                onClick={onEditPreferences}
              >
                {copy.editPreferences}
              </button>
              <button
                type="button"
                className="raven-journey__text-action"
                onClick={onRebuild}
              >
                {copy.rebuild}
              </button>
            </div>
          </details>
          {persistenceNotice ? (
            <p className="raven-journey__persist">{copy.persistenceNotice}</p>
          ) : null}
        </footer>

        {(squadHref || journeyShareData) && (
          <details className="raven-journey__continue" data-journey-reveal>
            <summary>{isEnglish ? "Bring this journey with you" : "把这趟旅程带上"}</summary>
            <div className="raven-journey__continue-body">
              {squadHref ? (
                <FestivalSquadJourneyCta
                  squadHref={squadHref}
                  labels={t.festivalSquad.journeyCta}
                  journeySignals={[
                    journey.origin && journey.origin !== "—"
                      ? t.festivalSquad.journeyCta.fromOrigin.replace(
                          "{origin}",
                          journey.origin,
                        )
                      : "",
                    journey.glance.stay.headline,
                    journey.glance.budget.headline,
                    ...journey.festivalExperience.ravenPicks.slice(0, 2),
                  ].filter(Boolean)}
                  eventProperties={{
                    event:
                      eventLegacyId != null
                        ? String(eventLegacyId)
                        : journey.festivalName,
                    locale,
                    source: "journey-result",
                  }}
                />
              ) : null}

              {journeyShareData ? (
                <JourneyShareSection
                  data={journeyShareData}
                  copy={{
                    kicker: shareCopy.kicker,
                    title: shareCopy.title,
                    description: shareCopy.description,
                    primaryCta: shareCopy.primaryCta,
                    secondaryCta: shareCopy.secondaryCta,
                    previewTitle: shareCopy.previewTitle,
                    aspectLabel: shareCopy.aspectLabel,
                    closePreview: shareCopy.closePreview,
                    card: shareCopy.card,
                    actions: shareCopy.actions,
                  }}
                  eventLegacyId={eventLegacyId}
                  locale={locale}
                />
              ) : null}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
