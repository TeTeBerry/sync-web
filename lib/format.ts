import type { Activity, RecruitPost } from './types';

export function compactMeta(parts: Array<string | number | null | undefined>): string {
  return parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}

export function activityMeta(activity: Activity): string {
  return compactMeta([activity.date, activity.location ?? activity.city]);
}

export function recruitPeople(post: RecruitPost): string {
  if (post.currentPeople && post.targetPeople) {
    return `${post.currentPeople}/${post.targetPeople}`;
  }
  if (post.targetPeople) {
    return `目标 ${post.targetPeople} 人`;
  }
  return '公开招募';
}
