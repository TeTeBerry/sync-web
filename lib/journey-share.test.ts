import { describe, expect, it } from 'vitest';
import {
  buildJourneyShareFromSavedPlan,
  buildJourneyShareFromView,
  lookingForFromJourneyType,
  journeySharePath,
} from './journey-share';
import type { RavenJourneyView } from './raven-journey';
import type { RavenTravelGuidePlan } from './api';

function minimalJourney(overrides: Partial<RavenJourneyView> = {}): RavenJourneyView {
  return {
    festivalName: 'Tomorrowland',
    destination: 'Boom, Belgium',
    festivalDates: '17–19 Jul 2026',
    tripNights: 4,
    travelers: 2,
    origin: 'Shanghai',
    summary: 'A journey taking shape',
    breath: [],
    glance: {
      flight: { headline: 'PVG → BRU', detail: '' },
      stay: { headline: 'Near DreamVille', detail: '' },
      festival: { headline: 'Mainstage nights', detail: '' },
      budget: { headline: '¥18,000', detail: '', source: 'estimated' },
    },
    festivalExperience: {
      nonNegotiables: ['Amelie Lens', 'Tale Of Us', 'Charlotte de Witte', 'Extra'],
      ravenPicks: [],
      conflicts: [],
      dailyFlow: [],
      setTimesStatus: 'unavailable',
    },
    stayStrategy: {
      areaHeadline: 'Festival edge',
      areaReasons: [],
      options: [{ badge: '', name: 'DreamVille cabin', note: '', source: 'estimated' }],
    },
    flightStrategy: { recommendation: '', reasons: [], options: [] },
    timeline: [],
    budget: { total: '¥18,000', items: [], confidence: 'estimated' },
    essentials: [],
    insights: [],
    ...overrides,
  };
}

describe('journey-share', () => {
  it('builds a card from journey view with max 3 artists', () => {
    const card = buildJourneyShareFromView({
      id: 'guide-1',
      locale: 'en',
      journey: minimalJourney(),
      preferences: {
        origin: 'Shanghai',
        travelStyle: 'smart',
        stayPreference: 'festival',
        journeyType: 'solo',
        priorities: ['artists'],
      },
      heroImage: 'https://example.com/hero.jpg',
    });

    expect(card.festivalName).toBe('Tomorrowland');
    expect(card.favoriteArtists).toEqual([
      'Amelie Lens',
      'Tale Of Us',
      'Charlotte de Witte',
    ]);
    expect(card.lookingFor).toEqual(['festival_buddy', 'roommate']);
    expect(card.accommodation).toBe('DreamVille cabin');
    expect(card.sharePath).toContain('/en/journey/share/guide-1');
    expect(card.sharePath).toContain('artists=');
    expect(card.sharePath).toContain('looking=');
  });

  it('maps journey types to looking-for intents', () => {
    expect(lookingForFromJourneyType('friends')).toEqual(['festival_buddy', 'ride_share']);
    expect(lookingForFromJourneyType('couple')).toEqual(['festival_buddy']);
  });

  it('builds from saved plan and preserves artists/looking in sharePath', () => {
    const plan = {
      activityName: 'Ultra',
      venue: 'Miami',
      eventDates: 'Mar 2026',
      departure: 'Tokyo',
      headcount: 1,
      budgetLabel: 'Comfort',
      accommodationNights: 3,
      selfDrive: false,
      transport: { title: '', lines: [] },
      accommodation: {
        title: 'Stay',
        hotels: [{ name: 'Downtown loft', note: '' }],
      },
      nightlife: { title: '', spots: [] },
      tips: { title: '', items: [] },
      budget: { title: '', items: [{ label: 'Total', range: '$2,400' }] },
    } as RavenTravelGuidePlan;

    const card = buildJourneyShareFromSavedPlan({
      id: 'abc',
      locale: 'zh',
      plan,
      favoriteArtists: ['Fisher', 'Chris Lake'],
      lookingFor: ['roommate', 'ride_share'],
    });

    expect(card.festivalName).toBe('Ultra');
    expect(card.budget).toBe('$2,400');
    expect(card.favoriteArtists).toEqual(['Fisher', 'Chris Lake']);
    expect(card.lookingFor).toEqual(['roommate', 'ride_share']);
    expect(card.sharePath).toContain('/zh/journey/share/abc');
    expect(card.sharePath).toContain('artists=Fisher%7CChris+Lake');
    expect(card.sharePath).toContain('looking=roommate%2Cride_share');
    expect(journeySharePath('zh', 'abc')).toBe('/zh/journey/share/abc');
  });
});
