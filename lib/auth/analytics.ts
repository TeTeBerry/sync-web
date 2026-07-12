/**
 * Analytics helpers for auth events.
 * Never pass raw email addresses to analytics.
 */
import { track } from '@vercel/analytics';
import type { AuthIntendedAction } from './types';

const EMAIL_LIKE = /@/;

function scrubProps(
  props?: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean> | undefined {
  if (!props) return undefined;
  const next: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('email') || lowerKey.includes('password')) continue;
    if (typeof value === 'string' && EMAIL_LIKE.test(value)) continue;
    next[key] = value;
  }
  return next;
}

export function trackAuthEvent(
  eventName:
    | 'auth_email_login_opened'
    | 'auth_email_submitted'
    | 'auth_email_login_completed'
    | 'auth_email_login_failed'
    | 'auth_returned_to_intended_action'
    | 'auth_logout_completed',
  props?: Record<string, string | number | boolean | null | undefined>,
): void {
  track(eventName, scrubProps(props));
}

export function assertNoEmailInAnalyticsProps(
  props: Record<string, unknown>,
): boolean {
  for (const [key, value] of Object.entries(props)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('email')) return false;
    if (typeof value === 'string' && EMAIL_LIKE.test(value)) return false;
  }
  return true;
}

export type AuthAnalyticsIntendedAction = AuthIntendedAction;
