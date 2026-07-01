import { fallbackActivities, fallbackPosts } from './fallback-data';
import type { Activity, EventPostsPage, RecruitPost } from './types';

const API_BASE =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://127.0.0.1:3000/api';

type ApiEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

type ActivityListPage = {
  items?: Activity[];
  total?: number;
  skip?: number;
  limit?: number;
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
    throw new Error(`SYNC API ${path} failed: ${response.status}`);
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
    image: getString(raw.image),
    description: getString(raw.description),
    lineup: getStringList(raw.lineup),
    artists: getStringList(raw.artists),
    status: getString(raw.status),
    attendees: getNumber(raw.attendees),
    recruitPostCount: getNumber(raw.recruitPostCount),
    lineupPublished: raw.lineupPublished,
    travelGuideSupported: raw.travelGuideSupported,
  };
}

function normalizeRecruitPost(raw: RecruitPost): RecruitPost {
  const targetPeople = raw.targetPeople ?? raw.slotsTotal;
  const currentPeople = raw.currentPeople ?? raw.slotsFilled;
  const unityTags = raw.unityTags ?? raw.recruitUnityTags ?? raw.tags;
  return {
    ...raw,
    id: String(raw.id),
    authorName: raw.authorName ?? raw.name,
    body: raw.body ?? raw.bodyPreview ?? raw.content,
    content: raw.content ?? raw.body ?? raw.bodyPreview,
    recruitStatus: raw.recruitStatus,
    currentPeople,
    targetPeople,
    unityTags,
  };
}

export async function listActivities(): Promise<Activity[]> {
  try {
    const payload = await apiGet<Activity[] | ActivityListPage>('/activities');
    const items = Array.isArray(payload) ? payload : (payload.items ?? []);
    return items.map(normalizeActivity).filter((item) => item.legacyId > 0);
  } catch {
    return fallbackActivities;
  }
}

export async function getActivity(id: number): Promise<Activity | null> {
  try {
    const activity = await apiGet<Activity | null>(`/activities/${id}`);
    return activity ? normalizeActivity(activity) : null;
  } catch {
    return fallbackActivities.find((item) => item.legacyId === id) ?? null;
  }
}

export async function listRecruitPosts(activityLegacyId: number): Promise<RecruitPost[]> {
  try {
    const page = await apiGet<EventPostsPage | RecruitPost[]>(
      `/posts?activityLegacyId=${activityLegacyId}&limit=6`,
    );
    const items = Array.isArray(page) ? page : (page.items ?? page.posts ?? []);
    return items.map(normalizeRecruitPost);
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
