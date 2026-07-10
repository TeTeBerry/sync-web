import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import {
  resolvePlatformClientIp,
  resolveRavenRateKey,
} from './raven-proxy-identity';
import { isRavenApiStatusError } from './api';

describe('raven proxy identity', () => {
  it('ignores browser-supplied x-forwarded-for', () => {
    const request = new NextRequest('http://localhost:3000/api/raven/plans/x', {
      headers: {
        'x-forwarded-for': '1.2.3.4',
      },
    });
    expect(resolvePlatformClientIp(request)).toBeUndefined();
  });

  it('uses platform client IP headers', () => {
    const request = new NextRequest('http://localhost:3000/api/raven/plans/x', {
      headers: {
        'x-forwarded-for': '1.2.3.4',
        'x-vercel-forwarded-for': '9.9.9.9',
      },
    });
    expect(resolvePlatformClientIp(request)).toBe('9.9.9.9');
  });

  it('reuses a valid raven_rl cookie as the rate key', () => {
    const request = new NextRequest('http://localhost:3000/api/raven/plans/x', {
      headers: {
        cookie: 'raven_rl=abcDEF123456',
      },
    });
    expect(resolveRavenRateKey(request)).toEqual({
      key: 'abcDEF123456',
      isNew: false,
    });
  });

  it('mints a new rate key when cookie is missing or invalid', () => {
    const request = new NextRequest('http://localhost:3000/api/raven/plans/x', {
      headers: {
        cookie: 'raven_rl=bad key!',
      },
    });
    const resolved = resolveRavenRateKey(request);
    expect(resolved.isNew).toBe(true);
    expect(resolved.key).toMatch(/^[a-zA-Z0-9_-]{8,64}$/);
  });
});

describe('isRavenApiStatusError', () => {
  it('matches errors that carry an HTTP status', () => {
    const error = Object.assign(new Error('too many'), { status: 429 });
    expect(isRavenApiStatusError(error, 429)).toBe(true);
    expect(isRavenApiStatusError(error, 500)).toBe(false);
    expect(isRavenApiStatusError(new Error('Raven API failed: 429'), 429)).toBe(false);
  });
});
