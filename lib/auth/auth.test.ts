import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { isValidEmail, normalizeEmail } from './email';
import { sanitizeReturnUrl, parseIntendedAction } from './return-url';
import { buildAuthCapabilities, capabilitiesForAnonymous } from './capabilities';
import {
  consumeAuthRateLimit,
  resetAuthRateLimitMemory,
} from './rate-limit';
import { assertNoEmailInAnalyticsProps } from './analytics';
import { createMemoryAuthRuntime } from './memory-runtime';
import { TEMP_EMAIL_AUTH_SUCCESS_MESSAGE } from './config';
import {
  findOrCreateUserByEmail,
  findUserByNormalizedEmail,
  touchUserLastLogin,
} from './users';
import {
  createSession,
  deleteSessionByRawToken,
  findSessionByRawToken,
} from './sessions';
import { resetAuthMemoryStore, shouldUseAuthMemoryStore } from './store';
import { assertSameOriginMutation, requireCsrf } from './http';
import { consumeAuthUsage, resetAuthUsageMemory } from './usage-limits';
import { isPrivateProfileDetail } from './client-limits';

describe('normalizeEmail / isValidEmail', () => {
  it('trims and lowercases the domain', () => {
    expect(normalizeEmail('  Ada.Lovelace@Example.COM ')).toEqual({
      email: 'Ada.Lovelace@example.com',
      emailNormalized: 'ada.lovelace@example.com',
    });
  });

  it('accepts valid emails and rejects invalid', () => {
    expect(isValidEmail('you@example.com')).toBe(true);
    expect(isValidEmail('bad')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('sanitizeReturnUrl', () => {
  it('preserves safe relative paths', () => {
    expect(sanitizeReturnUrl('/en/events/tomorrowland/squad?x=1')).toBe(
      '/en/events/tomorrowland/squad?x=1',
    );
  });

  it('rejects open redirects and dangerous schemes', () => {
    expect(sanitizeReturnUrl('https://evil.example/phish')).toBeNull();
    expect(sanitizeReturnUrl('//evil.example')).toBeNull();
    expect(sanitizeReturnUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeReturnUrl('../escape')).toBeNull();
  });
});

describe('parseIntendedAction', () => {
  it('accepts known actions only', () => {
    expect(parseIntendedAction('create_squad_profile')).toBe('create_squad_profile');
    expect(parseIntendedAction('hack')).toBeNull();
  });
});

describe('capabilities', () => {
  it('allows squad basics for unverified users', () => {
    const caps = buildAuthCapabilities(null);
    expect(caps.canCreateSquadProfile).toBe(true);
    expect(caps.canSendConnectionRequest).toBe(true);
    expect(caps.canUseMessaging).toBe(false);
    expect(caps.canUsePayments).toBe(false);
    expect(caps.canAccessSensitiveTravelDetails).toBe(false);
  });

  it('unlocks restricted capabilities after verification', () => {
    const caps = buildAuthCapabilities(new Date().toISOString());
    expect(caps.canUseMessaging).toBe(true);
    expect(caps.canUsePayments).toBe(true);
  });

  it('denies everything for anonymous', () => {
    expect(capabilitiesForAnonymous().canCreateSquadProfile).toBe(false);
  });
});

describe('rate limiting', () => {
  beforeEach(() => {
    resetAuthRateLimitMemory();
  });

  it('blocks after max attempts', () => {
    const key = 'auth:login:ip:test';
    expect(consumeAuthRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(consumeAuthRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(consumeAuthRateLimit(key, 2, 60_000).allowed).toBe(false);
  });
});

describe('analytics scrubbing', () => {
  it('rejects props that include email', () => {
    expect(assertNoEmailInAnalyticsProps({ email: 'a@b.com' })).toBe(false);
    expect(assertNoEmailInAnalyticsProps({ note: 'hello@example.com' })).toBe(false);
    expect(assertNoEmailInAnalyticsProps({ intendedAction: 'create_squad_profile' })).toBe(
      true,
    );
  });
});

describe('memory auth runtime', () => {
  beforeEach(() => {
    resetAuthRateLimitMemory();
  });

  it('creates a user and session on valid email login', () => {
    const runtime = createMemoryAuthRuntime();
    const { result, rawToken, created } = runtime.login({
      email: 'Traveler@Example.com',
      returnUrl: '/en/events/x/squad',
      intendedAction: 'create_squad_profile',
      clientIp: '1.1.1.1',
    });
    expect(created).toBe(true);
    expect(result.message).toBe(TEMP_EMAIL_AUTH_SUCCESS_MESSAGE);
    expect(result.session.user.emailVerified).toBe(false);
    expect(result.session.user.emailVerifiedAt).toBeNull();
    expect(result.returnUrl).toBe('/en/events/x/squad');
    expect(result.intendedAction).toBe('create_squad_profile');
    expect(runtime.getSession(rawToken).signedIn).toBe(true);
  });

  it('rejects invalid email', () => {
    const runtime = createMemoryAuthRuntime();
    expect(() => runtime.login({ email: 'not-an-email', clientIp: '1.1.1.1' })).toThrow();
  });

  it('does not create duplicate users for the same normalized email', () => {
    const runtime = createMemoryAuthRuntime();
    runtime.login({ email: 'Same@Example.com', clientIp: '1.1.1.1' });
    const second = runtime.login({ email: 'same@example.com', clientIp: '1.1.1.2' });
    expect(second.created).toBe(false);
    expect(runtime.userCount()).toBe(1);
    expect(second.result.message).toBe(TEMP_EMAIL_AUTH_SUCCESS_MESSAGE);
  });

  it('logout invalidates the session', () => {
    const runtime = createMemoryAuthRuntime();
    const { rawToken } = runtime.login({ email: 'out@example.com', clientIp: '2.2.2.2' });
    runtime.logout(rawToken);
    expect(runtime.getSession(rawToken).signedIn).toBe(false);
  });

  it('rejects unsafe return URLs while still signing in', () => {
    const runtime = createMemoryAuthRuntime();
    const { result } = runtime.login({
      email: 'safe@example.com',
      returnUrl: 'https://evil.example',
      clientIp: '3.3.3.3',
    });
    expect(result.returnUrl).toBeNull();
    expect(result.session.signedIn).toBe(true);
  });

  it('rate limits repeated logins from the same IP', () => {
    const runtime = createMemoryAuthRuntime();
    process.env.TEMP_AUTH_LOGIN_IP_MAX = '2';
    resetAuthRateLimitMemory();
    runtime.login({ email: 'a@example.com', clientIp: '9.9.9.9' });
    runtime.login({ email: 'b@example.com', clientIp: '9.9.9.9' });
    expect(() => runtime.login({ email: 'c@example.com', clientIp: '9.9.9.9' })).toThrow();
    delete process.env.TEMP_AUTH_LOGIN_IP_MAX;
  });
});

describe('auth memory store fallback (no DATABASE_URL)', () => {
  beforeEach(() => {
    resetAuthMemoryStore();
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.POSTGRES_PRISMA_URL;
  });

  it('uses memory store when database URL is unset in non-production', () => {
    expect(shouldUseAuthMemoryStore()).toBe(true);
  });

  it('creates users and sessions without Postgres', async () => {
    const { email, emailNormalized } = normalizeEmail('Dev@Example.com');
    const first = await findOrCreateUserByEmail({ email, emailNormalized });
    expect(first.created).toBe(true);
    const second = await findOrCreateUserByEmail({ email, emailNormalized });
    expect(second.created).toBe(false);
    expect(second.user.id).toBe(first.user.id);

    const { rawToken } = await createSession(first.user.id);
    expect(await findSessionByRawToken(rawToken)).toMatchObject({
      userId: first.user.id,
    });
    await touchUserLastLogin(first.user.id);
    expect((await findUserByNormalizedEmail(emailNormalized))?.lastLoginAt).toBeTruthy();
    expect(await deleteSessionByRawToken(rawToken)).toBe(true);
    expect(await findSessionByRawToken(rawToken)).toBeNull();
  });
});

describe('mutation Origin + CSRF guards', () => {
  it('rejects missing Origin', () => {
    const request = new NextRequest('http://localhost:3002/api/auth/email-login', {
      method: 'POST',
    });
    expect(assertSameOriginMutation(request)).toBe(false);
  });

  it('accepts matching Origin', () => {
    const request = new NextRequest('http://localhost:3002/api/auth/email-login', {
      method: 'POST',
      headers: { origin: 'http://localhost:3002' },
    });
    expect(assertSameOriginMutation(request)).toBe(true);
  });

  it('rejects cross-origin', () => {
    const request = new NextRequest('http://localhost:3002/api/auth/email-login', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    });
    expect(assertSameOriginMutation(request)).toBe(false);
  });

  it('requireCsrf fails when cookie or header missing', () => {
    const missing = new NextRequest('http://localhost:3002/api/auth/logout', {
      method: 'POST',
      headers: { origin: 'http://localhost:3002' },
    });
    expect(requireCsrf(missing)).toBe(false);

    const headerOnly = new NextRequest('http://localhost:3002/api/auth/logout', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3002',
        'x-csrf-token': 'abc',
      },
    });
    expect(requireCsrf(headerOnly)).toBe(false);
  });
});

describe('server usage limits', () => {
  beforeEach(() => {
    resetAuthUsageMemory();
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    process.env.TEMP_AUTH_MAX_CONNECTION_REQUESTS_PER_DAY = '2';
    process.env.TEMP_AUTH_MAX_PRIVATE_PROFILE_VIEWS_PER_HOUR = '2';
  });

  afterEach(() => {
    delete process.env.TEMP_AUTH_MAX_CONNECTION_REQUESTS_PER_DAY;
    delete process.env.TEMP_AUTH_MAX_PRIVATE_PROFILE_VIEWS_PER_HOUR;
  });

  it('enforces connection request daily caps per user', async () => {
    expect((await consumeAuthUsage('u1', 'connection_request')).allowed).toBe(true);
    expect((await consumeAuthUsage('u1', 'connection_request')).allowed).toBe(true);
    expect((await consumeAuthUsage('u1', 'connection_request')).allowed).toBe(false);
    expect((await consumeAuthUsage('u2', 'connection_request')).allowed).toBe(true);
  });

  it('enforces private profile view hourly caps', async () => {
    expect((await consumeAuthUsage('u1', 'private_profile_view')).allowed).toBe(true);
    expect((await consumeAuthUsage('u1', 'private_profile_view')).allowed).toBe(true);
    expect((await consumeAuthUsage('u1', 'private_profile_view')).allowed).toBe(false);
  });
});

describe('isPrivateProfileDetail', () => {
  it('detects restricted visibility', () => {
    expect(isPrivateProfileDetail({})).toBe(false);
    expect(isPrivateProfileDetail({ showExactCity: false })).toBe(true);
    expect(isPrivateProfileDetail({ showCountryOnly: true })).toBe(true);
    expect(isPrivateProfileDetail({ hideProfile: true })).toBe(true);
  });
});
