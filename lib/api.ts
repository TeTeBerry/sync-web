import type { Activity, ActivityListPage } from "./types";
import { isActivityExpired } from "./activity-date";
import { ensureAuthCsrf } from "./auth/client";

const PRODUCTION_API_BASE =
  "https://sync-backend-prd-269371-9-1442514260.sh.run.tcloudbase.com/api";

function isLoopbackApiUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
    );
  } catch {
    return false;
  }
}

function resolveApiBase(): string {
  const configured = process.env.API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const publicConfigured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (publicConfigured && !isLoopbackApiUrl(publicConfigured)) {
    return publicConfigured.replace(/\/$/, "");
  }

  // Default to CloudBase. Point API_BASE_URL at a local Nest stack when needed:
  // API_BASE_URL=http://127.0.0.1:3000/api
  return PRODUCTION_API_BASE;
}

const API_BASE = resolveApiBase();

export function getApiBase(): string {
  return API_BASE;
}

type ApiEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as ApiEnvelope<T>).data !== undefined
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, "");
}

const API_FETCH_TIMEOUT_MS = 8_000;
/** Creating an async plan job can wait on Mongo/dedupe; keep this above cold-start latency. */
const RAVEN_GENERATE_ASYNC_TIMEOUT_MS = 60_000;
const RAVEN_POLL_TIMEOUT_MS = 20_000;

function mergeAbortSignals(
  signals: Array<AbortSignal | undefined>,
): AbortSignal | undefined {
  const active = signals.filter((signal): signal is AbortSignal =>
    Boolean(signal),
  );
  if (!active.length) return undefined;
  if (active.length === 1) return active[0];
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(active);
  }
  return active[0];
}

async function apiGet<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${normalizeBaseUrl(API_BASE)}${path}`, {
    ...options,
    signal: options?.signal ?? AbortSignal.timeout(API_FETCH_TIMEOUT_MS),
    next: { revalidate: 120 },
  });
  if (!response.ok) {
    throw new Error(`Raven API ${path} failed: ${response.status}`);
  }
  return unwrap<T>((await response.json()) as T | ApiEnvelope<T>);
}

async function ravenApiRequest<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs, signal, ...rest } = options ?? {};
  // If the caller already provided a signal (possibly with its own timeout),
  // only add another timeout when timeoutMs is set explicitly.
  const resolvedTimeoutMs =
    timeoutMs ?? (signal ? undefined : API_FETCH_TIMEOUT_MS);
  const timeoutSignal =
    resolvedTimeoutMs != null && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(resolvedTimeoutMs)
      : undefined;
  // Browser requests stay same-origin so production CORS policy cannot block plan generation.
  const url =
    typeof window === "undefined"
      ? `${normalizeBaseUrl(API_BASE)}${path}`
      : `/api${path}`;
  const response = await fetch(url, {
    ...rest,
    cache: "no-store",
    signal: mergeAbortSignals([signal ?? undefined, timeoutSignal]),
  });

  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => null)) as ApiEnvelope<unknown> | null;
    const message =
      payload?.message || `Raven API ${path} failed: ${response.status}`;
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return unwrap<T>((await response.json()) as T | ApiEnvelope<T>);
}

export function isRavenApiStatusError(error: unknown, status: number): boolean {
  return (
    typeof error === "object" &&
    error != null &&
    "status" in error &&
    (error as { status?: number }).status === status
  );
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function getStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => getString(item))
    .filter(Boolean) as string[];
  return items.length ? items : undefined;
}

function inferCity(activity: Activity): string | undefined {
  return (
    activity.city ??
    activity.area ??
    getString(activity.location?.split(/[·,，]/)[0])
  );
}

function normalizeActivity(raw: Activity): Activity {
  return {
    ...raw,
    legacyId: getNumber(raw.legacyId) ?? 0,
    name: getString(raw.name) ?? getString(raw.title) ?? "未命名活动",
    code: getString(raw.code),
    date: getString(raw.date),
    startDate: getString(raw.startDate),
    endDate: getString(raw.endDate),
    location: getString(raw.location),
    city: inferCity(raw),
    area: getString(raw.area),
    region: raw.region,
    latitude: getNumber(raw.latitude),
    longitude: getNumber(raw.longitude),
    image: getString(raw.image),
    description: getString(raw.description),
    lineup: getStringList(raw.lineup),
    artists: getStringList(raw.artists),
    status: getString(raw.status),
    activityType: raw.activityType,
    hot: raw.hot,
    attendees: getNumber(raw.attendees),
    lineupPublished: raw.lineupPublished,
    travelGuideSupported: raw.travelGuideSupported,
    externalUrl: getString(raw.externalUrl),
    ticketOffers: Array.isArray(raw.ticketOffers)
      ? raw.ticketOffers
          .filter((offer) => offer && typeof offer === 'object')
          .map((offer) => ({
            name: getString((offer as { name?: unknown }).name),
            url: getString((offer as { url?: unknown }).url),
            price: getNumber((offer as { price?: unknown }).price),
            currency: getString((offer as { currency?: unknown }).currency),
            validFrom: getString((offer as { validFrom?: unknown }).validFrom),
            validThrough: getString((offer as { validThrough?: unknown }).validThrough),
          }))
          .filter((offer) => Boolean(offer.url || offer.price != null))
      : undefined,
    infoSource: getString(raw.infoSource),
    infoUpdatedAt: getString(raw.infoUpdatedAt),
    updatedAt: getString(raw.updatedAt),
    damaiProjectId: getString(raw.damaiProjectId),
  };
}

export type ActivitiesFetchStatus = "ok" | "empty" | "error";

export type ActivitiesFetchResult = {
  activities: Activity[];
  status: ActivitiesFetchStatus;
};

async function fetchActivitiesPayload(): Promise<Activity[]> {
  const payload = await apiGet<Activity[] | ActivityListPage>("/activities");
  const items = Array.isArray(payload) ? payload : (payload.items ?? []);
  return items
    .map(normalizeActivity)
    .filter((item) => item.legacyId > 0 && !isActivityExpired(item));
}

export async function fetchActivities(): Promise<ActivitiesFetchResult> {
  try {
    const activities = await fetchActivitiesPayload();
    return {
      activities,
      status: activities.length ? "ok" : "empty",
    };
  } catch {
    return { activities: [], status: "error" };
  }
}

export async function listActivities(): Promise<Activity[]> {
  const result = await fetchActivities();
  return result.activities;
}

export type ActivityFetchStatus = "ok" | "not_found" | "error";

export type ActivityFetchResult = {
  activity: Activity | null;
  status: ActivityFetchStatus;
};

export async function getActivity(id: number): Promise<ActivityFetchResult> {
  if (!Number.isFinite(id) || id <= 0) {
    return { activity: null, status: "not_found" };
  }

  try {
    const response = await fetch(
      `${normalizeBaseUrl(API_BASE)}/activities/${id}`,
      {
        next: { revalidate: 120 },
      },
    );

    if (response.status === 404) {
      return { activity: null, status: "not_found" };
    }

    if (!response.ok) {
      return { activity: null, status: "error" };
    }

    const payload = unwrap<Activity | null>(
      (await response.json()) as Activity | ApiEnvelope<Activity | null>,
    );
    if (!payload) {
      return { activity: null, status: "not_found" };
    }

    return { activity: normalizeActivity(payload), status: "ok" };
  } catch {
    return { activity: null, status: "error" };
  }
}

export function getActivityTitle(activity: Activity): string {
  return activity.title ?? activity.name;
}

export type ScheduleDj = {
  id: string;
  name: string;
  genre?: string;
  genreLabel?: string;
  stage?: string;
  stageLabel?: string;
  popularity?: number;
  genreColor?: string;
};

export type ScheduleSession = {
  dateKey: string;
  label: string;
  bannerDateLabel: string;
};

export type SchedulePerformance = {
  artistId: string;
  artistName: string;
  dateKey: string;
  dateLabel: string;
  genre: string;
  genreLabel: string;
  stage: string;
  stageLabel: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  popularity: number;
  avatarSeed: string;
  genreColor: string;
};

export type ActivitySchedule = {
  activityLegacyId: number;
  eventMeta?: string;
  schedulePublished?: boolean;
  sessions?: ScheduleSession[];
  djs?: ScheduleDj[];
  performances?: SchedulePerformance[];
};

export type ScheduleFetchStatus = "ok" | "empty" | "error";

export type ScheduleFetchResult = {
  schedule: ActivitySchedule | null;
  status: ScheduleFetchStatus;
};

export async function fetchActivitySchedule(
  legacyId: number,
  options?: { weekend?: "w1" | "w2" },
): Promise<ScheduleFetchResult> {
  try {
    const params = new URLSearchParams();
    if (options?.weekend) params.set("weekend", options.weekend);
    const query = params.size ? `?${params.toString()}` : "";
    const schedule = await apiGet<ActivitySchedule>(
      `/activities/${legacyId}/itinerary/schedule${query}`,
    );
    const djs = schedule?.djs ?? [];
    const performances = schedule?.performances ?? [];
    const hasContent = djs.length > 0 || performances.length > 0;
    return {
      schedule,
      status: hasContent ? "ok" : "empty",
    };
  } catch {
    return { schedule: null, status: "error" };
  }
}

export type RavenPlanGenerationPayload = {
  guideId: string;
  departure: string;
  travelDateMode: "raven" | "manual";
  departureDate?: string;
  returnDate?: string;
  headcount: number;
  budgetTier: "economy" | "standard" | "comfort";
  selfDrive?: boolean;
  accommodationNights?: number;
  stayPreference?: "festival" | "city" | "value";
  note?: string;
  /** Plan copy language. Defaults to zh on the server when omitted. */
  locale?: "zh" | "en";
};

export type RavenTravelGuidePlan = {
  activityName: string;
  venue: string;
  eventDates: string;
  departure: string;
  headcount: number;
  budgetLabel: string;
  accommodationNights: number;
  selfDrive: boolean;
  recommendedDepartureDate?: string;
  recommendedReturnDate?: string;
  transport: {
    title: string;
    lines: string[];
    flightOffers?: Array<{
      pricePerAdult: number;
      currency: "CNY" | "USD";
      outbound: {
        route: string;
        depAirport?: string;
        arrAirport?: string;
        depTime?: string;
        arrTime?: string;
        stopsLabel: string;
      };
      return?: {
        route: string;
        depAirport?: string;
        arrAirport?: string;
        depTime?: string;
        arrTime?: string;
        stopsLabel: string;
      };
      cabinLabel?: string;
      recommendationReason?: string;
    }>;
  };
  accommodation: {
    title: string;
    hotels: Array<{
      name: string;
      note: string;
      reason?: string;
      bookingHint?: string;
    }>;
    schemes?: Array<{
      label: string;
      name: string;
      note: string;
      reason: string;
      bookingHint?: string;
    }>;
  };
  stayGuide?: {
    festivalId: string;
    recommendedAreas: Array<{
      area: string;
      score: number;
      tags: string[];
      reason: string;
    }>;
    estimatedNightlyRange?: {
      min: number;
      max: number;
      currency: "CNY" | "USD" | "EUR";
    };
  };
  parking?: { title: string; lines: string[] };
  /** Deprecated legacy field. Raven Plan no longer returns or renders afterparty picks. */
  nightlife?: {
    title: string;
    spots: Array<{ name: string; note: string; reason?: string }>;
  };
  tips: { title: string; items: string[] };
  venueTransport?: {
    title: string;
    options: Array<{ label: string; lines: string[] }>;
  };
  documents?: { title: string; items: string[] };
  tickets?: { title: string; channels: Array<{ name: string; note: string }> };
  essentials?: {
    title: string;
    network: string[];
    payment: string[];
    apps: string[];
  };
  budget?: {
    title: string;
    items: Array<{ label: string; range: string; note?: string }>;
  };
  itinerary?: {
    title: string;
    days: Array<{ label: string; lines: string[] }>;
  };
};

export type RavenPlanGenerationJob = {
  jobId: string;
  // Deployed generators may expose the pipeline stage either here or in progress.step.
  status: string;
  // Support both the current structured contract and the legacy numeric progress response.
  progress?: number | { step?: string; percent?: number };
  plan?: RavenTravelGuidePlan;
  errorMessage?: string;
};

export type RavenSavedPlan = {
  guideId: string;
  activityLegacyId: number;
  plan: RavenTravelGuidePlan;
  createdAt: string;
};

export type RavenFestivalWeather = {
  date: string;
  temperatureMin: number;
  temperatureMax: number;
  precipitationProbability: number;
  weatherCode: number;
};

export function getRavenFestivalWeather(legacyId: number) {
  return ravenApiRequest<RavenFestivalWeather | null>(
    `/raven/activities/${legacyId}/weather`,
  );
}

export function generateRavenPlan(
  legacyId: number,
  payload: RavenPlanGenerationPayload,
) {
  return ravenApiRequest<{ plan: RavenTravelGuidePlan; guideId?: string }>(
    `/raven/activities/${legacyId}/plan/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function generateRavenPlanAsync(
  legacyId: number,
  payload: RavenPlanGenerationPayload,
) {
  return ravenApiRequest<{ jobId: string }>(
    `/raven/activities/${legacyId}/plan/generate-async`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      timeoutMs: RAVEN_GENERATE_ASYNC_TIMEOUT_MS,
    },
  );
}

export function getRavenPlanGenerationJob(jobId: string, signal?: AbortSignal) {
  return ravenApiRequest<RavenPlanGenerationJob>(
    `/raven/plan/generation-jobs/${encodeURIComponent(jobId)}`,
    { signal, timeoutMs: RAVEN_POLL_TIMEOUT_MS },
  );
}

export async function getSavedRavenPlan(
  guideId: string,
): Promise<RavenSavedPlan | null> {
  if (!guideId.trim()) return null;
  return ravenApiRequest<RavenSavedPlan | null>(
    `/raven/plans/${encodeURIComponent(guideId)}`,
  );
}

export async function claimRavenPlan(guideId: string) {
  const csrf = await ensureAuthCsrf();
  return ravenApiRequest<RavenSavedPlan>(
    `/raven/plans/${encodeURIComponent(guideId)}/claim`,
    { method: 'POST', headers: { 'x-csrf-token': csrf } },
  );
}

export type RavenPlaceSuggestionKind = "city" | "airport";

export type RavenPlaceSuggestion = {
  kind: RavenPlaceSuggestionKind;
  title: string;
  city: string;
  country: string;
  iata?: string;
  icao?: string;
  airportName?: string;
  lat?: number;
  lng?: number;
};

export type FetchRavenPlaceSuggestionsParams = {
  keyword?: string;
  city?: string;
  country?: string;
  limit?: number;
  signal?: AbortSignal;
};

/**
 * Raven departure suggestions (OpenFlights).
 * - keyword → cities only (city name as title; IATA hits resolve to city)
 * - city (+ optional country) → city + airports (legacy)
 */
export async function fetchRavenPlaceSuggestions(
  params: FetchRavenPlaceSuggestionsParams,
): Promise<RavenPlaceSuggestion[]> {
  const search = new URLSearchParams();
  const keyword = params.keyword?.trim();
  const city = params.city?.trim();
  const country = params.country?.trim();
  if (city) {
    search.set("city", city);
    if (country) search.set("country", country);
  } else if (keyword) {
    search.set("keyword", keyword);
  } else {
    return [];
  }
  if (params.limit != null) search.set("limit", String(params.limit));

  // OpenFlights cold load can exceed the default 8s Raven timeout.
  const timeoutSignal =
    typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(25_000)
      : undefined;
  const signal =
    params.signal && timeoutSignal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([params.signal, timeoutSignal])
      : (params.signal ?? timeoutSignal);

  const result = await ravenApiRequest<
    { data: RavenPlaceSuggestion[] } | RavenPlaceSuggestion[]
  >(`/raven/place-suggestions?${search.toString()}`, { signal });

  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  return [];
}

function activityImageVersion(activity?: Activity | null): string | undefined {
  const stamp = activity?.updatedAt?.trim() || activity?.infoUpdatedAt?.trim();
  if (!stamp) return undefined;
  const parsed = Date.parse(stamp);
  return Number.isFinite(parsed) ? String(parsed) : stamp;
}

export function getActivityImage(
  activity?: Activity | null,
): string | undefined {
  const image = activity?.image?.trim();
  if (!image) return undefined;

  const version = activityImageVersion(activity);
  if (!version) return image;

  try {
    const url = new URL(image);
    url.searchParams.set("v", version);
    return url.toString();
  } catch {
    const separator = image.includes("?") ? "&" : "?";
    return `${image}${separator}v=${encodeURIComponent(version)}`;
  }
}
