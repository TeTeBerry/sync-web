import { describe, expect, it } from 'vitest';
import type { RavenTravelGuidePlan } from './api';
import type { PlannerPlan } from './planner-plan';
import {
  looksLikeChineseCopy,
  remotePlanLooksChinese,
  resolveResultPlan,
  shouldSeedSharedPlan,
} from './planner-result';

const localPlan: PlannerPlan = {
  vibe: 'Local English vibe',
  experiences: ['Sunset mainstage moments'],
  artistTimeline: { days: [] },
  travel: {
    stay: 'Walking distance to Bangkok festival grounds',
    flight: 'Balanced flights from Singapore',
    transport: 'Venue shuttles + walking routes',
  },
  budget: {
    total: '$3,200',
    items: [{ label: 'Accommodation', amount: '$1,344', share: 42 }],
  },
};

function makeRemotePlan(overrides: Partial<RavenTravelGuidePlan> = {}): RavenTravelGuidePlan {
  return {
    activityName: 'Tomorrowland Thailand',
    venue: 'Chonburi',
    eventDates: '2026-12-11',
    departure: 'Singapore',
    headcount: 2,
    budgetLabel: '预算参考',
    accommodationNights: 3,
    selfDrive: false,
    transport: {
      title: '城际交通',
      lines: ['建议预订新加坡直飞曼谷的航班，提前办理入境准备。'],
    },
    accommodation: {
      title: '住宿推荐',
      hotels: [{ name: 'Hotel A', note: '距会场约 2 km，性价比高' }],
    },
    nightlife: { title: '散场去处', spots: [{ name: 'Night Market', note: '夜宵友好' }] },
    tips: { title: '小贴士', items: ['提前下载当地叫车 App', '散场后结伴回程'] },
    budget: {
      title: '预算明细',
      items: [
        { label: '住宿', range: '约 ¥2,400–3,200' },
        { label: '机票', range: '约 ¥1,800–2,600' },
      ],
    },
    ...overrides,
  };
}

describe('shouldSeedSharedPlan', () => {
  it('seeds once when a shared remote plan is present', () => {
    expect(
      shouldSeedSharedPlan({
        hasInitialRemote: true,
        alreadySeeded: false,
        hasUserGenerated: false,
      }),
    ).toBe(true);
  });

  it('does not re-seed after the first pass or after user generation', () => {
    expect(
      shouldSeedSharedPlan({
        hasInitialRemote: true,
        alreadySeeded: true,
        hasUserGenerated: false,
      }),
    ).toBe(false);
    expect(
      shouldSeedSharedPlan({
        hasInitialRemote: true,
        alreadySeeded: false,
        hasUserGenerated: true,
      }),
    ).toBe(false);
  });
});

describe('resolveResultPlan', () => {
  it('keeps remote content for zh', () => {
    const resolved = resolveResultPlan(makeRemotePlan(), localPlan, 'zh');
    expect(resolved.plan.travel.flight).toMatch(/新加坡/);
    expect(resolved.showLanguageCaveat).toBe(false);
  });

  it('keeps remote content for en orchestration results and caveats chinese copy', () => {
    const resolved = resolveResultPlan(makeRemotePlan(), localPlan, 'en');
    // Getting there must not keep Chinese transport prose on EN locale.
    expect(resolved.plan.travel.flight).toBe('');
    expect(resolved.plan.vibe).not.toBe(localPlan.vibe);
    expect(resolved.showLanguageCaveat).toBe(true);
  });

  it('does not show a caveat for english-looking remote plans', () => {
    const remote = makeRemotePlan({
      budgetLabel: 'Budget overview',
      transport: {
        title: 'Intercity travel',
        lines: ['Book a direct flight from Singapore to Bangkok.'],
      },
      accommodation: {
        title: 'Stay picks',
        hotels: [{ name: '曼谷河畔酒店', note: 'About 2 km from the venue' }],
      },
      tips: { title: 'Tips', items: ['Download a local rideshare app'] },
      nightlife: { title: 'After hours', spots: [{ name: '夜市', note: 'Late bites' }] },
      budget: {
        title: 'Budget detail',
        items: [{ label: 'Stay', range: 'About $300–400' }],
      },
    });
    const resolved = resolveResultPlan(remote, localPlan, 'en');
    expect(resolved.showLanguageCaveat).toBe(false);
    expect(resolved.plan.travel.flight).toMatch(/Singapore/);
  });

  it('ignores chinese hotel names when detecting language caveat', () => {
    const remote = makeRemotePlan({
      budgetLabel: 'Budget overview',
      transport: { title: 'Getting there', lines: ['Fly SIN → BKK'] },
      accommodation: {
        title: 'Stay recommendations',
        hotels: [{ name: '曼谷河畔精品酒店', note: '距会场约 1 km' }],
      },
      tips: { title: 'Tips', items: ['Bring a portable charger'] },
      nightlife: { title: 'Afterparty · late bites', spots: [{ name: '夜市小吃', note: '夜宵' }] },
      budget: { title: 'Budget reference (trip total)', items: [] },
    });
    expect(remotePlanLooksChinese(remote)).toBe(false);
  });

  it('falls back to local plan when remote is missing', () => {
    const resolved = resolveResultPlan(null, localPlan, 'en');
    expect(resolved.plan).toEqual(localPlan);
    expect(resolved.showLanguageCaveat).toBe(false);
  });
});

describe('chinese copy detection', () => {
  it('detects chinese-heavy samples', () => {
    expect(looksLikeChineseCopy('建议预订新加坡直飞曼谷的航班')).toBe(true);
    expect(looksLikeChineseCopy('Book a direct flight from Singapore')).toBe(false);
    expect(remotePlanLooksChinese(makeRemotePlan())).toBe(true);
  });
});
