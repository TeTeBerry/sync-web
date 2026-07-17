import { describe, expect, it } from 'vitest';
import type { SchedulePerformance } from './api';
import { createScheduleIcs, normalizeSelectedSchedule } from './lineup-schedule-export';

function performance(input: Partial<SchedulePerformance> & Pick<SchedulePerformance, 'artistId' | 'artistName'>): SchedulePerformance {
  return {
    dateKey: '2026-07-18',
    dateLabel: 'July 18',
    genre: '',
    genreLabel: '',
    stage: 'main',
    stageLabel: 'Main, Stage',
    startTime: '23:30',
    endTime: '00:30',
    startMinutes: 23 * 60 + 30,
    endMinutes: 24 * 60 + 30,
    popularity: 0,
    avatarSeed: '',
    genreColor: '',
    ...input,
  };
}

describe('lineup schedule export', () => {
  it('keeps only selected timed performances, in chronological order', () => {
    const items = normalizeSelectedSchedule({
      selectedIds: ['late@1410', 'early', 'untimed'],
      performances: [
        performance({ artistId: 'late', artistName: 'Late Artist' }),
        performance({ artistId: 'early', artistName: 'Early Artist', startTime: '21:00', endTime: '22:00', startMinutes: 21 * 60, endMinutes: 22 * 60 }),
      ],
      conflicts: [],
      resolveArtistName: (id) => id === 'untimed' ? 'Waiting Artist' : id,
    });
    expect(items.map((item) => item.artistName)).toEqual(['Early Artist', 'Late Artist', 'Waiting Artist']);
    expect(items.at(-1)?.startTime).toBeUndefined();
  });

  it('drops off-bill picks when dropOffBill is set (TML Belgium cancelled acts)', () => {
    const items = normalizeSelectedSchedule({
      selectedIds: ['tml-1-garrix', 'dimitri-vegas-and-like-mike'],
      performances: [
        performance({ artistId: 'tml-1-garrix', artistName: 'Martin Garrix' }),
      ],
      conflicts: [],
      resolveArtistName: (id) =>
        id === 'dimitri-vegas-and-like-mike' ? 'Dimitri Vegas & Like Mike' : id,
      dropOffBill: true,
    });
    expect(items.map((item) => item.artistName)).toEqual(['Martin Garrix']);
  });

  it('exports escaped ICS text and carries midnight-ending sets into the next day', () => {
    const ics = createScheduleIcs({
      meta: { festivalName: 'Raven, Fest', festivalSlug: 'raven-fest', venue: 'A; B', timeZone: 'Europe/Brussels' },
      items: [{ artistId: 'a', artistName: 'A\\B', stageName: 'Main, Stage', festivalDay: '2026-07-18', startTime: '23:30', endTime: '00:30', startMinutes: 1410 }],
    });
    expect(ics).toContain('SUMMARY:A\\\\B — Raven\\, Fest');
    expect(ics).toContain('LOCATION:Main\\, Stage\\, A\\; B');
    expect(ics).toContain('DTEND:20260718T223000Z');
  });
});
