'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Heart,
  MapPin,
  Music2,
  Plane,
  Search,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import type { Activity } from '../../lib/types';
import {
  generateRavenPlanAsync,
  getRavenPlanGenerationJob,
  type RavenPlanGenerationPayload,
  type RavenTravelGuidePlan,
  type ScheduleDj,
  type SchedulePerformance,
} from '../../lib/api';
import { getMessages, type Locale } from '../../lib/i18n';
import { readLineupSelection } from '../../lib/lineup-selection';
import { resolveSelectedArtistNames } from '../../lib/planner-selection';
import {
  buildPlannerPlan,
  type JourneyType,
  type PersonalPriority,
  type PlannerPlan,
  type PlannerTimelineDay,
  type PlannerPreferences,
  type StayPreference,
  type TravelStyle,
} from '../../lib/planner-plan';
import { TrackedLink } from '../TrackedLink';
import { EventImage } from '../EventImage';

type FlowPhase = 'setup' | 'generating' | 'result';

type SetupStepId = 'origin' | 'travelStyle' | 'stay' | 'journey' | 'priority';

const SETUP_STEPS: SetupStepId[] = ['origin', 'travelStyle', 'stay', 'journey', 'priority'];

const TRAVEL_STYLE_ICONS = {
  budget: Wallet,
  smart: Compass,
  premium: Sparkles,
} as const;

const STAY_ICONS = {
  festival: MapPin,
  city: Compass,
  value: Wallet,
} as const;

const JOURNEY_ICONS = {
  solo: Compass,
  friends: Users,
  couple: Heart,
  tribe: Users,
} as const;

const PRIORITY_ICONS = {
  artists: Music2,
  discover: Sparkles,
  party: Music2,
  city: MapPin,
  people: Users,
  budget: Wallet,
} as const;

type AiPlannerFlowProps = {
  locale: Locale;
  activity: Activity;
  eventTitle: string;
  metaDate: string;
  metaLocation: string;
  djs: ScheduleDj[];
  performances: SchedulePerformance[];
  eventPath: string;
  image?: string;
  waitlistHref: string;
  hideHeader?: boolean;
  initialRemotePlan?: RavenTravelGuidePlan | null;
};

function createGuideId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `raven-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toBudgetTier(style: TravelStyle): RavenPlanGenerationPayload['budgetTier'] {
  if (style === 'budget') return 'economy';
  if (style === 'premium') return 'comfort';
  return 'standard';
}

function headcountFor(journey: JourneyType): number {
  if (journey === 'solo') return 1;
  if (journey === 'couple') return 2;
  if (journey === 'tribe') return 4;
  return 3;
}

function mapRemoteTimeline(plan: RavenTravelGuidePlan): PlannerTimelineDay[] {
  return (
    plan.itinerary?.days
      .map((day) => {
        const sets = day.lines
          .map((line, index) => {
            const text = line.trim();
            if (!text) return null;

            const matched = text.match(/^(\d{1,2}:\d{2})\s*[-–:：]?\s*(.+)$/);
            if (matched) {
              const [, time, detail] = matched;
              return {
                time,
                artist: detail.trim(),
                stage: plan.itinerary?.title || day.label,
              };
            }

            return {
              time: `${index + 1}`.padStart(2, '0'),
              artist: text,
              stage: plan.itinerary?.title || day.label,
            };
          })
          .filter((set): set is PlannerTimelineDay['sets'][number] => Boolean(set));

        if (!sets.length) return null;
        return {
          label: day.label,
          sets,
        };
      })
      .filter((day): day is PlannerTimelineDay => Boolean(day)) ?? []
  );
}

function estimateBudgetAmount(value: string): number | null {
  const amounts = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!amounts.length) return null;
  return amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
}

function mapRemotePlan(plan: RavenTravelGuidePlan, fallbackTimeline: PlannerPlan['artistTimeline']): PlannerPlan {
  const hotels = plan.accommodation.hotels.map((hotel) => `${hotel.name}${hotel.note ? ` - ${hotel.note}` : ''}`);
  const venueTransport = plan.venueTransport?.options.flatMap((option) => option.lines) ?? [];
  const budgetItems = plan.budget?.items ?? [];
  const budgetAmounts = budgetItems.map((item) => estimateBudgetAmount(item.range));
  const budgetTotal = budgetAmounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
  const remoteTimeline = mapRemoteTimeline(plan);

  return {
    vibe: [plan.activityName, plan.eventDates, plan.venue].filter(Boolean).join(' · '),
    experiences: plan.tips.items.length ? plan.tips.items : plan.nightlife.spots.map((spot) => spot.name),
    artistTimeline: remoteTimeline.length ? { days: remoteTimeline } : fallbackTimeline,
    travel: {
      stay: hotels.join('；') || plan.accommodation.title,
      flight: plan.transport.lines.join('；') || plan.transport.title,
      transport: venueTransport.join('；') || plan.parking?.lines.join('；') || plan.venueTransport?.title || '',
    },
    budget: {
      total: plan.budget?.title || plan.budgetLabel,
      items: budgetItems.map((item, index) => ({
        label: item.label,
        amount: item.range,
        share:
          budgetTotal > 0 && budgetAmounts[index] != null
            ? Math.round(((budgetAmounts[index] ?? 0) / budgetTotal) * 100)
            : undefined,
      })),
    },
  };
}

export function AiPlannerFlow({
  locale,
  activity,
  eventTitle,
  metaDate,
  metaLocation,
  djs,
  performances,
  eventPath,
  image,
  waitlistHref,
  hideHeader = false,
  initialRemotePlan = null,
}: AiPlannerFlowProps) {
  const t = getMessages(locale);
  const copy = t.aiPlanner;

  const [phase, setPhase] = useState<FlowPhase>(() => (initialRemotePlan ? 'result' : 'setup'));
  const [stepIndex, setStepIndex] = useState(0);
  const [originQuery, setOriginQuery] = useState('');
  const [favoriteArtists, setFavoriteArtists] = useState<string[]>([]);
  const [generationStep, setGenerationStep] = useState(0);
  const [plan, setPlan] = useState<PlannerPlan | null>(() =>
    initialRemotePlan ? mapRemotePlan(initialRemotePlan, { days: [] }) : null,
  );
  const [generationRequest, setGenerationRequest] = useState<RavenPlanGenerationPayload | null>(null);

  const [preferences, setPreferences] = useState<PlannerPreferences>({
    origin: '',
    travelStyle: 'smart',
    stayPreference: 'festival',
    journeyType: 'friends',
    priorities: [],
  });

  const fallbackPlan = useCallback(
    () =>
      buildPlannerPlan(
        activity,
        djs,
        performances,
        favoriteArtists,
        preferences,
        locale,
        copy.planLabels,
      ),
    [activity, copy.planLabels, djs, favoriteArtists, locale, performances, preferences],
  );

  const currentStep = SETUP_STEPS[stepIndex];

  useEffect(() => {
    const selection = readLineupSelection(activity.legacyId);
    setFavoriteArtists(resolveSelectedArtistNames(selection, djs, performances));
  }, [activity.legacyId, djs, performances]);

  const filteredOrigins = useMemo(() => {
    const query = originQuery.trim().toLowerCase();
    if (!query) return copy.steps.origin.presets;
    return copy.steps.origin.presets.filter((city) => city.toLowerCase().includes(query));
  }, [copy.steps.origin.presets, originQuery]);

  const canContinue = useMemo(() => {
    if (currentStep === 'origin') return preferences.origin.length > 0;
    if (currentStep === 'priority') return preferences.priorities.length > 0;
    return true;
  }, [currentStep, preferences.origin, preferences.priorities.length]);

  const startGeneration = useCallback(() => {
    setPhase('generating');
    setGenerationStep(0);
    setGenerationRequest({
      guideId: createGuideId(),
      departure: preferences.origin,
      headcount: headcountFor(preferences.journeyType),
      budgetTier: toBudgetTier(preferences.travelStyle),
      note: preferences.priorities.map((priority) => copy.steps.priority.options[priority].title).join('；'),
    });
  }, [copy.steps.priority.options, preferences]);

  useEffect(() => {
    if (phase !== 'generating' || !generationRequest) return;

    const controller = new AbortController();
    let cancelled = false;
    const poll = async () => {
      try {
        const { jobId } = await generateRavenPlanAsync(activity.legacyId, generationRequest);
        while (!cancelled) {
          const job = await getRavenPlanGenerationJob(jobId, controller.signal);
          if (job.progress) {
            setGenerationStep(Math.min(copy.generation.steps.length, Math.ceil((job.progress.percent / 100) * copy.generation.steps.length)));
          }
          if (job.status === 'completed' && job.plan) {
            setPlan(mapRemotePlan(job.plan, fallbackPlan().artistTimeline));
            setPhase('result');
            return;
          }
          if (job.status === 'failed') throw new Error(job.errorMessage || '攻略生成失败，请稍后重试');
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === 'AbortError')) {
          window.alert(error instanceof Error ? error.message : '攻略生成失败，请稍后重试');
          setPhase('setup');
        }
      }
    };

    void poll();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activity.legacyId, copy.generation.steps.length, fallbackPlan, generationRequest, phase]);

  const goNext = () => {
    if (stepIndex < SETUP_STEPS.length - 1) {
      setStepIndex((value) => value + 1);
      return;
    }
    startGeneration();
  };

  const goBack = () => {
    if (phase === 'result') {
      setPhase('setup');
      setStepIndex(SETUP_STEPS.length - 1);
      return;
    }
    if (stepIndex > 0) setStepIndex((value) => value - 1);
  };

  const togglePriority = (priority: PersonalPriority) => {
    setPreferences((prev) => {
      const exists = prev.priorities.includes(priority);
      return {
        ...prev,
        priorities: exists
          ? prev.priorities.filter((item) => item !== priority)
          : [...prev.priorities, priority],
      };
    });
  };

  const progressLabel = copy.progress
    .replace('{current}', String(stepIndex + 1))
    .replace('{total}', String(SETUP_STEPS.length));
  const resultMeta = [metaLocation, metaDate].filter(Boolean).join(' · ');

  return (
    <div className="plan-flow">
      {hideHeader ? (
        <header className="plan-flow__intro plan-flow__intro--quiet">
          <h2 className="plan-flow__intro-title">{t.aiPlanner.landing.plannerCustomize}</h2>
          <p className="plan-flow__intro-lead">{t.aiPlanner.landing.plannerLead}</p>
          {favoriteArtists.length ? (
            <div className="plan-flow__intro-artists">
              <ul className="plan-flow__intro-chips">
                {favoriteArtists.map((artist) => (
                  <li key={artist}>{artist}</li>
                ))}
              </ul>
              <TrackedLink
                className="plan-flow__intro-edit"
                href={eventPath}
                eventName="planner_edit_artists_click"
                eventProperties={{ event: String(activity.legacyId), locale }}
              >
                {copy.contextArtistsEdit}
              </TrackedLink>
            </div>
          ) : null}
        </header>
      ) : (
        <header className="plan-context" data-reveal>
          <div className="plan-context__copy">
            <span className="plan-context__badge">
              <Sparkles size={12} strokeWidth={2.25} aria-hidden />
              {copy.badge}
            </span>
            <h2 className="plan-context__title">{eventTitle}</h2>
            <div className="plan-context__meta">
              {metaLocation ? <span>{metaLocation}</span> : null}
              {metaDate ? <span>{metaDate}</span> : null}
            </div>
          </div>

          <div className="plan-context__artists">
            <div className="plan-context__artists-head">
              <span className="plan-context__artists-label">{copy.contextArtists}</span>
              <TrackedLink
                className="plan-context__artists-edit"
                href={eventPath}
                eventName="planner_edit_artists_click"
                eventProperties={{ event: String(activity.legacyId), locale }}
              >
                {copy.contextArtistsEdit}
              </TrackedLink>
            </div>
            {favoriteArtists.length ? (
              <ul className="plan-context__artist-list">
                {favoriteArtists.map((artist) => (
                  <li className="plan-context__artist-chip" key={artist}>
                    {artist}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="plan-context__artists-empty">{copy.contextArtistsEmpty}</p>
            )}
          </div>
        </header>
      )}

      {phase === 'setup' ? (
        <section className="plan-setup" aria-live="polite">
          <div className="plan-setup__head">
            <span className="plan-setup__progress">{progressLabel}</span>
            <div className="plan-setup__track" aria-hidden>
              {SETUP_STEPS.map((step, index) => (
                <span
                  key={step}
                  className={[
                    'plan-setup__dot',
                    index <= stepIndex ? 'is-complete' : '',
                    index === stepIndex ? 'is-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              ))}
            </div>
          </div>

          {currentStep === 'origin' ? (
            <div className="plan-step">
              <h2 className="plan-step__question">{copy.steps.origin.question}</h2>
              <p className="plan-step__lead">{copy.steps.origin.lead}</p>
              <label className="plan-step__search">
                <Search size={16} strokeWidth={2} aria-hidden />
                <input
                  type="search"
                  value={originQuery}
                  onChange={(event) => setOriginQuery(event.target.value)}
                  placeholder={copy.steps.origin.searchPlaceholder}
                  autoComplete="off"
                />
              </label>
              <div className="plan-step__cards plan-step__cards--locations">
                {filteredOrigins.map((city) => {
                  const selected = preferences.origin === city;
                  return (
                    <button
                      key={city}
                      type="button"
                      className={`plan-option-card plan-option-card--location${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          origin: city,
                        }))
                      }
                    >
                      <span className="plan-option-card__icon" aria-hidden>
                        <MapPin size={18} strokeWidth={2} />
                      </span>
                      <span className="plan-option-card__title">{city}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {currentStep === 'travelStyle' ? (
            <div className="plan-step">
              <h2 className="plan-step__question">{copy.steps.travelStyle.question}</h2>
              <p className="plan-step__lead">{copy.steps.travelStyle.lead}</p>
              <div className="plan-step__cards">
                {(Object.keys(copy.steps.travelStyle.options) as TravelStyle[]).map((key) => {
                  const option = copy.steps.travelStyle.options[key];
                  const Icon = TRAVEL_STYLE_ICONS[key];
                  const selected = preferences.travelStyle === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`plan-option-card${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          travelStyle: key,
                        }))
                      }
                    >
                      <span className="plan-option-card__icon" aria-hidden>
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="plan-option-card__title">{option.title}</span>
                      <span className="plan-option-card__description">{option.description}</span>
                      <span className="plan-option-card__experience">{option.experience}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {currentStep === 'stay' ? (
            <div className="plan-step">
              <h2 className="plan-step__question">{copy.steps.stay.question}</h2>
              <p className="plan-step__lead">{copy.steps.stay.lead}</p>
              <div className="plan-step__cards">
                {(Object.keys(copy.steps.stay.options) as StayPreference[]).map((key) => {
                  const option = copy.steps.stay.options[key];
                  const Icon = STAY_ICONS[key];
                  const selected = preferences.stayPreference === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`plan-option-card${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          stayPreference: key,
                        }))
                      }
                    >
                      <span className="plan-option-card__icon" aria-hidden>
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="plan-option-card__title">{option.title}</span>
                      <span className="plan-option-card__description">{option.description}</span>
                      <span className="plan-option-card__experience">{option.experience}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {currentStep === 'journey' ? (
            <div className="plan-step">
              <h2 className="plan-step__question">{copy.steps.journey.question}</h2>
              <p className="plan-step__lead">{copy.steps.journey.lead}</p>
              <div className="plan-step__cards">
                {(Object.keys(copy.steps.journey.options) as JourneyType[]).map((key) => {
                  const option = copy.steps.journey.options[key];
                  const Icon = JOURNEY_ICONS[key];
                  const selected = preferences.journeyType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`plan-option-card${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          journeyType: key,
                        }))
                      }
                    >
                      <span className="plan-option-card__icon" aria-hidden>
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="plan-option-card__title">{option.title}</span>
                      <span className="plan-option-card__description">{option.description}</span>
                      <span className="plan-option-card__experience">{option.experience}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {currentStep === 'priority' ? (
            <div className="plan-step">
              <h2 className="plan-step__question">{copy.steps.priority.question}</h2>
              <p className="plan-step__lead">{copy.steps.priority.lead}</p>
              <div className="plan-step__cards plan-step__cards--priorities">
                {(Object.keys(copy.steps.priority.options) as PersonalPriority[]).map((key) => {
                  const option = copy.steps.priority.options[key];
                  const Icon = PRIORITY_ICONS[key];
                  const selected = preferences.priorities.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`plan-option-card plan-option-card--priority${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => togglePriority(key)}
                    >
                      <span className="plan-option-card__icon" aria-hidden>
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="plan-option-card__title">{option.title}</span>
                      <span className="plan-option-card__description">{option.description}</span>
                      {selected ? (
                        <span className="plan-option-card__check" aria-hidden>
                          <Check size={14} strokeWidth={2.5} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <footer className="plan-setup__footer">
            <button
              type="button"
              className="button secondary plan-setup__back"
              onClick={goBack}
              disabled={stepIndex === 0}
            >
              <ArrowLeft size={15} strokeWidth={2.25} aria-hidden />
              {copy.nav.back}
            </button>
            <button
              type="button"
              className="button plan-setup__continue"
              onClick={goNext}
              disabled={!canContinue}
            >
              {stepIndex === SETUP_STEPS.length - 1 ? copy.nav.create : copy.nav.continue}
              <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
            </button>
          </footer>
        </section>
      ) : null}

      {phase === 'generating' ? (
        <section className="plan-generation" aria-live="polite">
          <div className="plan-generation__glow" aria-hidden />
          <div className="plan-generation__icon" aria-hidden>
            <Sparkles size={22} strokeWidth={2} />
          </div>
          <h2 className="plan-generation__title">{copy.generation.title}</h2>
          <p className="plan-generation__lead">{copy.generation.lead}</p>
          <ol className="plan-generation__steps">
            {copy.generation.steps.map((label, index) => {
              const active = generationStep > index;
              const current = generationStep === index;
              return (
                <li
                  key={label}
                  className={[
                    'plan-generation__step',
                    active ? 'is-complete' : '',
                    current ? 'is-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="plan-generation__step-indicator" aria-hidden>
                    {active ? <Check size={12} strokeWidth={2.5} /> : index + 1}
                  </span>
                  <span>{label}</span>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {phase === 'result' && plan ? (
        <section className="plan-result">
          <header className="plan-result__hero">
            {image ? (
              <EventImage
                src={image}
                alt=""
                className="plan-result__hero-image"
                sizes="(max-width: 960px) 100vw, 80vw"
              />
            ) : null}
            <div className="plan-result__hero-scrim" aria-hidden />
            <div className="plan-result__hero-glow" aria-hidden />
            <div className="plan-result__header">
              <span className="plan-result__badge">{copy.result.badge}</span>
              <h2 className="plan-result__title">{eventTitle}</h2>
              <p className="plan-result__lead">{copy.result.lead}</p>
              {resultMeta ? <p className="plan-result__meta">{resultMeta}</p> : null}
              {favoriteArtists.length ? (
                <ul className="plan-result__artist-chips" aria-label={copy.contextArtists}>
                  {favoriteArtists.slice(0, 4).map((artist) => (
                    <li key={artist}>{artist}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </header>

          <div className="plan-result__scenes">
            <article className="plan-result__scene plan-result__scene--opening">
              <header className="plan-result__scene-head">
                <h3 className="plan-result__scene-title">{copy.result.summaryTitle}</h3>
              </header>
              <div className="plan-result__summary-block">
                <span className="plan-result__label">{copy.result.vibeLabel}</span>
                <p className="plan-result__value plan-result__value--vibe">{plan.vibe}</p>
              </div>
              <div className="plan-result__summary-block">
                <span className="plan-result__label">{copy.result.experienceLabel}</span>
                <ul className="plan-result__experience-list">
                  {plan.experiences.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="plan-result__scene plan-result__scene--timeline">
              <header className="plan-result__scene-head">
                <h3 className="plan-result__scene-title">{copy.result.artistTitle}</h3>
              </header>
              {plan.artistTimeline.days.length ? (
                <div className="ai-planner__timeline">
                  {plan.artistTimeline.days.map((day) => (
                    <section className="ai-planner__timeline-day" key={day.label}>
                      <h4 className="ai-planner__timeline-day-label">{day.label}</h4>
                      <ol className="ai-planner__timeline-sets">
                        {day.sets.map((set) => (
                          <li
                            className={`ai-planner__timeline-set${set.highlight ? ' is-highlight' : ''}`}
                            key={`${day.label}-${set.time}-${set.artist}`}
                          >
                            <span className="ai-planner__timeline-time">{set.time}</span>
                            <div className="ai-planner__timeline-set-copy">
                              <p className="ai-planner__timeline-artist">{set.artist}</p>
                              <p className="ai-planner__timeline-stage">{set.stage}</p>
                            </div>
                            <Music2 size={13} strokeWidth={2} aria-hidden />
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="plan-result__value plan-result__value--muted">{copy.result.artistTimelineEmpty}</p>
              )}
            </article>

            <article className="plan-result__scene plan-result__scene--travel">
              <header className="plan-result__scene-head">
                <h3 className="plan-result__scene-title">{copy.result.travelTitle}</h3>
              </header>
              <ol className="plan-result__travel-rows">
                <li className="plan-result__travel-row">
                  <span className="plan-result__travel-icon" aria-hidden>
                    <MapPin size={15} strokeWidth={2} />
                  </span>
                  <div>
                    <span className="plan-result__label">{copy.result.travelStay}</span>
                    <p className="plan-result__value">{plan.travel.stay}</p>
                  </div>
                </li>
                <li className="plan-result__travel-row">
                  <span className="plan-result__travel-icon" aria-hidden>
                    <Plane size={15} strokeWidth={2} />
                  </span>
                  <div>
                    <span className="plan-result__label">{copy.result.travelFlight}</span>
                    <p className="plan-result__value">{plan.travel.flight}</p>
                  </div>
                </li>
                <li className="plan-result__travel-row">
                  <span className="plan-result__travel-icon" aria-hidden>
                    <Compass size={15} strokeWidth={2} />
                  </span>
                  <div>
                    <span className="plan-result__label">{copy.result.travelTransport}</span>
                    <p className="plan-result__value">{plan.travel.transport}</p>
                  </div>
                </li>
              </ol>
            </article>

            <article className="plan-result__scene plan-result__scene--budget">
              <header className="plan-result__scene-head">
                <h3 className="plan-result__scene-title">{copy.result.budgetTitle}</h3>
              </header>
              <div className="plan-result__budget-hero">
                <span className="plan-result__label">{copy.result.budgetTotal}</span>
                <p className="plan-result__budget-total">{plan.budget.total}</p>
              </div>
              <ul className="ai-planner__budget-list">
                {plan.budget.items.map((item) => (
                  <li className="ai-planner__budget-row" key={item.label}>
                    <div className="ai-planner__budget-row-head">
                      <span>{item.label}</span>
                      <span>{item.amount}</span>
                    </div>
                    {item.share != null ? (
                      <span className="ai-planner__budget-track" aria-hidden>
                        <span className="ai-planner__budget-fill" style={{ width: `${item.share}%` }} />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <footer className="plan-result__footer">
            <TrackedLink
              className="button"
              href={waitlistHref}
              eventName="planner_create_plan_click"
              eventProperties={{ event: String(activity.legacyId), locale, source: 'planner-result' }}
            >
              {copy.result.primaryCta}
              <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
            </TrackedLink>
            <button type="button" className="button secondary" onClick={goBack}>
              {copy.result.secondaryCta}
            </button>
          </footer>
        </section>
      ) : null}
    </div>
  );
}
