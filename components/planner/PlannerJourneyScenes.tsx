import type { ScheduleDj, SchedulePerformance } from '../../lib/api';
import type { PlannerLandingData } from '../../lib/planner-landing';
import type { JourneyEntryFrom } from '../../lib/planner-journey';
import { getMessages, type Locale } from '../../lib/i18n';
import { PlannerScrollCta } from './PlannerScrollCta';
import { JourneyEntryFocus } from './JourneyEntryFocus';
import { JourneySelectedArtists } from './JourneySelectedArtists';

type PlannerJourneyScenesProps = {
  locale: Locale;
  legacyId: number;
  landing: PlannerLandingData;
  lineupHref: string;
  entryFrom?: JourneyEntryFrom;
  djs: ScheduleDj[];
  performances: SchedulePerformance[];
};

export function PlannerJourneyScenes({
  locale,
  legacyId,
  landing,
  lineupHref,
  entryFrom,
  djs,
  performances,
}: PlannerJourneyScenesProps) {
  const t = getMessages(locale);
  const landingCopy = t.aiPlanner.landing;
  const journeyCopy = t.aiPlanner.journey;
  const scenes = journeyCopy.scenes;
  const { exampleTrip, demoPlan, lineupIntel, travelSteps, stayStory } = landing;

  const flightRoute = landingCopy.flightRoute
    .replace('{origin}', exampleTrip.origin)
    .replace('{destination}', exampleTrip.destination);

  const mustSee = lineupIntel.mustSeeSets.slice(0, 4);
  const recommended = lineupIntel.recommendedArtists
    .filter((artist) => !mustSee.some((set) => set.artist === artist))
    .slice(0, 3);
  const hiddenGems = lineupIntel.hiddenGems.slice(0, 2);
  const setDays = demoPlan.artistTimeline.days.slice(0, 2).map((day) => ({
    ...day,
    sets: day.sets.slice(0, 4),
  }));
  const packing = exampleTrip.packing.slice(0, 4);
  const genreWhisper = lineupIntel.genres.slice(0, 2).join(locale === 'zh' ? ' · ' : ' · ');

  return (
    <div className="plan-journey__scenes">
      <JourneyEntryFocus entryFrom={entryFrom} />

      <p className="plan-journey__bridge">{landing.journeyBridge}</p>

      {/* Travel Timeline — emotional progression */}
      <section
        id="journey-timeline"
        className="plan-journey__scene plan-journey__scene--timeline"
        aria-labelledby="journey-timeline-heading"
      >
        <div className="plan-journey__scene-glow" aria-hidden />
        <header className="plan-journey__scene-head">
          <h2 id="journey-timeline-heading" className="plan-journey__scene-title">
            {landingCopy.timelineTitle}
          </h2>
          <p className="plan-journey__scene-lead">{landingCopy.timelineLead}</p>
        </header>

        <ol className="plan-journey__timeline">
          {travelSteps.map((step, index) => (
            <li className="plan-journey__timeline-step" key={`${step.label}-${step.title}`}>
              <span className="plan-journey__timeline-index" aria-hidden>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="plan-journey__timeline-body">
                <span className="plan-journey__timeline-label">{step.label}</span>
                <h3 className="plan-journey__timeline-title">{step.title}</h3>
                {step.feeling ? <p className="plan-journey__timeline-feeling">{step.feeling}</p> : null}
                <p className="plan-journey__timeline-detail">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Stay — Travel Story */}
      <section
        id="journey-stay"
        className="plan-journey__scene plan-journey__scene--stay"
        aria-labelledby="journey-stay-heading"
      >
        <div className="plan-journey__scene-glow" aria-hidden />
        <header className="plan-journey__scene-head">
          <h2 id="journey-stay-heading" className="plan-journey__scene-title">
            {scenes.stayTitle}
          </h2>
        </header>

        <div className="plan-journey__stay">
          <p className="plan-journey__stay-primary">{stayStory.primary}</p>
          <p className="plan-journey__stay-why">{stayStory.why}</p>
          {stayStory.areas ? (
            <p className="plan-journey__stay-areas">
              <span>{landingCopy.stayAreas}</span>
              <strong>{stayStory.areas}</strong>
            </p>
          ) : null}

          <aside className="plan-journey__travel-support" aria-label={scenes.travelSupportAria}>
            <div className="plan-journey__support-item">
              <p className="plan-journey__support-label">{landingCopy.flightStrategy}</p>
              <p className="plan-journey__support-value">{flightRoute}</p>
              <p className="plan-journey__support-detail">{demoPlan.travel.flight}</p>
              {exampleTrip.flightPrice ? (
                <p className="plan-journey__support-meta">{exampleTrip.flightPrice}</p>
              ) : null}
            </div>
            <div className="plan-journey__support-item">
              <p className="plan-journey__support-label">{landingCopy.transport}</p>
              <p className="plan-journey__support-detail">{demoPlan.travel.transport}</p>
              {exampleTrip.hotelToFestival ? (
                <p className="plan-journey__support-meta">{exampleTrip.hotelToFestival}</p>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      {/* Music Plan — Artist Spotlight */}
      <section
        id="journey-music"
        className="plan-journey__scene plan-journey__scene--music"
        aria-labelledby="journey-music-heading"
      >
        <div className="plan-journey__scene-glow plan-journey__scene-glow--music" aria-hidden />
        <header className="plan-journey__scene-head">
          <h2 id="journey-music-heading" className="plan-journey__scene-title">
            {scenes.musicTitle}
          </h2>
          <p className="plan-journey__scene-lead plan-journey__scene-lead--vibe">{demoPlan.vibe}</p>
          {genreWhisper ? <p className="plan-journey__genre-whisper">{genreWhisper}</p> : null}
        </header>

        <JourneySelectedArtists
          locale={locale}
          legacyId={legacyId}
          lineupHref={lineupHref}
          djs={djs}
          performances={performances}
        />

        <div className="plan-journey__spotlight-block">
          <h3 className="plan-journey__subhead">{landingCopy.lineupMustSee}</h3>
          {mustSee.length ? (
            <ul className="plan-journey__spotlight">
              {mustSee.map((set) => (
                <li key={`${set.artist}-${set.time ?? ''}`}>
                  <span className="plan-journey__artist-name">{set.artist}</span>
                  {set.reason ? <span className="plan-journey__artist-reason">{set.reason}</span> : null}
                  {(set.time || set.stage) && (
                    <span className="plan-journey__artist-meta">
                      {[set.time, set.stage].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="plan-journey__empty">{landingCopy.lineupEmpty}</p>
          )}
        </div>

        {setDays.length ? (
          <div className="plan-journey__set-plan">
            <h3 className="plan-journey__subhead">{journeyCopy.experience.timeline}</h3>
            <div className="plan-journey__set-days">
              {setDays.map((day) => (
                <section className="plan-journey__set-day" key={day.label}>
                  <h4 className="plan-journey__set-day-label">{day.label}</h4>
                  <ol className="plan-journey__set-list">
                    {day.sets.map((set) => (
                      <li
                        className={`plan-journey__set-item${set.highlight ? ' is-highlight' : ''}`}
                        key={`${day.label}-${set.time}-${set.artist}`}
                      >
                        <span className="plan-journey__set-time">{set.time}</span>
                        <div className="plan-journey__set-copy">
                          <p className="plan-journey__set-artist">{set.artist}</p>
                          <p className="plan-journey__set-stage">{set.stage}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <p className="plan-journey__empty">{journeyCopy.experience.timelineEmpty}</p>
        )}

        {(recommended.length > 0 || hiddenGems.length > 0) && (
          <details className="plan-journey__more-music">
            <summary>{scenes.moreMusic}</summary>
            <div className="plan-journey__more-music-body">
              {recommended.length ? (
                <div>
                  <h3 className="plan-journey__subhead">{landingCopy.lineupRecommended}</h3>
                  <ul className="plan-journey__artist-list plan-journey__artist-list--quiet">
                    {recommended.map((artist) => (
                      <li key={artist}>
                        <span className="plan-journey__artist-name">{artist}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {hiddenGems.length ? (
                <div>
                  <h3 className="plan-journey__subhead">{landingCopy.lineupHiddenGems}</h3>
                  <ul className="plan-journey__artist-list plan-journey__artist-list--quiet">
                    {hiddenGems.map((artist) => (
                      <li key={artist}>
                        <span className="plan-journey__artist-name">{artist}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </details>
        )}
      </section>

      {/* Budget Confidence */}
      <section
        id="journey-budget"
        className="plan-journey__scene plan-journey__scene--budget"
        aria-labelledby="journey-budget-heading"
      >
        <div className="plan-journey__scene-glow" aria-hidden />
        <header className="plan-journey__scene-head">
          <h2 id="journey-budget-heading" className="plan-journey__scene-title">
            {landingCopy.budgetTitle}
          </h2>
          <p className="plan-journey__scene-lead">
            {landing.budgetInsight || landingCopy.budgetLead}
          </p>
        </header>

        <div className="plan-journey__budget">
          <p className="plan-journey__budget-total">{landing.budgetTotal}</p>
          <p className="plan-journey__budget-caption">{journeyCopy.budget.estimatedTotal}</p>

          <ul className="plan-journey__budget-rows">
            {demoPlan.budget.items.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <span>{item.amount}</span>
              </li>
            ))}
          </ul>

          {landing.travelData.stay.items.groupNote ? (
            <p className="plan-journey__budget-note">{landing.travelData.stay.items.groupNote}</p>
          ) : null}
        </div>
      </section>

      {/* Checklist */}
      <section
        id="journey-checklist"
        className="plan-journey__scene plan-journey__scene--checklist"
        aria-labelledby="journey-checklist-heading"
      >
        <header className="plan-journey__scene-head">
          <h2 id="journey-checklist-heading" className="plan-journey__scene-title">
            {landingCopy.packingTitle}
          </h2>
          <p className="plan-journey__scene-lead">{landingCopy.packingLead}</p>
        </header>

        <ul className="plan-journey__checklist">
          {packing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Confidence beat + Final CTA */}
      <section
        id="journey-cta"
        className="plan-journey__scene plan-journey__scene--cta"
        aria-labelledby="journey-cta-heading"
      >
        <div className="plan-journey__final-cta">
          <p className="plan-journey__ready">{scenes.readyLine}</p>
          <h2 id="journey-cta-heading" className="plan-journey__final-title">
            {landingCopy.ctaTitle}
          </h2>
          <p className="plan-journey__final-lead">{landingCopy.ctaLead}</p>
          <p className="plan-journey__next-step">{scenes.nextStep}</p>
          <PlannerScrollCta
            label={landingCopy.ctaButton}
            className="button button--glow plan-journey__final-button"
          />
        </div>
      </section>
    </div>
  );
}
