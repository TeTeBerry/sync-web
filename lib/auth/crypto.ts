import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const RAVEN_SESSION_COOKIE = 'raven_sid';
export const RAVEN_CSRF_COOKIE = 'raven_csrf';

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createCsrfToken(): string {
  return randomBytes(24).toString('base64url');
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function newEntityId(): string {
  return crypto.randomUUID();
}
