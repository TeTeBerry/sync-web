import { describe, expect, it } from 'vitest';
import {
  CNY_PER_USD,
  formatDisplayMoney,
  localizeMoneyText,
  toDisplayAmount,
} from './raven-currency';

describe('raven-currency', () => {
  it('converts CNY to USD for EN display', () => {
    expect(toDisplayAmount(720, 'CNY', 'en')).toBeCloseTo(100);
    expect(formatDisplayMoney(720, 'CNY', 'en')).toBe('About $100');
  });

  it('keeps CNY for ZH display', () => {
    expect(formatDisplayMoney(720, 'CNY', 'zh')).toBe('约 ¥720');
  });

  it('rewrites yen ranges in EN copy', () => {
    expect(localizeMoneyText('About ¥2,400–3,200', 'en')).toBe(
      `About $${Math.round(2400 / CNY_PER_USD)}–${Math.round(3200 / CNY_PER_USD)}`,
    );
    expect(localizeMoneyText('起步约 ¥800/晚', 'en')).toContain('$');
    expect(localizeMoneyText('起步约 ¥800/晚', 'en')).not.toContain('¥');
    expect(localizeMoneyText('From ¥800/night', 'en')).toBe(
      `About $${Math.round(800 / CNY_PER_USD)}/night`,
    );
    expect(localizeMoneyText('From ¥800/night', 'en')).not.toContain('¥');
  });

  it('leaves USD copy unchanged', () => {
    expect(localizeMoneyText('About $420', 'en')).toBe('About $420');
  });
});
