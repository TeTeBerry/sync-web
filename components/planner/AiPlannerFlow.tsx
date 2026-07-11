'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Heart,
  MapPin,
  Music2,
  RotateCcw,
  Search,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import type { Activity } from '../../lib/types';
import {
  fetchRavenPlaceSuggestions,
  generateRavenPlanAsync,
  getRavenPlanGenerationJob,
  isRavenApiStatusError,
  type RavenPlaceSuggestion,
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
  type PlannerPreferences,
  type StayPreference,
  type TravelStyle,
} from '../../lib/planner-plan';
import { resolveResultPlan, shouldSeedSharedPlan } from '../../lib/planner-result';
import {
  buildOriginOptions,
  isOriginOptionSelected,
  type PlannerOriginListItem,
} from '../../lib/planner-origin';
import { buildRavenJourneyView } from '../../lib/raven-journey';
import { resolveGenerationStep } from '../../lib/planner-generation-progress';
import { TrackedLink } from '../TrackedLink';
import { EventImage } from '../EventImage';
import { RavenJourneyResult } from './RavenJourneyResult';
import { JourneyReveal } from './JourneyReveal';
import { eventPlanPath } from '../../lib/event-slug';
import { getSiteUrl } from '../../lib/site';

type FlowPhase = 'setup' | 'generating' | 'result' | 'error';

type SetupStepId = 'origin' | 'travelStyle' | 'stay' | 'journey' | 'priority';

const SETUP_STEPS: SetupStepId[] = ['origin', 'travelStyle', 'stay', 'journey', 'priority'];
const PLANNER_PREFERENCES_STORAGE_PREFIX = 'raven-plan-preferences';
const ORIGIN_SUGGEST_DEBOUNCE_MS = 200;
const DEFAULT_PREFERENCES: PlannerPreferences = {
  origin: '',
  travelStyle: 'smart',
  stayPreference: 'festival',
  journeyType: 'friends',
  priorities: [],
};

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
  initialGuideId?: string | null;
  onPhaseChange?: (phase: FlowPhase) => void;
};

function createGuideId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `raven-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function plannerPreferencesStorageKey(activityLegacyId: number): string {
  return `${PLANNER_PREFERENCES_STORAGE_PREFIX}:${activityLegacyId}`;
}

function readPlannerPreferences(activityLegacyId: number): PlannerPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(plannerPreferencesStorageKey(activityLegacyId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PlannerPreferences>;
    if (
      typeof value.origin !== 'string' ||
      !['budget', 'smart', 'premium'].includes(value.travelStyle ?? '') ||
      !['festival', 'city', 'value'].includes(value.stayPreference ?? '') ||
      !['solo', 'friends', 'couple', 'tribe'].includes(value.journeyType ?? '') ||
      !Array.isArray(value.priorities)
    ) {
      return null;
    }

    return {
      origin: value.origin,
      travelStyle: value.travelStyle as TravelStyle,
      stayPreference: value.stayPreference as StayPreference,
      journeyType: value.journeyType as JourneyType,
      priorities: value.priorities.filter((priority): priority is PersonalPriority =>
        ['artists', 'discover', 'party', 'city', 'people', 'budget'].includes(priority),
      ),
    };
  } catch {
    return null;
  }
}

function writePlannerPreferences(activityLegacyId: number, preferences: PlannerPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      plannerPreferencesStorageKey(activityLegacyId),
      JSON.stringify(preferences),
    );
  } catch {
    // Local storage is optional; the current session still supports retrying.
  }
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

type OriginListItem = PlannerOriginListItem;

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
  initialGuideId = null,
  onPhaseChange,
}: AiPlannerFlowProps) {
  const t = getMessages(locale);
  const copy = t.aiPlanner;

  const [phase, setPhase] = useState<FlowPhase>(() => (initialRemotePlan ? 'result' : 'setup'));
  const [stepIndex, setStepIndex] = useState(0);
  const [originQuery, setOriginQuery] = useState('');
  const [remoteOriginSuggestions, setRemoteOriginSuggestions] = useState<RavenPlaceSuggestion[]>([]);
  const [originSuggestionsLoading, setOriginSuggestionsLoading] = useState(false);
  const [favoriteArtists, setFavoriteArtists] = useState<string[]>([]);
  const [generationStep, setGenerationStep] = useState(0);
  const [plan, setPlan] = useState<PlannerPlan | null>(() => {
    if (!initialRemotePlan) return null;
    // Sync-seed so ?guideId= does not flash an empty result before effects run.
    return resolveResultPlan(
      initialRemotePlan,
      buildPlannerPlan(
        activity,
        djs,
        performances,
        [],
        DEFAULT_PREFERENCES,
        locale,
        getMessages(locale).aiPlanner.planLabels,
      ),
      locale,
      { preferRemote: true },
    ).plan;
  });
  const [remotePlan, setRemotePlan] = useState<RavenTravelGuidePlan | null>(initialRemotePlan);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(initialGuideId);
  const [showLanguageCaveat, setShowLanguageCaveat] = useState(false);
  const [showJourneyReveal, setShowJourneyReveal] = useState(false);
  const [hasJourneyRevealed, setHasJourneyRevealed] = useState(false);
  const [generationRequest, setGenerationRequest] = useState<RavenPlanGenerationPayload | null>(null);
  const hasUserGeneratedRef = useRef(false);
  const sharedPlanSeededRef = useRef(false);

  const [preferences, setPreferences] = useState<PlannerPreferences>(DEFAULT_PREFERENCES);

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
  const fallbackPlanRef = useRef(fallbackPlan);
  fallbackPlanRef.current = fallbackPlan;
  const dismissJourneyReveal = useCallback((shouldAnimateResult = true) => {
    setShowJourneyReveal(false);
    setHasJourneyRevealed(shouldAnimateResult);
  }, []);

  const hasTimedSchedule = useMemo(
    () =>
      performances.some((performance) =>
        Boolean(
          (performance.stageLabel?.trim() || performance.stage?.trim()) &&
            performance.startTime?.trim(),
        ),
      ),
    [performances],
  );

  const scheduleDays = useMemo(
    () => (hasTimedSchedule ? fallbackPlan().artistTimeline.days : []),
    [fallbackPlan, hasTimedSchedule],
  );

  const currentStep = SETUP_STEPS[stepIndex];

  useEffect(() => {
    const selection = readLineupSelection(activity.legacyId);
    setFavoriteArtists(resolveSelectedArtistNames(selection, djs, performances));
  }, [activity.legacyId, djs, performances]);

  useEffect(() => {
    const restored = readPlannerPreferences(activity.legacyId);
    // Never restore a pre-selected origin — the departure step must start blank.
    setPreferences(
      restored ? { ...restored, origin: '' } : DEFAULT_PREFERENCES,
    );
    setOriginQuery('');
  }, [activity.legacyId]);

  useEffect(() => {
    if (
      !shouldSeedSharedPlan({
        hasInitialRemote: Boolean(initialRemotePlan),
        alreadySeeded: sharedPlanSeededRef.current,
        hasUserGenerated: hasUserGeneratedRef.current,
      })
    ) {
      return;
    }

    const resolved = resolveResultPlan(initialRemotePlan, fallbackPlan(), locale, {
      preferRemote: true,
    });
    sharedPlanSeededRef.current = true;
    setRemotePlan(initialRemotePlan);
    setActiveGuideId(initialGuideId);
    setPlan(resolved.plan);
    setShowLanguageCaveat(resolved.showLanguageCaveat);
    setPhase('result');
  }, [fallbackPlan, initialGuideId, initialRemotePlan, locale]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);

  useEffect(() => {
    if (currentStep !== 'origin') {
      setRemoteOriginSuggestions([]);
      setOriginSuggestionsLoading(false);
      return;
    }

    const query = originQuery.trim();
    if (!query) {
      setRemoteOriginSuggestions([]);
      setOriginSuggestionsLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setOriginSuggestionsLoading(true);
    const timer = window.setTimeout(() => {
      void fetchRavenPlaceSuggestions({
        keyword: query,
        limit: 12,
        signal: controller.signal,
      })
        .then((rows) => {
          if (cancelled) return;
          // Departure picker is city-only single-select.
          setRemoteOriginSuggestions(rows.filter((row) => row.kind === 'city'));
        })
        .catch(() => {
          if (cancelled) return;
          setRemoteOriginSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setOriginSuggestionsLoading(false);
        });
    }, ORIGIN_SUGGEST_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [currentStep, originQuery]);

  const originOptions = useMemo(
    (): OriginListItem[] =>
      buildOriginOptions({
        presets: copy.steps.origin.presets,
        query: originQuery,
        remote: remoteOriginSuggestions,
      }),
    [copy.steps.origin.presets, originQuery, remoteOriginSuggestions],
  );

  const canContinue = useMemo(() => {
    if (currentStep === 'origin') return preferences.origin.length > 0;
    if (currentStep === 'priority') return preferences.priorities.length > 0;
    return true;
  }, [currentStep, preferences.origin, preferences.priorities.length]);

  const selectOriginValue = useCallback((origin: string) => {
    setPreferences((prev) => ({
      ...prev,
      origin,
    }));
  }, []);

  const handleOriginOptionClick = useCallback(
    (item: OriginListItem) => {
      // Selection only — do not mutate the search box (avoids refetch flicker).
      selectOriginValue(item.originValue);
    },
    [selectOriginValue],
  );

  const startGeneration = useCallback(() => {
    hasUserGeneratedRef.current = true;
    writePlannerPreferences(activity.legacyId, preferences);
    setShowLanguageCaveat(false);
    setShowJourneyReveal(false);
    setHasJourneyRevealed(false);
    setPhase('generating');
    setGenerationStep(0);
    const guideId = createGuideId();
    setActiveGuideId(guideId);
    setGenerationRequest({
      guideId,
      departure: preferences.origin,
      headcount: headcountFor(preferences.journeyType),
      budgetTier: toBudgetTier(preferences.travelStyle),
      note: preferences.priorities
        .map((priority) => copy.steps.priority.options[priority].title)
        .join(locale === 'zh' ? '；' : '; '),
      locale,
    });
  }, [activity.legacyId, copy.steps.priority.options, locale, preferences]);

  useEffect(() => {
    if (phase !== 'generating' || !generationRequest) return;

    let cancelled = false;
    const controller = new AbortController();
    const isAbortError = (error: unknown) =>
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error instanceof Error && error.name === 'AbortError');
    const isTimeoutError = (error: unknown) =>
      (error instanceof DOMException && error.name === 'TimeoutError') ||
      (error instanceof Error && error.name === 'TimeoutError');
    const isRetryableRateLimit = (error: unknown) => isRavenApiStatusError(error, 429);
    const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const MAX_GENERATE_RATE_RETRIES = 4;
    const MAX_POLL_RATE_RETRIES = 8;

    const startJobWithRetry = async () => {
      let attempt = 0;
      while (!cancelled) {
        try {
          return await generateRavenPlanAsync(activity.legacyId, generationRequest);
        } catch (error) {
          if (cancelled || isAbortError(error)) throw error;
          // Brief backoff for transient 429 (Strict Mode double-start / short bursts).
          if (isRetryableRateLimit(error) && attempt < MAX_GENERATE_RATE_RETRIES) {
            attempt += 1;
            await wait(1500 * attempt);
            continue;
          }
          throw error;
        }
      }
      throw new DOMException('Aborted', 'AbortError');
    };

    const poll = async () => {
      try {
        const { jobId } = await startJobWithRetry();
        if (cancelled) return;
        let pollRateLimitHits = 0;
        while (!cancelled) {
          let job;
          try {
            job = await getRavenPlanGenerationJob(jobId, controller.signal);
            pollRateLimitHits = 0;
          } catch (error) {
            if (cancelled || isAbortError(error)) return;
            // Transient poll timeout — keep waiting on the same job.
            if (isTimeoutError(error)) {
              await wait(1500);
              continue;
            }
            if (isRetryableRateLimit(error)) {
              pollRateLimitHits += 1;
              if (pollRateLimitHits > MAX_POLL_RATE_RETRIES) throw error;
              await wait(1500 * Math.min(pollRateLimitHits, 4));
              continue;
            }
            throw error;
          }
          if (cancelled) return;
          setGenerationStep(resolveGenerationStep(job, copy.generation.steps.length));
          if (job.status === 'completed' && job.plan) {
            const resolved = resolveResultPlan(job.plan, fallbackPlanRef.current(), locale, {
              preferRemote: true,
            });
            setRemotePlan(job.plan);
            if (generationRequest.guideId) {
              setActiveGuideId(generationRequest.guideId);
            }
            setPlan(resolved.plan);
            setShowLanguageCaveat(resolved.showLanguageCaveat);
            setShowJourneyReveal(true);
            setHasJourneyRevealed(false);
            setPhase('result');
            return;
          }
          if (job.status === 'failed') throw new Error(job.errorMessage || 'generation_failed');
          await wait(1500);
        }
      } catch (error) {
        if (!cancelled && !isAbortError(error)) {
          setPhase('error');
        }
      }
    };

    void poll();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activity.legacyId, copy.generation.steps.length, generationRequest, locale, phase]);

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

  const retryGeneration = () => {
    // Reuse the same generationRequest (including guideId) so the backend can
    // dedupe to an in-flight job instead of starting a brand-new one.
    if (!generationRequest) {
      startGeneration();
      return;
    }
    setShowLanguageCaveat(false);
    setShowJourneyReveal(false);
    setHasJourneyRevealed(false);
    setGenerationStep(0);
    setPhase('generating');
  };

  const returnToPreferences = () => {
    setPhase('setup');
    setStepIndex(SETUP_STEPS.length - 1);
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

  // Setup chrome only — never sit above generating / result / error chapters.
  const showSetupChrome = phase === 'setup';

  return (
    <div className="plan-flow">
      {showSetupChrome ? (
        hideHeader ? (
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
        )
      ) : null}

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
                  onChange={(event) => {
                    const next = event.target.value;
                    setOriginQuery(next);
                    // Typing must not keep a prior card selected (no default / no multi-highlight).
                    setPreferences((prev) =>
                      prev.origin ? { ...prev, origin: '' } : prev,
                    );
                  }}
                  placeholder={copy.steps.origin.searchPlaceholder}
                  autoComplete="off"
                />
              </label>
              <div className="plan-step__cards plan-step__cards--locations" aria-busy={originSuggestionsLoading}>
                {originOptions.map((item) => {
                  const selected = isOriginOptionSelected(preferences.origin, item);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`plan-option-card plan-option-card--location${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => handleOriginOptionClick(item)}
                    >
                      <span className="plan-option-card__icon" aria-hidden>
                        <MapPin size={18} strokeWidth={2} />
                      </span>
                      <span className="plan-option-card__title">{item.label}</span>
                      {item.subtitle ? (
                        <span className="plan-option-card__description">{item.subtitle}</span>
                      ) : null}
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
          {image ? (
            <>
              <EventImage src={image} alt="" className="plan-generation__image" sizes="(max-width: 960px) 100vw, 80vw" />
              <div className="plan-generation__scrim" aria-hidden />
            </>
          ) : null}
          <div className="plan-generation__glow" aria-hidden />
          <div className="plan-generation__icon" aria-hidden>
            <Sparkles size={22} strokeWidth={2} />
          </div>
          <p className="plan-generation__festival">
            {copy.generation.festivalContext.replace('{festival}', eventTitle)}
          </p>
          {resultMeta ? <p className="plan-generation__meta">{resultMeta}</p> : null}
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

      {phase === 'error' ? (
        <section className="plan-generation plan-generation--error" role="alert" aria-live="assertive">
          {image ? (
            <>
              <EventImage src={image} alt="" className="plan-generation__image" sizes="(max-width: 960px) 100vw, 80vw" />
              <div className="plan-generation__scrim" aria-hidden />
            </>
          ) : null}
          <div className="plan-generation__glow" aria-hidden />
          <div className="plan-generation__icon plan-generation__icon--error" aria-hidden>
            <RotateCcw size={22} strokeWidth={2} />
          </div>
          <p className="plan-generation__festival">
            {copy.generation.festivalContext.replace('{festival}', eventTitle)}
          </p>
          {resultMeta ? <p className="plan-generation__meta">{resultMeta}</p> : null}
          <p className="plan-generation__eyebrow">{copy.generation.error.eyebrow}</p>
          <h2 className="plan-generation__title">{copy.generation.error.title}</h2>
          <p className="plan-generation__lead">{copy.generation.error.lead}</p>
          <div className="plan-generation__actions">
            <button type="button" className="button plan-generation__action" onClick={retryGeneration}>
              <RotateCcw size={15} strokeWidth={2.25} aria-hidden />
              {copy.generation.error.retry}
            </button>
            <button
              type="button"
              className="button secondary plan-generation__action"
              onClick={returnToPreferences}
            >
              <ArrowLeft size={15} strokeWidth={2.25} aria-hidden />
              {copy.generation.error.adjust}
            </button>
          </div>
        </section>
      ) : null}

      {phase === 'result' && plan ? (
        <RavenJourneyResult
          locale={locale}
          journey={buildRavenJourneyView({
            remote: remotePlan,
            local: plan,
            locale,
            festivalName: eventTitle,
            destination: metaLocation || activity.city || activity.location || '',
            festivalDates: metaDate || activity.date || '',
            favoriteArtists,
            hasTimedSchedule,
            scheduleDays,
            travelersFallback: headcountFor(preferences.journeyType),
          })}
          image={image}
          showLanguageCaveat={showLanguageCaveat}
          persistenceNotice={!initialGuideId}
          shareUrl={
            activeGuideId
              ? `${typeof window !== 'undefined' ? window.location.origin : getSiteUrl()}${eventPlanPath(locale, activity)}?guideId=${encodeURIComponent(activeGuideId)}`
              : undefined
          }
          onSave={() => {
            window.location.href = waitlistHref;
          }}
          onEditPreferences={goBack}
          onRebuild={startGeneration}
          isRevealing={showJourneyReveal}
          hasRevealed={hasJourneyRevealed}
        />
      ) : null}
      {phase === 'result' && plan ? (
        <JourneyReveal
          active={showJourneyReveal}
          locale={locale}
          origin={preferences.origin}
          destination={metaLocation || activity.city || activity.location || ''}
          festivalName={eventTitle}
          image={image}
          onComplete={dismissJourneyReveal}
        />
      ) : null}
    </div>
  );
}
