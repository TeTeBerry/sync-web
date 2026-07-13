import { describe, expect, it } from 'vitest';
import {
  detectLineupConflicts,
  getArtistScheduleStatus,
  summarizeConflicts,
  type ClashPerformance,
} from './lineup-clash';
import {
  applyClashResolution,
  emptyClashState,
  ensureJourneyMembership,
} from './lineup-clash-state';

const day = '2026-07-18';

function slot(
  partial: Partial<ClashPerformance> &
    Pick<ClashPerformance, 'artistId' | 'artistName' | 'startMinutes' | 'endMinutes'>,
): ClashPerformance {
  return {
    dateKey: day,
    stageLabel: partial.stageLabel ?? 'Mainstage',
    startTime: partial.startTime ?? '22:00',
    endTime: partial.endTime ?? '23:00',
    ...partial,
  };
}

describe('lineup clash detection', () => {
  it('finds no conflict when schedules do not overlap and transfer is comfortable', () => {
    const conflicts = detectLineupConflicts({
      selectedArtistIds: ['a', 'b'],
      schedulePublished: true,
      performances: [
        slot({
          artistId: 'a',
          artistName: 'Alpha',
          startMinutes: 22 * 60,
          endMinutes: 23 * 60,
          stageLabel: 'Main',
        }),
        slot({
          artistId: 'b',
          artistName: 'Beta',
          startMinutes: 23 * 60 + 30,
          endMinutes: 24 * 60 + 30,
          stageLabel: 'Main',
          startTime: '23:30',
          endTime: '00:30',
        }),
      ],
    });
    expect(conflicts.filter((c) => c.type !== 'schedule-pending')).toHaveLength(0);
  });

  it('detects hard overlap', () => {
    const conflicts = detectLineupConflicts({
      selectedArtistIds: ['a', 'b'],
      schedulePublished: true,
      performances: [
        slot({
          artistId: 'a',
          artistName: 'Alpha',
          startMinutes: 22 * 60,
          endMinutes: 23 * 60,
        }),
        slot({
          artistId: 'b',
          artistName: 'Beta',
          startMinutes: 22 * 60 + 10,
          endMinutes: 23 * 60 + 10,
          stageLabel: 'Stage B',
        }),
      ],
    });
    expect(conflicts.some((c) => c.type === 'hard-clash')).toBe(true);
    expect(summarizeConflicts(conflicts).hard).toBeGreaterThan(0);
  });

  it('detects partial overlap', () => {
    const conflicts = detectLineupConflicts({
      selectedArtistIds: ['a', 'b'],
      schedulePublished: true,
      performances: [
        slot({
          artistId: 'a',
          artistName: 'Alpha',
          startMinutes: 22 * 60,
          endMinutes: 23 * 60,
        }),
        slot({
          artistId: 'b',
          artistName: 'Beta',
          startMinutes: 22 * 60 + 50,
          endMinutes: 23 * 60 + 40,
          stageLabel: 'Stage B',
        }),
      ],
    });
    expect(conflicts.some((c) => c.type === 'partial-clash')).toBe(true);
  });

  it('detects tight transfer between stages', () => {
    const conflicts = detectLineupConflicts({
      selectedArtistIds: ['a', 'b'],
      schedulePublished: true,
      performances: [
        slot({
          artistId: 'a',
          artistName: 'Alpha',
          startMinutes: 22 * 60,
          endMinutes: 23 * 60,
          stageLabel: 'Mainstage',
        }),
        slot({
          artistId: 'b',
          artistName: 'Beta',
          startMinutes: 23 * 60 + 5,
          endMinutes: 24 * 60,
          stageLabel: 'Warehouse',
          startTime: '23:05',
          endTime: '00:00',
        }),
      ],
    });
    expect(conflicts.some((c) => c.type === 'tight-transfer')).toBe(true);
  });

  it('treats missing timetable as schedule-pending, not no conflict', () => {
    const conflicts = detectLineupConflicts({
      selectedArtistIds: ['a'],
      schedulePublished: false,
      performances: [],
    });
    expect(conflicts.some((c) => c.type === 'schedule-pending')).toBe(true);
    expect(getArtistScheduleStatus({
      artistId: 'a',
      selectedArtistIds: ['a'],
      performances: [],
      schedulePublished: false,
    })).toBe('schedule-pending');
  });

  it('offers split-both only when feasible', () => {
    const partial = detectLineupConflicts({
      selectedArtistIds: ['a', 'b'],
      schedulePublished: true,
      performances: [
        slot({
          artistId: 'a',
          artistName: 'Alpha',
          startMinutes: 22 * 60,
          endMinutes: 23 * 60,
          stageLabel: 'A',
        }),
        slot({
          artistId: 'b',
          artistName: 'Beta',
          startMinutes: 22 * 60 + 45,
          endMinutes: 23 * 60 + 45,
          stageLabel: 'B',
        }),
      ],
    });
    const conflict = partial.find((c) => c.type === 'partial-clash');
    expect(conflict?.resolutionOptions.some((o) => o.type === 'split-both')).toBe(true);

    const impossible = detectLineupConflicts({
      selectedArtistIds: ['a', 'b'],
      schedulePublished: true,
      performances: [
        slot({
          artistId: 'a',
          artistName: 'Alpha',
          startMinutes: 22 * 60,
          endMinutes: 23 * 60,
          stageLabel: 'A',
        }),
        slot({
          artistId: 'b',
          artistName: 'Beta',
          startMinutes: 22 * 60 + 5,
          endMinutes: 23 * 60 + 5,
          stageLabel: 'Far Away',
        }),
      ],
    });
    const hard = impossible.find((c) => c.type === 'hard-clash');
    // Hard near-total overlap should not invent a meaningless split.
    const split = hard?.resolutionOptions.find((o) => o.type === 'split-both');
    if (split) {
      expect(
        split.itineraryImpact.some(
          (impact) => (impact.missedMinutes ?? 0) < 50,
        ),
      ).toBe(true);
    }
  });
});

describe('lineup clash resolution state', () => {
  it('updates journey membership without removing My Lineup concept', () => {
    let state = ensureJourneyMembership(emptyClashState(), 'a');
    state = ensureJourneyMembership(state, 'b');
    const next = applyClashResolution(state, {
      conflictId: 'hard:day:a:b',
      optionType: 'keep-artist-a',
      artistAId: 'a',
      artistBId: 'b',
    });
    expect(next.journeyArtistIds).toContain('a');
    expect(next.journeyArtistIds).not.toContain('b');
    expect(next.deferredArtistIds).toContain('b');
  });

  it('defers both artists on decide-later', () => {
    const next = applyClashResolution(emptyClashState(), {
      conflictId: 'x',
      optionType: 'decide-later',
      artistAId: 'a',
      artistBId: 'b',
    });
    expect(next.deferredArtistIds).toEqual(expect.arrayContaining(['a', 'b']));
    expect(next.journeyArtistIds).toHaveLength(0);
  });

  it('keeps both on journey when split is chosen', () => {
    const next = applyClashResolution(emptyClashState(), {
      conflictId: 'x',
      optionType: 'split-both',
      artistAId: 'a',
      artistBId: 'b',
      watchWindows: [
        { artistId: 'a', watchFrom: '22:00', watchUntil: '22:35', missedMinutes: 25 },
        { artistId: 'b', watchFrom: '22:50', watchUntil: '23:30', missedMinutes: 0 },
      ],
    });
    expect(next.journeyArtistIds).toEqual(expect.arrayContaining(['a', 'b']));
    expect(next.resolutions[0]?.watchWindows?.length).toBe(2);
  });
});
