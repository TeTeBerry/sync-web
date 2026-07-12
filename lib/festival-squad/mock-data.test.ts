import { describe, expect, it } from 'vitest';
import { addDaysYmd, getMockTravelers } from './mock-data';

describe('addDaysYmd', () => {
  it('shifts calendar days in UTC', () => {
    expect(addDaysYmd('2026-07-17', -1)).toBe('2026-07-16');
    expect(addDaysYmd('2026-07-17', 0)).toBe('2026-07-17');
    expect(addDaysYmd('2026-07-31', 1)).toBe('2026-08-01');
  });

  it('returns null for invalid input', () => {
    expect(addDaysYmd('July 17', -1)).toBeNull();
    expect(addDaysYmd('', 0)).toBeNull();
  });
});

describe('getMockTravelers', () => {
  it('returns empty when festival dates are unknown', () => {
    expect(getMockTravelers(4, null)).toEqual([]);
  });

  it('anchors traveler arrivals to the festival start', () => {
    const travelers = getMockTravelers(99, {
      start: '2026-12-18',
      end: '2026-12-20',
    });
    expect(travelers.length).toBeGreaterThan(0);
    expect(travelers.every((t) => t.eventId === 99)).toBe(true);
    const lily = travelers.find((t) => t.displayName === 'Lily');
    expect(lily?.arrivalDate).toBe('2026-12-17');
    expect(lily?.departureDate).toBe('2026-12-21');
    expect(lily?.accommodationName).toBe('Official Camping');
  });

  it('keeps Tomorrowland-specific stay names for event 4', () => {
    const travelers = getMockTravelers(4, {
      start: '2026-07-17',
      end: '2026-07-19',
    });
    const lily = travelers.find((t) => t.displayName === 'Lily');
    expect(lily?.accommodationName).toBe('DreamVille');
    expect(lily?.arrivalDate).toBe('2026-07-16');
  });
});
