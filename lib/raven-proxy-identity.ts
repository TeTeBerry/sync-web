import type { NextRequest } from 'next/server';

export const RAVEN_RATE_KEY_COOKIE = 'raven_rl';
export const RAVEN_RATE_KEY_HEADER = 'x-raven-rate-key';
export const RAVEN_RATE_KEY_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

/** Platform-provided client IP only — never trust browser-supplied X-Forwarded-For. */
export function resolvePlatformClientIp(request: NextRequest): string | undefined {
  const candidates = [
    request.headers.get('x-vercel-forwarded-for'),
    request.headers.get('cf-connecting-ip'),
    request.headers.get('x-real-ip'),
  ];
  for (const value of candidates) {
    const ip = value?.split(',')[0]?.trim();
    if (ip) return ip;
  }
  return undefined;
}

export function resolveRavenRateKey(request: NextRequest): {
  key: string;
  isNew: boolean;
} {
  const existing = request.cookies.get(RAVEN_RATE_KEY_COOKIE)?.value?.trim();
  if (existing && RAVEN_RATE_KEY_PATTERN.test(existing)) {
    return { key: existing, isNew: false };
  }
  return {
    key: crypto.randomUUID().replace(/-/g, ''),
    isNew: true,
  };
}
