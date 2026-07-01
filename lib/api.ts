import { fallbackActivities, fallbackPosts } from './fallback-data';
import type { Activity, EventPostsPage, RecruitPost } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000/api';

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

async function apiGet<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    next: { revalidate: 120 },
  });
  if (!response.ok) {
    throw new Error(`SYNC API ${path} failed: ${response.status}`);
  }
  return unwrap<T>((await response.json()) as T | ApiEnvelope<T>);
}

export async function listActivities(): Promise<Activity[]> {
  try {
    return await apiGet<Activity[]>('/activities');
  } catch {
    return fallbackActivities;
  }
}

export async function getActivity(id: number): Promise<Activity | null> {
  try {
    return await apiGet<Activity>(`/activities/${id}`);
  } catch {
    return fallbackActivities.find((item) => item.legacyId === id) ?? null;
  }
}

export async function listRecruitPosts(activityLegacyId: number): Promise<RecruitPost[]> {
  try {
    const page = await apiGet<EventPostsPage | RecruitPost[]>(
      `/posts?activityLegacyId=${activityLegacyId}&limit=6`,
    );
    if (Array.isArray(page)) return page;
    return page.items ?? page.posts ?? [];
  } catch {
    return activityLegacyId === 16 ? fallbackPosts : [];
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

export function getActivityImage(activity?: Activity | null): string | undefined {
  return activity?.image?.trim() || undefined;
}
