import type { Activity, ActivityListPage } from './types';
import { isActivityExpired } from './activity-date';

const PRODUCTION_API_BASE =
  'https://sync-backend-prd-269371-9-1442514260.sh.run.tcloudbase.com/api';

function isLoopbackApiUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

function resolveApiBase(): string {
  const configured = process.env.API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const publicConfigured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (publicConfigured && !isLoopbackApiUrl(publicConfigured)) {
    return publicConfigured.replace(/\/$/, '');
  }

  return PRODUCTION_API_BASE;
}

const API_BASE = resolveApiBase();

type ApiEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as ApiEnvelope<T>).data !== undefined
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, '');
}

const API_FETCH_TIMEOUT_MS = 8_000;

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

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.map((item) => getString(item)).filter(Boolean) as string[];
  return items.length ? items : undefined;
}

function inferCity(activity: Activity): string | undefined {
  return activity.city ?? activity.area ?? getString(activity.location?.split(/[·,，]/)[0]);
}

function normalizeActivity(raw: Activity): Activity {
  return {
    ...raw,
    legacyId: getNumber(raw.legacyId) ?? 0,
    name: getString(raw.name) ?? getString(raw.title) ?? '未命名活动',
    code: getString(raw.code),
    date: getString(raw.date),
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
    infoSource: getString(raw.infoSource),
    infoUpdatedAt: getString(raw.infoUpdatedAt),
    updatedAt: getString(raw.updatedAt),
    damaiProjectId: getString(raw.damaiProjectId),
  };
}

export type ActivitiesFetchStatus = 'ok' | 'empty' | 'error';

export type ActivitiesFetchResult = {
  activities: Activity[];
  status: ActivitiesFetchStatus;
};

async function fetchActivitiesPayload(): Promise<Activity[]> {
  const payload = await apiGet<Activity[] | ActivityListPage>('/activities');
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
      status: activities.length ? 'ok' : 'empty',
    };
  } catch {
    return { activities: [], status: 'error' };
  }
}

export async function listActivities(): Promise<Activity[]> {
  const result = await fetchActivities();
  return result.activities;
}

export type ActivityFetchStatus = 'ok' | 'not_found' | 'error';

export type ActivityFetchResult = {
  activity: Activity | null;
  status: ActivityFetchStatus;
};

export async function getActivity(id: number): Promise<ActivityFetchResult> {
  if (!Number.isFinite(id) || id <= 0) {
    return { activity: null, status: 'not_found' };
  }

  try {
    const response = await fetch(`${normalizeBaseUrl(API_BASE)}/activities/${id}`, {
      next: { revalidate: 120 },
    });

    if (response.status === 404) {
      return { activity: null, status: 'not_found' };
    }

    if (!response.ok) {
      return { activity: null, status: 'error' };
    }

    const payload = unwrap<Activity | null>((await response.json()) as Activity | ApiEnvelope<Activity | null>);
    if (!payload) {
      return { activity: null, status: 'not_found' };
    }

    return { activity: normalizeActivity(payload), status: 'ok' };
  } catch {
    return { activity: null, status: 'error' };
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

export type ScheduleFetchStatus = 'ok' | 'empty' | 'error';

export type ScheduleFetchResult = {
  schedule: ActivitySchedule | null;
  status: ScheduleFetchStatus;
};

export async function fetchActivitySchedule(legacyId: number): Promise<ScheduleFetchResult> {
  try {
    const schedule = await apiGet<ActivitySchedule>(
      `/activities/${legacyId}/itinerary/schedule`,
    );
    const djs = schedule?.djs ?? [];
    const performances = schedule?.performances ?? [];
    const hasContent = djs.length > 0 || performances.length > 0;
    return {
      schedule,
      status: hasContent ? 'ok' : 'empty',
    };
  } catch {
    return { schedule: null, status: 'error' };
  }
}



function activityImageVersion(activity?: Activity | null): string | undefined {
  const stamp = activity?.updatedAt?.trim() || activity?.infoUpdatedAt?.trim();
  if (!stamp) return undefined;
  const parsed = Date.parse(stamp);
  return Number.isFinite(parsed) ? String(parsed) : stamp;
}

export function getActivityImage(activity?: Activity | null): string | undefined {
  const image = activity?.image?.trim();
  if (!image) return undefined;

  const version = activityImageVersion(activity);
  if (!version) return image;

  try {
    const url = new URL(image);
    url.searchParams.set('v', version);
    return url.toString();
  } catch {
    const separator = image.includes('?') ? '&' : '?';
    return `${image}${separator}v=${encodeURIComponent(version)}`;
  }
}
