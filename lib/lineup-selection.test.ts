import { describe, expect, it } from 'vitest';
import {
  pruneOffBillLineupSelection,
  TOMORROWLAND_BELGIUM_ACTIVITY_LEGACY_ID,
} from './lineup-selection';

describe('pruneOffBillLineupSelection', () => {
  it('removes cancelled TML Belgium picks that are no longer on the bill', () => {
    const result = pruneOffBillLineupSelection({
      activityLegacyId: TOMORROWLAND_BELGIUM_ACTIVITY_LEGACY_ID,
      selectedIds: [
        'tml-1-martin-garrix',
        'dimitri-vegas-and-like-mike',
        'tml-2-dimitri-vegas@1340',
      ],
      performanceArtistIds: [
        'tml-1-martin-garrix',
        'tml-2-dimitri-vegas',
      ],
      schedulePublished: true,
    });

    expect(result.kept).toEqual([
      'tml-1-martin-garrix',
      'tml-2-dimitri-vegas@1340',
    ]);
    expect(result.removed).toEqual(['dimitri-vegas-and-like-mike']);
  });

  it('does not prune other festivals or unpublished schedules', () => {
    const otherFestival = pruneOffBillLineupSelection({
      activityLegacyId: 1,
      selectedIds: ['dimitri-vegas-and-like-mike'],
      performanceArtistIds: ['someone-else'],
      schedulePublished: true,
    });
    expect(otherFestival.removed).toEqual([]);
    expect(otherFestival.kept).toEqual(['dimitri-vegas-and-like-mike']);

    const unpublished = pruneOffBillLineupSelection({
      activityLegacyId: TOMORROWLAND_BELGIUM_ACTIVITY_LEGACY_ID,
      selectedIds: ['dimitri-vegas-and-like-mike'],
      performanceArtistIds: ['someone-else'],
      schedulePublished: false,
    });
    expect(unpublished.removed).toEqual([]);
  });
});
