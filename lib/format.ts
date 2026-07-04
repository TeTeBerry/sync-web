import type { Activity } from './types';

export function compactMeta(parts: Array<string | number | null | undefined>): string {
  return parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}

export function activityMeta(activity: Activity): string {
  return compactMeta([activity.date, activity.location ?? activity.city]);
}
