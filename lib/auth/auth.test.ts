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
import {
  ensureUserForAuthIdentity,
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
import {
  listSavedLineupSchedules,
  saveLineupSchedule,
} from '../lineup-schedule-repository';
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

  it('bridges Auth.js identities into raven_users and lists saved schedules', async () => {
    const authId = 'google-auth-user-123';
    const ensured = await ensureUserForAuthIdentity({
      id: authId,
      email: 'raver@example.com',
    });
    expect(ensured).toBe(authId);
    expect(await ensureUserForAuthIdentity({
      id: authId,
      email: 'raver@example.com',
    })).toBe(authId);

    const schedule = {
      activityLegacyId: 4,
      selectionScope: 'w1',
      selectedIds: ['artist-a@1200', 'artist-b@1320'],
      clashState: { deferredArtistIds: [], journeyArtistIds: [], resolutions: [] },
      savedAt: new Date().toISOString(),
    };
    await saveLineupSchedule(authId, schedule);
    const listed = await listSavedLineupSchedules(authId);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.selectedIds).toEqual(schedule.selectedIds);
  });

  it('reuses an existing email raven_users row for Auth.js identities', async () => {
    const { email, emailNormalized } = normalizeEmail('shared@example.com');
    const legacy = await findOrCreateUserByEmail({ email, emailNormalized });
    const bridged = await ensureUserForAuthIdentity({
      id: 'different-auth-js-id',
      email: 'shared@example.com',
    });
    expect(bridged).toBe(legacy.user.id);
  });
});

describe('mutation Origin + CSRF guards', () => {
  it('rejects missing Origin', () => {
    const request = new NextRequest('http://localhost:3002/api/auth/logout', {
      method: 'POST',
    });
    expect(assertSameOriginMutation(request)).toBe(false);
  });

  it('accepts matching Origin', () => {
    const request = new NextRequest('http://localhost:3002/api/auth/logout', {
      method: 'POST',
      headers: { origin: 'http://localhost:3002' },
    });
    expect(assertSameOriginMutation(request)).toBe(true);
  });

  it('rejects cross-origin', () => {
    const request = new NextRequest('http://localhost:3002/api/auth/logout', {
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
