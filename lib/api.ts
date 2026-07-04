import type { Activity, ActivityListPage } from './types';
import { isActivityExpired } from './activity-date';

const API_BASE =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://sync-backend-prd-269371-9-1442514260.sh.run.tcloudbase.com/api';

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

async function apiGet<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${normalizeBaseUrl(API_BASE)}${path}`, {
    ...options,
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

export function getActivityLineup(activity: Activity): string[] {
  return [...(activity.lineup ?? []), ...(activity.artists ?? [])]
    .filter(Boolean)
    .slice(0, 12);
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

export type ActivitySchedule = {
  activityLegacyId: number;
  eventMeta?: string;
  djs?: ScheduleDj[];
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
    return {
      schedule,
      status: djs.length ? 'ok' : 'empty',
    };
  } catch {
    return { schedule: null, status: 'error' };
  }
}



export function getActivityImage(activity?: Activity | null): string | undefined {
  return activity?.image?.trim() || undefined;
}
