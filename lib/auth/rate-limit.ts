type RateBucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, RateBucket>();

export type AuthRateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; remaining: 0; resetAt: number };

function readLimit(envKey: string, fallback: number): number {
  const raw = process.env[envKey]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

export function getAuthLoginRateLimits() {
  return {
    /** Max login attempts per IP per window. */
    ipMax: readLimit('TEMP_AUTH_LOGIN_IP_MAX', 20),
    ipWindowMs: readLimit('TEMP_AUTH_LOGIN_IP_WINDOW_MS', 15 * 60 * 1000),
    /** Max login attempts per normalized email per window. */
    emailMax: readLimit('TEMP_AUTH_LOGIN_EMAIL_MAX', 10),
    emailWindowMs: readLimit('TEMP_AUTH_LOGIN_EMAIL_WINDOW_MS', 15 * 60 * 1000),
    /** Threshold for logging suspicious repeated attempts (same IP). */
    suspiciousIpThreshold: readLimit('TEMP_AUTH_LOGIN_SUSPICIOUS_IP', 12),
  };
}

/** Test helper — clears in-memory buckets. */
export function resetAuthRateLimitMemory(): void {
  memoryBuckets.clear();
}

export function consumeAuthRateLimit(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): AuthRateLimitResult {
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, max - 1), resetAt };
  }

  if (existing.count >= max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  memoryBuckets.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, max - existing.count),
    resetAt: existing.resetAt,
  };
}

export function peekAuthRateLimitCount(key: string, now = Date.now()): number {
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) return 0;
  return existing.count;
}
