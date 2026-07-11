import { describe, expect, it } from 'vitest';
import { CNY_PER_USD } from './raven-currency';
import { buildEventTravelData } from './event-travel';
import type { Activity } from './types';

const domesticActivity = {
  legacyId: 1,
  name: 'Test Festival',
  title: 'Test Festival',
  region: 'domestic',
  city: 'Shanghai',
} as Activity;

const overseasActivity = {
  legacyId: 2,
  name: 'Tomorrowland',
  title: 'Tomorrowland',
  region: 'overseas',
  city: 'Boom',
} as Activity;

describe('buildEventTravelData budget currency', () => {
  it('converts domestic CNY bands to USD for EN (not symbol-only)', () => {
    const data = buildEventTravelData(domesticActivity, 'en');
    const mid = data.budget.items.tiers.find((tier) => tier.tier === 'mid');
    expect(mid?.estimate).toBe(
      `$${Math.round(2200 / CNY_PER_USD).toLocaleString('en-US')}–${Math.round(3500 / CNY_PER_USD).toLocaleString('en-US')} / person`,
    );
    expect(mid?.estimate).not.toContain('¥');
    expect(mid?.estimate).not.toMatch(/\$2,200/);
  });

  it('keeps domestic bands in CNY for ZH', () => {
    const data = buildEventTravelData(domesticActivity, 'zh');
    const mid = data.budget.items.tiers.find((tier) => tier.tier === 'mid');
    expect(mid?.estimate).toBe('¥2,200–3,500 / 人');
  });

  it('converts overseas CNY bands to USD for EN', () => {
    const data = buildEventTravelData(overseasActivity, 'en');
    const budget = data.budget.items.tiers.find((tier) => tier.tier === 'budget');
    expect(budget?.estimate).toBe(
      `$${Math.round(1800 / CNY_PER_USD).toLocaleString('en-US')}–${Math.round(2800 / CNY_PER_USD).toLocaleString('en-US')} / person`,
    );
    expect(budget?.estimate).not.toMatch(/\$1,800/);
  });

  it('shows overseas bands in CNY for ZH (not raw $ swap)', () => {
    const data = buildEventTravelData(overseasActivity, 'zh');
    const budget = data.budget.items.tiers.find((tier) => tier.tier === 'budget');
    expect(budget?.estimate).toBe('¥1,800–2,800 / 人');
    expect(budget?.estimate).not.toContain('$');
  });
});
