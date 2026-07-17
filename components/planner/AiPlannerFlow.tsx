"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
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
} from "lucide-react";
import type { Activity } from "../../lib/types";
import {
  fetchRavenPlaceSuggestions,
  generateRavenPlanAsync,
  getRavenFestivalWeather,
  getRavenPlanGenerationJob,
  getSavedRavenPlan,
  claimRavenPlan,
  isRavenApiStatusError,
  type RavenPlaceSuggestion,
  type RavenPlanGenerationPayload,
  type RavenTravelGuidePlan,
  type RavenFestivalWeather,
  type ScheduleDj,
  type SchedulePerformance,
} from "../../lib/api";
import { useAuthSession } from "../../hooks/useAuthSession";
import { getMessages, type Locale } from "../../lib/i18n";
import { readLineupSelection } from "../../lib/lineup-selection";
import { resolveSelectedArtistNames } from "../../lib/planner-selection";
import {
  buildPlannerPlan,
  type JourneyType,
  type PersonalPriority,
  type PlannerPlan,
  type PlannerPreferences,
  type StayPreference,
  type TravelStyle,
} from "../../lib/planner-plan";
import {
  resolveResultPlan,
  shouldSeedSharedPlan,
} from "../../lib/planner-result";
import {
  buildOriginOptions,
  isOriginOptionSelected,
  type PlannerOriginListItem,
} from "../../lib/planner-origin";
import { buildRavenJourneyView } from "../../lib/raven-journey";
import { resolvePlanGenerationStage } from "../../lib/planner-generation-progress";
import { resolveFestivalGenerationTheme } from "../../lib/plan-generation/theme";
import { getPlanGenerationCopy } from "../../lib/plan-generation/copy";
import type { PlanGenerationStage } from "../../lib/plan-generation/types";
import { TrackedLink } from "../TrackedLink";
import { EventImage } from "../EventImage";
import { RavenJourneyResult } from "./RavenJourneyResult";
import { JourneyReveal } from "./JourneyReveal";
import { PlanGenerationExperience } from "./plan-generation/PlanGenerationExperience";
import { eventLineupPath, eventSquadPath } from "../../lib/event-slug";
import {
  formatEstimateMoney,
  type HomepageEstimateContext,
} from "../../lib/home-budget-estimate";

type FlowPhase = "setup" | "generating" | "result" | "error";

type SetupStepId = "origin" | "travelStyle" | "stay" | "journey" | "priority";

const SETUP_STEPS: SetupStepId[] = [
  "origin",
  "travelStyle",
  "stay",
  "journey",
  "priority",
];
const PLANNER_PREFERENCES_STORAGE_PREFIX = "raven-plan-preferences";
const ORIGIN_SUGGEST_DEBOUNCE_MS = 200;
const DEFAULT_PREFERENCES: PlannerPreferences = {
  origin: "",
  travelStyle: "smart",
  stayPreference: "festival",
  journeyType: "friends",
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
  image?: string;
  returnHref: string;
  hideHeader?: boolean;
  initialRemotePlan?: RavenTravelGuidePlan | null;
  initialGuideId?: string | null;
  initialOrigin?: string;
  initialEstimate?: HomepageEstimateContext | null;
  onPhaseChange?: (phase: FlowPhase) => void;
};

function createGuideId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `raven-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function plannerPreferencesStorageKey(activityLegacyId: number): string {
  return `${PLANNER_PREFERENCES_STORAGE_PREFIX}:${activityLegacyId}`;
}

function readPlannerPreferences(
  activityLegacyId: number,
): PlannerPreferences | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(
      plannerPreferencesStorageKey(activityLegacyId),
    );
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PlannerPreferences>;
    if (
      typeof value.origin !== "string" ||
      !["budget", "smart", "premium"].includes(value.travelStyle ?? "") ||
      !["festival", "city", "value"].includes(value.stayPreference ?? "") ||
      !["solo", "friends", "couple", "tribe"].includes(
        value.journeyType ?? "",
      ) ||
      !Array.isArray(value.priorities)
    ) {
      return null;
    }

    return {
      origin: value.origin,
      travelStyle: value.travelStyle as TravelStyle,
      stayPreference: value.stayPreference as StayPreference,
      journeyType: value.journeyType as JourneyType,
      priorities: value.priorities.filter(
        (priority): priority is PersonalPriority =>
          ["artists", "discover", "party", "city", "people", "budget"].includes(
            priority,
          ),
      ),
    };
  } catch {
    return null;
  }
}

function writePlannerPreferences(
  activityLegacyId: number,
  preferences: PlannerPreferences,
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      plannerPreferencesStorageKey(activityLegacyId),
      JSON.stringify(preferences),
    );
  } catch {
    // Local storage is optional; the current session still supports retrying.
  }
}

function toBudgetTier(
  style: TravelStyle,
): RavenPlanGenerationPayload["budgetTier"] {
  if (style === "budget") return "economy";
  if (style === "premium") return "comfort";
  return "standard";
}

function headcountFor(journey: JourneyType): number {
  if (journey === "solo") return 1;
  if (journey === "couple") return 2;
  if (journey === "tribe") return 4;
  return 3;
}

type CalendarTarget = "departure" | "return";

function dateFromYmd(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calendarDays(month: Date): Array<Date | null> {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  return Array.from({ length: 42 }, (_, index) =>
    index < offset || index >= offset + count
      ? null
      : new Date(month.getFullYear(), month.getMonth(), index - offset + 1),
  );
}

function formatTravelDate(value: string, locale: Locale): string {
  const date = dateFromYmd(value);
  if (!date) return locale === "zh" ? "选择日期" : "Choose a date";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function RavenTravelCalendar({
  target,
  month,
  departureDate,
  returnDate,
  locale,
  onMonthChange,
  onSelect,
}: {
  target: CalendarTarget;
  month: Date;
  departureDate: string;
  returnDate: string;
  locale: Locale;
  onMonthChange: (month: Date) => void;
  onSelect: (date: string) => void;
}) {
  const weekdays =
    locale === "zh"
      ? ["一", "二", "三", "四", "五", "六", "日"]
      : ["M", "T", "W", "T", "F", "S", "S"];
  const title = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(month);
  const selected = target === "departure" ? departureDate : returnDate;
  const today = new Date();
  const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const earliestDate =
    target === "return" && departureDate > toYmd(today)
      ? departureDate
      : toYmd(today);
  const canGoPrevious = month.getTime() > todayMonth.getTime();

  return (
    <section
      className="raven-travel-calendar"
      role="dialog"
      aria-label={locale === "zh" ? "选择旅行日期" : "Choose travel date"}
    >
      <header className="raven-travel-calendar__head">
        <span className="raven-travel-calendar__eyebrow">
          {target === "departure"
            ? locale === "zh"
              ? "选择启程日"
              : "Choose departure"
            : locale === "zh"
              ? "选择归来日"
              : "Choose return"}
        </span>
        <div className="raven-travel-calendar__month">
          <button
            type="button"
            disabled={!canGoPrevious}
            aria-label={locale === "zh" ? "上个月" : "Previous month"}
            onClick={() =>
              onMonthChange(
                new Date(month.getFullYear(), month.getMonth() - 1, 1),
              )
            }
          >
            <ChevronLeft size={17} aria-hidden />
          </button>
          <strong>{title}</strong>
          <button
            type="button"
            aria-label={locale === "zh" ? "下个月" : "Next month"}
            onClick={() =>
              onMonthChange(
                new Date(month.getFullYear(), month.getMonth() + 1, 1),
              )
            }
          >
            <ChevronRight size={17} aria-hidden />
          </button>
        </div>
      </header>
      <div className="raven-travel-calendar__week" aria-hidden>
        {weekdays.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="raven-travel-calendar__days">
        {calendarDays(month).map((date, index) => {
          if (!date) return <span key={`blank-${index}`} />;
          const value = toYmd(date);
          const disabled = value < earliestDate;
          const isSelected = value === selected;
          const isToday = value === toYmd(today);
          const isDeparture = value === departureDate;
          const isReturn = value === returnDate;
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              className={[
                "raven-travel-calendar__day",
                isSelected ? "is-selected" : "",
                isToday ? "is-today" : "",
                isDeparture ? "is-departure" : "",
                isReturn ? "is-return" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelect(value)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </section>
  );
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
  image,
  returnHref,
  hideHeader = false,
  initialRemotePlan = null,
  initialGuideId = null,
  initialOrigin = "",
  initialEstimate = null,
  onPhaseChange,
}: AiPlannerFlowProps) {
  const t = getMessages(locale);
  const copy = t.aiPlanner;
  const lineupPath = eventLineupPath(locale, activity);

  const [phase, setPhase] = useState<FlowPhase>(() =>
    initialRemotePlan ? "result" : "setup",
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [originQuery, setOriginQuery] = useState("");
  const [remoteOriginSuggestions, setRemoteOriginSuggestions] = useState<
    RavenPlaceSuggestion[]
  >([]);
  const [originSuggestionsLoading, setOriginSuggestionsLoading] =
    useState(false);
  const [favoriteArtists, setFavoriteArtists] = useState<string[]>([]);
  const [generationStage, setGenerationStage] =
    useState<PlanGenerationStage>("mission");
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
  const [remotePlan, setRemotePlan] = useState<RavenTravelGuidePlan | null>(
    initialRemotePlan,
  );
  const [weather, setWeather] = useState<RavenFestivalWeather | null>(null);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(
    initialGuideId,
  );
  const [showLanguageCaveat, setShowLanguageCaveat] = useState(false);
  const [showJourneyReveal, setShowJourneyReveal] = useState(false);
  const [hasJourneyRevealed, setHasJourneyRevealed] = useState(false);
  const [generationRequest, setGenerationRequest] =
    useState<RavenPlanGenerationPayload | null>(null);
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [travelDateMode, setTravelDateMode] = useState<"raven" | "manual">(
    "raven",
  );
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget | null>(
    null,
  );
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const hasUserGeneratedRef = useRef(false);
  const sharedPlanSeededRef = useRef(false);
  const refreshedGuideIdsRef = useRef(new Set<string>());

  const [preferences, setPreferences] =
    useState<PlannerPreferences>(DEFAULT_PREFERENCES);
  const auth = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();

  const saveJourney = useCallback(async () => {
    if (!activeGuideId) return;
    if (!auth.signedIn) {
      window.localStorage.setItem('raven_pending_journey_claim', activeGuideId);
      const callbackUrl = `${pathname}?guideId=${encodeURIComponent(activeGuideId)}`;
      router.push(`/${locale}/auth/sign-in?intent=journey&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    await claimRavenPlan(activeGuideId);
    window.location.href = returnHref;
  }, [activeGuideId, auth.signedIn, locale, pathname, returnHref, router]);

  useEffect(() => {
    if (!auth.signedIn || !activeGuideId) return;
    if (window.localStorage.getItem('raven_pending_journey_claim') !== activeGuideId) return;
    let active = true;
    void claimRavenPlan(activeGuideId)
      .then(() => {
        if (!active) return;
        window.localStorage.removeItem('raven_pending_journey_claim');
        window.location.href = returnHref;
      })
      .catch(() => {
        // Keep the journey open so the traveler can retry rather than losing it.
      });
    return () => { active = false; };
  }, [activeGuideId, auth.signedIn, returnHref]);

  useEffect(() => {
    if (phase !== "result") {
      setWeather(null);
      return;
    }
    let active = true;
    setWeather(null);
    getRavenFestivalWeather(activity.legacyId)
      .then((forecast) => {
        if (active) setWeather(forecast);
      })
      .catch(() => {
        if (active) setWeather(null);
      });
    return () => {
      active = false;
    };
  }, [activity.legacyId, phase]);

  const fallbackPlan = useCallback(() => {
    const fallback = buildPlannerPlan(
      activity,
      djs,
      performances,
      favoriteArtists,
      preferences,
      locale,
      copy.planLabels,
    );
    if (!initialEstimate) return fallback;
    const labels =
      locale === "zh"
        ? [
            "电音节门票",
            "往返交通",
            `住宿 · ${initialEstimate.tripNights} 晚`,
            "餐饮与本地交通",
          ]
        : [
            "Festival ticket",
            "Round-trip travel",
            `Hotel · ${initialEstimate.tripNights} nights`,
            "Food & local transport",
          ];
    return {
      ...fallback,
      budget: {
        total: formatEstimateMoney(
          initialEstimate.totalEstimate,
          initialEstimate.currency,
          locale,
        ),
        items: [
          initialEstimate.breakdown.ticket,
          initialEstimate.breakdown.flight,
          initialEstimate.breakdown.hotel,
          initialEstimate.breakdown.foodAndLocalTransport,
        ].map((amount, index) => ({
          label: labels[index]!,
          amount: formatEstimateMoney(amount, initialEstimate.currency, locale),
        })),
      },
    };
  }, [
    activity,
    copy.planLabels,
    djs,
    favoriteArtists,
    initialEstimate,
    locale,
    performances,
    preferences,
  ]);
  const fallbackPlanRef = useRef(fallbackPlan);
  fallbackPlanRef.current = fallbackPlan;

  // Generation jobs store their completed plan snapshot. Re-read the saved
  // journey once so quotes attached during persistence/refresh are visible in
  // the same result view, rather than only after reopening the guide link.
  useEffect(() => {
    if (phase !== "result" || !activeGuideId) return;
    if (refreshedGuideIdsRef.current.has(activeGuideId)) return;

    refreshedGuideIdsRef.current.add(activeGuideId);
    let active = true;
    void getSavedRavenPlan(activeGuideId)
      .then((saved) => {
        if (!active || !saved?.plan) return;
        const resolved = resolveResultPlan(
          saved.plan,
          fallbackPlanRef.current(),
          locale,
          { preferRemote: true },
        );
        setRemotePlan(saved.plan);
        setPlan(resolved.plan);
        setShowLanguageCaveat(resolved.showLanguageCaveat);
      })
      .catch(() => {
        // The job snapshot remains a graceful fallback when a saved read fails.
      });

    return () => {
      active = false;
    };
  }, [activeGuideId, locale, phase]);
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
    setFavoriteArtists(
      resolveSelectedArtistNames(selection, djs, performances),
    );
  }, [activity.legacyId, djs, performances]);

  useEffect(() => {
    const restored = readPlannerPreferences(activity.legacyId);
    // A homepage estimate may deliberately carry a departure city into the full journey.
    setPreferences(
      restored
        ? { ...restored, origin: initialOrigin.trim() }
        : { ...DEFAULT_PREFERENCES, origin: initialOrigin.trim() },
    );
    setOriginQuery(initialOrigin.trim());
  }, [activity.legacyId, initialOrigin]);

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

    const resolved = resolveResultPlan(
      initialRemotePlan,
      fallbackPlan(),
      locale,
      {
        preferRemote: true,
      },
    );
    sharedPlanSeededRef.current = true;
    setRemotePlan(initialRemotePlan);
    setActiveGuideId(initialGuideId);
    setPlan(resolved.plan);
    setShowLanguageCaveat(resolved.showLanguageCaveat);
    setPhase("result");
  }, [fallbackPlan, initialGuideId, initialRemotePlan, locale]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);

  useEffect(() => {
    if (currentStep !== "origin") {
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
          setRemoteOriginSuggestions(rows.filter((row) => row.kind === "city"));
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
  const initialOriginOptionKey = useMemo(() => {
    const initial = initialOrigin.trim().toLocaleLowerCase();
    if (!initial || preferences.origin !== initialOrigin.trim()) return null;

    const city = initial.split(",")[0]?.trim() ?? initial;
    return (
      originOptions.find((item) => item.label.trim().toLocaleLowerCase() === city)?.key ??
      null
    );
  }, [initialOrigin, originOptions, preferences.origin]);

  const canContinue = useMemo(() => {
    if (currentStep === "origin") {
      return (
        preferences.origin.length > 0 &&
        (travelDateMode === "raven" ||
          (Boolean(departureDate) &&
            Boolean(returnDate) &&
            returnDate >= departureDate))
      );
    }
    if (currentStep === "priority") return preferences.priorities.length > 0;
    return true;
  }, [
    currentStep,
    departureDate,
    preferences.origin,
    preferences.priorities.length,
    returnDate,
    travelDateMode,
  ]);

  const selectOriginValue = useCallback((origin: string) => {
    setPreferences((prev) => ({
      ...prev,
      origin,
    }));
  }, []);

  const openCalendar = useCallback(
    (target: CalendarTarget) => {
      const selected = dateFromYmd(
        target === "departure" ? departureDate : returnDate,
      );
      setCalendarMonth(
        selected ??
          dateFromYmd(departureDate) ??
          new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      );
      setCalendarTarget(target);
    },
    [departureDate, returnDate],
  );

  const selectCalendarDate = useCallback(
    (value: string) => {
      if (calendarTarget === "departure") {
        setDepartureDate(value);
        setReturnDate((current) => (current && current < value ? "" : current));
        setCalendarTarget("return");
        return;
      }
      setReturnDate(value);
      setCalendarTarget(null);
    },
    [calendarTarget],
  );

  const handleOriginOptionClick = useCallback(
    (item: OriginListItem) => {
      // Keep the search field in sync with the city card the traveler chose.
      setOriginQuery(item.label);
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
    setPhase("generating");
    setGenerationStage("mission");
    const guideId = createGuideId();
    setActiveGuideId(guideId);
    setGenerationRequest({
      guideId,
      departure: preferences.origin,
      travelDateMode,
      ...(travelDateMode === "manual" ? { departureDate, returnDate } : {}),
      headcount: headcountFor(preferences.journeyType),
      budgetTier: toBudgetTier(preferences.travelStyle),
      stayPreference: preferences.stayPreference,
      note: preferences.priorities
        .map((priority) => copy.steps.priority.options[priority].title)
        .join(locale === "zh" ? "；" : "; "),
      locale,
    });
  }, [
    activity.legacyId,
    copy.steps.priority.options,
    departureDate,
    locale,
    preferences,
    returnDate,
    travelDateMode,
  ]);

  useEffect(() => {
    if (phase !== "generating" || !generationRequest) return;

    let cancelled = false;
    const controller = new AbortController();
    const isAbortError = (error: unknown) =>
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");
    const isTimeoutError = (error: unknown) =>
      (error instanceof DOMException && error.name === "TimeoutError") ||
      (error instanceof Error && error.name === "TimeoutError");
    const isRetryableRateLimit = (error: unknown) =>
      isRavenApiStatusError(error, 429);
    const wait = (ms: number) =>
      new Promise((resolve) => window.setTimeout(resolve, ms));
    const MAX_GENERATE_RATE_RETRIES = 4;
    const MAX_POLL_RATE_RETRIES = 8;

    const startJobWithRetry = async () => {
      let attempt = 0;
      while (!cancelled) {
        try {
          return await generateRavenPlanAsync(
            activity.legacyId,
            generationRequest,
          );
        } catch (error) {
          if (cancelled || isAbortError(error)) throw error;
          // Brief backoff for transient 429 (Strict Mode double-start / short bursts).
          if (
            isRetryableRateLimit(error) &&
            attempt < MAX_GENERATE_RATE_RETRIES
          ) {
            attempt += 1;
            await wait(1500 * attempt);
            continue;
          }
          throw error;
        }
      }
      throw new DOMException("Aborted", "AbortError");
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
          setGenerationStage(resolvePlanGenerationStage(job));
          if (job.status === "completed" && job.plan) {
            const resolved = resolveResultPlan(
              job.plan,
              fallbackPlanRef.current(),
              locale,
              {
                preferRemote: true,
              },
            );
            setRemotePlan(job.plan);
            if (generationRequest.guideId) {
              setActiveGuideId(generationRequest.guideId);
            }
            setPlan(resolved.plan);
            setShowLanguageCaveat(resolved.showLanguageCaveat);
            setShowJourneyReveal(true);
            setHasJourneyRevealed(false);
            setPhase("result");
            return;
          }
          if (job.status === "failed")
            throw new Error(job.errorMessage || "generation_failed");
          await wait(1500);
        }
      } catch (error) {
        if (!cancelled && !isAbortError(error)) {
          setPhase("error");
        }
      }
    };

    void poll();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activity.legacyId, generationRequest, locale, phase]);

  const goNext = () => {
    if (stepIndex < SETUP_STEPS.length - 1) {
      setStepIndex((value) => value + 1);
      return;
    }
    startGeneration();
  };

  const goBack = () => {
    if (phase === "result") {
      setPhase("setup");
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
    setGenerationStage("mission");
    setPhase("generating");
  };

  const returnToPreferences = () => {
    setPhase("setup");
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
    .replace("{current}", String(stepIndex + 1))
    .replace("{total}", String(SETUP_STEPS.length));
  const resultMeta = [metaLocation, metaDate].filter(Boolean).join(" · ");
  const generationTheme = useMemo(
    () => resolveFestivalGenerationTheme(activity, eventTitle),
    [activity, eventTitle],
  );
  const generationCopy = useMemo(() => getPlanGenerationCopy(locale), [locale]);
  const destinationCity =
    metaLocation || activity.city || activity.location || "";

  // Setup chrome only — never sit above generating / result / error chapters.
  const showSetupChrome = phase === "setup";

  return (
    <div className="plan-flow">
      {showSetupChrome ? (
        hideHeader ? (
          <header className="plan-flow__intro plan-flow__intro--quiet">
            <h2 className="plan-flow__intro-title">
              {t.aiPlanner.landing.plannerCustomize}
            </h2>
            <p className="plan-flow__intro-lead">
              {t.aiPlanner.landing.plannerLead}
            </p>
            {favoriteArtists.length ? (
              <div className="plan-flow__intro-artists">
                <ul className="plan-flow__intro-chips">
                  {favoriteArtists.map((artist) => (
                    <li key={artist}>{artist}</li>
                  ))}
                </ul>
                <TrackedLink
                  className="plan-flow__intro-edit"
                  href={lineupPath}
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
                <span className="plan-context__artists-label">
                  {copy.contextArtists}
                </span>
                <TrackedLink
                  className="plan-context__artists-edit"
                  href={lineupPath}
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
                <p className="plan-context__artists-empty">
                  {copy.contextArtistsEmpty}
                </p>
              )}
            </div>
          </header>
        )
      ) : null}

      {phase === "setup" ? (
        <section className="plan-setup" aria-live="polite">
          <div className="plan-setup__head">
            <span className="plan-setup__progress">{progressLabel}</span>
            <div className="plan-setup__track" aria-hidden>
              {SETUP_STEPS.map((step, index) => (
                <span
                  key={step}
                  className={[
                    "plan-setup__dot",
                    index <= stepIndex ? "is-complete" : "",
                    index === stepIndex ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              ))}
            </div>
          </div>

          {currentStep === "origin" ? (
            <div className="plan-step">
              <h2 className="plan-step__question">
                {copy.steps.origin.question}
              </h2>
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
                      prev.origin ? { ...prev, origin: "" } : prev,
                    );
                  }}
                  placeholder={copy.steps.origin.searchPlaceholder}
                  autoComplete="off"
                />
              </label>
              <div
                className="plan-step__date-mode"
                role="radiogroup"
                aria-label={locale === "zh" ? "日期方式" : "Travel date mode"}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={travelDateMode === "raven"}
                  className={travelDateMode === "raven" ? "is-selected" : ""}
                  onClick={() => setTravelDateMode("raven")}
                >
                  <Sparkles size={15} aria-hidden />
                  {locale === "zh"
                    ? "让 Raven 推荐日期"
                    : "Let Raven recommend"}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={travelDateMode === "manual"}
                  className={travelDateMode === "manual" ? "is-selected" : ""}
                  onClick={() => setTravelDateMode("manual")}
                >
                  <CalendarDays size={15} aria-hidden />
                  {locale === "zh" ? "自己选择日期" : "Choose dates myself"}
                </button>
              </div>
              {travelDateMode === "manual" ? (
                <>
                  <div
                    className="plan-step__dates"
                    aria-label={locale === "zh" ? "旅行日期" : "Travel dates"}
                  >
                    <span className="plan-step__date-thread" aria-hidden>
                      <span />
                      <ArrowRight size={15} strokeWidth={1.8} />
                    </span>
                    <label
                      className={`plan-step__date-field${departureDate ? " is-filled" : ""}`}
                    >
                      <span className="plan-step__date-icon" aria-hidden>
                        <CalendarDays size={18} strokeWidth={1.7} />
                      </span>
                      <span className="plan-step__date-copy">
                        <span className="plan-step__date-label">
                          {locale === "zh" ? "启程" : "Departure"}
                        </span>
                        <span className="plan-step__date-caption">
                          {locale === "zh"
                            ? "旅程从这里开始"
                            : "The journey begins"}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="plan-step__date-trigger"
                        aria-haspopup="dialog"
                        aria-expanded={calendarTarget === "departure"}
                        onClick={() => openCalendar("departure")}
                      >
                        {formatTravelDate(departureDate, locale)}
                      </button>
                    </label>
                    <label
                      className={`plan-step__date-field${returnDate ? " is-filled" : ""}`}
                    >
                      <span className="plan-step__date-icon" aria-hidden>
                        <CalendarDays size={18} strokeWidth={1.7} />
                      </span>
                      <span className="plan-step__date-copy">
                        <span className="plan-step__date-label">
                          {locale === "zh" ? "归来" : "Return"}
                        </span>
                        <span className="plan-step__date-caption">
                          {locale === "zh"
                            ? "把余韵带回日常"
                            : "Bring the afterglow home"}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="plan-step__date-trigger"
                        aria-haspopup="dialog"
                        aria-expanded={calendarTarget === "return"}
                        onClick={() => openCalendar("return")}
                      >
                        {formatTravelDate(returnDate, locale)}
                      </button>
                    </label>
                  </div>
                  {calendarTarget ? (
                    <RavenTravelCalendar
                      target={calendarTarget}
                      month={calendarMonth}
                      departureDate={departureDate}
                      returnDate={returnDate}
                      locale={locale}
                      onMonthChange={setCalendarMonth}
                      onSelect={selectCalendarDate}
                    />
                  ) : null}
                </>
              ) : null}
              <div
                className="plan-step__cards plan-step__cards--locations"
                aria-busy={originSuggestionsLoading}
              >
                {originOptions.map((item) => {
                  const selected = isOriginOptionSelected(
                    preferences.origin,
                    item,
                  ) || item.key === initialOriginOptionKey;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`plan-option-card plan-option-card--location${selected ? " is-selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() => handleOriginOptionClick(item)}
                    >
                      <span className="plan-option-card__icon" aria-hidden>
                        <MapPin size={18} strokeWidth={2} />
                      </span>
                      <span className="plan-option-card__title">
                        {item.label}
                      </span>
                      {item.subtitle ? (
                        <span className="plan-option-card__description">
                          {item.subtitle}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {currentStep === "travelStyle" ? (
            <div className="plan-step">
              <h2 className="plan-step__question">
                {copy.steps.travelStyle.question}
              </h2>
              <p className="plan-step__lead">{copy.steps.travelStyle.lead}</p>
              <div className="plan-step__cards">
                {(
                  Object.keys(copy.steps.travelStyle.options) as TravelStyle[]
                ).map((key) => {
                  const option = copy.steps.travelStyle.options[key];
                  const Icon = TRAVEL_STYLE_ICONS[key];
                  const selected = preferences.travelStyle === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`plan-option-card${selected ? " is-selected" : ""}`}
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
                      <span className="plan-option-card__title">
                        {option.title}
                      </span>
                      <span className="plan-option-card__description">
                        {option.description}
                      </span>
                      <span className="plan-option-card__experience">
                        {option.experience}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="plan-step__choice-consequence" aria-live="polite">
                {
                  copy.steps.travelStyle.options[preferences.travelStyle]
                    .experience
                }
              </p>
            </div>
          ) : null}

          {currentStep === "stay" ? (
            <div className="plan-step">
              <h2 className="plan-step__question">
                {copy.steps.stay.question}
              </h2>
              <p className="plan-step__lead">{copy.steps.stay.lead}</p>
              <div className="plan-step__cards">
                {(Object.keys(copy.steps.stay.options) as StayPreference[]).map(
                  (key) => {
                    const option = copy.steps.stay.options[key];
                    const Icon = STAY_ICONS[key];
                    const selected = preferences.stayPreference === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`plan-option-card${selected ? " is-selected" : ""}`}
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
                        <span className="plan-option-card__title">
                          {option.title}
                        </span>
                        <span className="plan-option-card__description">
                          {option.description}
                        </span>
                        <span className="plan-option-card__experience">
                          {option.experience}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
              <p className="plan-step__choice-consequence" aria-live="polite">
                {copy.steps.stay.options[preferences.stayPreference].experience}
              </p>
            </div>
          ) : null}

          {currentStep === "journey" ? (
            <div className="plan-step">
              <h2 className="plan-step__question">
                {copy.steps.journey.question}
              </h2>
              <p className="plan-step__lead">{copy.steps.journey.lead}</p>
              <div className="plan-step__cards">
                {(Object.keys(copy.steps.journey.options) as JourneyType[]).map(
                  (key) => {
                    const option = copy.steps.journey.options[key];
                    const Icon = JOURNEY_ICONS[key];
                    const selected = preferences.journeyType === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`plan-option-card${selected ? " is-selected" : ""}`}
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
                        <span className="plan-option-card__title">
                          {option.title}
                        </span>
                        <span className="plan-option-card__description">
                          {option.description}
                        </span>
                        <span className="plan-option-card__experience">
                          {option.experience}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
              <p className="plan-step__choice-consequence" aria-live="polite">
                {copy.steps.journey.options[preferences.journeyType].experience}
              </p>
            </div>
          ) : null}

          {currentStep === "priority" ? (
            <div className="plan-step">
              <h2 className="plan-step__question">
                {copy.steps.priority.question}
              </h2>
              <p className="plan-step__lead">{copy.steps.priority.lead}</p>
              <div className="plan-step__cards plan-step__cards--priorities">
                {(
                  Object.keys(copy.steps.priority.options) as PersonalPriority[]
                ).map((key) => {
                  const option = copy.steps.priority.options[key];
                  const Icon = PRIORITY_ICONS[key];
                  const selected = preferences.priorities.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`plan-option-card plan-option-card--priority${selected ? " is-selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() => togglePriority(key)}
                    >
                      <span className="plan-option-card__icon" aria-hidden>
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="plan-option-card__title">
                        {option.title}
                      </span>
                      <span className="plan-option-card__description">
                        {option.description}
                      </span>
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
              {stepIndex === SETUP_STEPS.length - 1
                ? copy.nav.create
                : copy.nav.continue}
              <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
            </button>
          </footer>
        </section>
      ) : null}

      {phase === "generating" ? (
        <PlanGenerationExperience
          active
          locale={locale}
          festivalName={eventTitle}
          originCity={preferences.origin}
          destinationCity={destinationCity}
          meta={resultMeta}
          image={image}
          artists={favoriteArtists}
          theme={generationTheme}
          backendStage={generationStage}
        />
      ) : null}

      {phase === "error" ? (
        <section
          className="plan-generation plan-generation--error"
          role="alert"
          aria-live="assertive"
        >
          {image ? (
            <>
              <EventImage
                src={image}
                alt=""
                className="plan-generation__image"
                sizes="(max-width: 960px) 100vw, 80vw"
              />
              <div className="plan-generation__scrim" aria-hidden />
            </>
          ) : null}
          <div className="plan-generation__glow" aria-hidden />
          <div
            className="plan-generation__icon plan-generation__icon--error"
            aria-hidden
          >
            <RotateCcw size={22} strokeWidth={2} />
          </div>
          <p className="plan-generation__festival">{eventTitle}</p>
          {resultMeta ? (
            <p className="plan-generation__meta">{resultMeta}</p>
          ) : null}
          <p className="plan-generation__eyebrow">
            {generationCopy.failed.eyebrow}
          </p>
          <h2 className="plan-generation__title">
            {generationCopy.failed.title}
          </h2>
          <p className="plan-generation__lead">{generationCopy.failed.lead}</p>
          <div className="plan-generation__actions">
            <button
              type="button"
              className="button plan-generation__action"
              onClick={retryGeneration}
            >
              <RotateCcw size={15} strokeWidth={2.25} aria-hidden />
              {generationCopy.retry}
            </button>
            <button
              type="button"
              className="button secondary plan-generation__action"
              onClick={returnToPreferences}
            >
              <ArrowLeft size={15} strokeWidth={2.25} aria-hidden />
              {generationCopy.adjust}
            </button>
          </div>
        </section>
      ) : null}

      {phase === "result" && plan ? (
        <RavenJourneyResult
          locale={locale}
          journey={buildRavenJourneyView({
            remote: remotePlan,
            local: plan,
            locale,
            festivalName: eventTitle,
            destination:
              metaLocation || activity.city || activity.location || "",
            festivalDates: metaDate || activity.date || "",
            favoriteArtists,
            hasTimedSchedule,
            scheduleDays,
            travelersFallback: headcountFor(preferences.journeyType),
          })}
          image={image}
          showLanguageCaveat={showLanguageCaveat}
          persistenceNotice={!initialGuideId}
          guideId={activeGuideId ?? undefined}
          preferences={preferences}
          favoriteArtists={favoriteArtists}
          squadHref={eventSquadPath(locale, activity)}
          eventLegacyId={activity.legacyId}
          weather={weather}
          onSave={() => { void saveJourney(); }}
          onEditPreferences={goBack}
          onRebuild={startGeneration}
          isRevealing={showJourneyReveal}
          hasRevealed={hasJourneyRevealed}
        />
      ) : null}
      {phase === "result" && plan ? (
        <JourneyReveal
          active={showJourneyReveal}
          locale={locale}
          origin={preferences.origin}
          destination={metaLocation || activity.city || activity.location || ""}
          festivalName={eventTitle}
          image={image}
          onComplete={dismissJourneyReveal}
        />
      ) : null}
    </div>
  );
}
