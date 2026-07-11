import { describe, expect, it } from 'vitest';
import type { RavenTravelGuidePlan } from './api';
import type { PlannerPlan } from './planner-plan';
import {
  assignFlightBadges,
  buildRavenJourneyView,
  detectPriceSource,
  isBudgetTotalLabel,
} from './raven-journey';

const localPlan: PlannerPlan = {
  vibe: 'Local vibe',
  experiences: ['Sunset mainstage moments', 'Late-night discoveries'],
  artistTimeline: {
    days: [
      {
        label: 'Day 1',
        sets: [
          { time: '22:00', artist: 'Amelie Lens', stage: 'Main', highlight: true },
          { time: '22:00', artist: 'Charlotte de Witte', stage: 'Cage', highlight: true },
        ],
      },
    ],
  },
  travel: {
    stay: 'Walking distance to Boom festival grounds',
    flight: 'Balanced flights from London',
    transport: 'Venue shuttles',
  },
  budget: {
    total: '$3,200',
    items: [{ label: 'Accommodation', amount: '$1,344', share: 42 }],
  },
};

function makeRemote(overrides: Partial<RavenTravelGuidePlan> = {}): RavenTravelGuidePlan {
  return {
    activityName: 'Tomorrowland Belgium',
    venue: 'De Schorre',
    eventDates: '07/17-19',
    departure: 'London',
    headcount: 2,
    budgetLabel: 'Comfort',
    accommodationNights: 3,
    selfDrive: false,
    transport: {
      title: 'Flights',
      lines: ['LHR to BRU', 'Arrive one day early for calmer transfer'],
      flightOffers: [
        {
          pricePerAdult: 220,
          currency: 'USD',
          outbound: { route: 'LHR-BRU', stopsLabel: 'Direct', depTime: '09:00', arrTime: '11:20' },
        },
        {
          pricePerAdult: 160,
          currency: 'USD',
          outbound: { route: 'LHR-AMS-BRU', stopsLabel: '1 stop', depTime: '06:00', arrTime: '12:40' },
        },
      ],
    },
    accommodation: {
      title: 'Stay',
      hotels: [],
      schemes: [
        {
          label: 'Best Overall',
          name: 'Hotel Docklands',
          note: 'Live from RollingGo · near venue',
          reason: 'Short late-night return',
        },
      ],
    },
    nightlife: {
      title: 'Night',
      spots: [{ name: 'Afters bar', note: 'Worth arriving early', reason: 'Fits your taste' }],
    },
    tips: {
      title: 'Tips',
      items: [
        'Arrive through Brussels, stay near Boom, and keep the shared budget balanced.',
        'Sharing a room with one other traveler reduces the estimated stay cost by €310 per person.',
        'Book early',
      ],
    },
    essentials: {
      title: 'Essentials',
      network: ['eSIM'],
      payment: ['Card'],
      apps: ['Maps'],
    },
    itinerary: {
      title: 'Itinerary',
      days: [{ label: 'Arrival Day', lines: ['Land in BRU', 'Transfer to hotel'] }],
    },
    ...overrides,
  };
}

describe('isBudgetTotalLabel', () => {
  it('matches trip totals and rejects ordinary line items', () => {
    expect(isBudgetTotalLabel('Estimated total (group)')).toBe(true);
    expect(isBudgetTotalLabel('合计参考（全员）')).toBe(true);
    expect(isBudgetTotalLabel('Accommodation')).toBe(false);
    expect(isBudgetTotalLabel('Food & extras')).toBe(false);
  });
});

describe('detectPriceSource', () => {
  it('labels live, unavailable, and estimated notes', () => {
    expect(detectPriceSource('Live from RollingGo')).toBe('live');
    expect(detectPriceSource('Live price unavailable')).toBe('unavailable');
    expect(detectPriceSource('About ¥2,000')).toBe('estimated');
  });
});

describe('assignFlightBadges', () => {
  it('derives badges from rank, price, and stops — not fixed index labels', () => {
    const offers = makeRemote().transport.flightOffers!;
    const badges = assignFlightBadges(offers, 'en');
    expect(badges[0]).toBe('Recommended');
    expect(badges[1]).toBe('Lowest Cost');
  });
});

describe('buildRavenJourneyView', () => {
  it('attaches feeling lines to timeline days', () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: ['Amelie Lens'],
    });
    expect(view.timeline[0]?.feeling).toBeTruthy();
  });

  it('builds an editorial breath instead of only glance cards', () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: ['Amelie Lens'],
    });
    expect(view.breath.length).toBeGreaterThan(0);
    expect(view.breath.length).toBeLessThanOrEqual(3);
    expect(view.breath.some((line) => /Wake|Hold|Get there|Amelie|festival|Keep the trip/i.test(line))).toBe(true);
    expect(view.budget.confidence).toBeTruthy();
  });

  it('uses a confident budget total amount rather than a section title', () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        budget: {
          title: 'Budget reference',
          items: [
            { label: 'Accommodation', range: 'About $800–1,200' },
            { label: 'Estimated total (group)', range: 'About $3,200' },
          ],
        },
      }),
      local: localPlan,
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: ['Amelie Lens'],
    });
    expect(view.budget.total).toMatch(/\$/);
    expect(view.budget.total).not.toMatch(/Budget reference/i);
  });

  it('does not mix a local total with remote budget line items', () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        budget: {
          title: 'Budget reference',
          items: [{ label: 'Accommodation', range: 'About $800–1,200' }],
        },
      }),
      local: localPlan,
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: ['Amelie Lens'],
    });
    expect(view.budget.total).toBe('');
    expect(view.budget.items[0]?.amount).toMatch(/\$800/);
  });

  it('does not reuse hotel note as the stay area headline', () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        accommodation: {
          title: 'Stay',
          hotels: [],
          schemes: [
            {
              label: 'Best Overall',
              name: 'Hotel Docklands',
              note: 'Live from RollingGo · near venue',
              reason: 'Short late-night return',
            },
          ],
        },
      }),
      local: { ...localPlan, travel: { ...localPlan.travel, stay: '' } },
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: [],
    });
    expect(view.stayStrategy.areaHeadline).not.toContain('Live from RollingGo');
    expect(view.stayStrategy.options[0]?.note).toContain('Live from RollingGo');
  });

  it('prefers page destination over venue name', () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: ['Amelie Lens'],
    });
    expect(view.destination).toBe('Boom, Belgium');
  });

  it('does not invent set times from itinerary when scheduleDays are absent', () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: ['Amelie Lens'],
      hasTimedSchedule: true,
      scheduleDays: [],
    });
    expect(view.festivalExperience.setTimesStatus).toBe('unavailable');
    expect(view.festivalExperience.dailyFlow).toEqual([]);
    expect(view.timeline[0]?.label).toBe('Arrival Day');
  });

  it('uses performance scheduleDays for daily flow and conflicts', () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: ['Amelie Lens', 'Charlotte de Witte'],
      hasTimedSchedule: true,
      scheduleDays: localPlan.artistTimeline.days,
    });
    expect(view.festivalExperience.setTimesStatus).toBe('available');
    expect(view.festivalExperience.dailyFlow[0]?.sets[0]?.time).toBe('22:00');
    expect(view.festivalExperience.conflicts.length).toBeGreaterThan(0);
  });

  it('keeps stay strategy visible from area headline when hotels are empty', () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        accommodation: { title: 'Stay', hotels: [] },
      }),
      local: localPlan,
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: [],
    });
    expect(view.stayStrategy.areaHeadline).toContain('Boom');
    expect(view.stayStrategy.options).toEqual([]);
    expect(view.glance.stay.headline).toContain('Boom');
  });

  it('assigns grounded flight badges and tradeoffs', () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: [],
    });
    expect(view.flightStrategy.options[0]?.badge).toBe('Recommended');
    expect(view.flightStrategy.options[1]?.badge).toBe('Lowest Cost');
    expect(view.flightStrategy.options[1]?.tradeoff).toMatch(/stops|fare|route/i);
  });

  it('keeps Getting there English when remote transport lines are Chinese', () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        transport: {
          title: '出行',
          lines: [
            '从「伦敦」前往安特卫普为国际出行，建议提前 1–2 天飞抵',
            '建议搭乘国际航班飞往布鲁塞尔；往返机票建议提前关注',
            '抵目的地机场后的接驳见下方会场接驳',
          ],
          flightOffers: [],
        },
      }),
      local: localPlan,
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: [],
    });
    expect(view.flightStrategy.recommendation).not.toMatch(/[\u4e00-\u9fff]/);
    expect(view.flightStrategy.reasons.join(' ')).not.toMatch(/[\u4e00-\u9fff]/);
    expect(view.flightStrategy.options[0]?.route).not.toMatch(/[\u4e00-\u9fff]/);
    expect(view.flightStrategy.options[0]?.route).toMatch(/Balanced flights|Boom|Tomorrowland/i);
  });

  it('uses travelersFallback when remote headcount is missing', () => {
    const view = buildRavenJourneyView({
      remote: { ...makeRemote(), headcount: undefined as unknown as number },
      local: localPlan,
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: [],
      travelersFallback: 4,
    });
    expect(view.travelers).toBe(4);
  });

  it('keeps essentials group titles aligned with source fields', () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: [],
    });
    expect(view.essentials.map((group) => group.title)).toEqual(['Network', 'Payment', 'Apps']);
  });

  it('filters generic tips from Raven Insights', () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: 'en',
      festivalName: 'Tomorrowland Belgium',
      destination: 'Boom, Belgium',
      festivalDates: 'Jul 17–19',
      favoriteArtists: [],
    });
    expect(view.insights.some((tip) => /book early/i.test(tip))).toBe(false);
    expect(view.insights[0]).toMatch(/Sharing a room/i);
  });
});
