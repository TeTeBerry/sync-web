import { describe, expect, it } from 'vitest';
import {
  buildOriginOptions,
  isOriginOptionSelected,
  presetToOriginItem,
  suggestionToOriginItem,
} from './planner-origin';

describe('planner-origin', () => {
  it('builds unique origin values per city+country', () => {
    const canada = suggestionToOriginItem({
      kind: 'city',
      title: 'London',
      city: 'London',
      country: 'Canada',
    });
    const uk = suggestionToOriginItem({
      kind: 'city',
      title: 'London',
      city: 'London',
      country: 'United Kingdom',
    });

    expect(canada.originValue).toBe('London, Canada');
    expect(uk.originValue).toBe('London, United Kingdom');
    expect(canada.key).not.toBe(uk.key);
  });

  it('selects only the exact originValue (single-select)', () => {
    const canada = suggestionToOriginItem({
      kind: 'city',
      title: 'London',
      city: 'London',
      country: 'Canada',
    });
    const uk = suggestionToOriginItem({
      kind: 'city',
      title: 'London',
      city: 'London',
      country: 'United Kingdom',
    });

    expect(isOriginOptionSelected('', canada)).toBe(false);
    expect(isOriginOptionSelected('London, United Kingdom', canada)).toBe(false);
    expect(isOriginOptionSelected('London, United Kingdom', uk)).toBe(true);
    expect(isOriginOptionSelected('London', uk)).toBe(false);
  });

  it('does not repeat country in label and subtitle', () => {
    const item = suggestionToOriginItem({
      kind: 'city',
      title: 'London, United Kingdom',
      city: 'London, United Kingdom',
      country: 'United Kingdom',
    });
    expect(item.label).toBe('London');
    expect(item.subtitle).toBe('United Kingdom');
    expect(item.originValue).toBe('London, United Kingdom');
  });

  it('enriches presets with country so originValue matches remote shape', () => {
    const london = presetToOriginItem('London');
    expect(london.originValue).toBe('London, United Kingdom');
    expect(london.subtitle).toBe('United Kingdom');

    const shanghai = presetToOriginItem('上海');
    expect(shanghai.originValue).toBe('上海, 中国');
    expect(shanghai.subtitle).toBe('中国');
  });

  it('drops preset cities that duplicate remote city names', () => {
    const options = buildOriginOptions({
      presets: ['New York', 'London', 'Tokyo'],
      query: 'Lon',
      remote: [
        {
          kind: 'city',
          title: 'London',
          city: 'London',
          country: 'United Kingdom',
        },
        {
          kind: 'city',
          title: 'London',
          city: 'London',
          country: 'Canada',
        },
      ],
    });

    expect(options.map((o) => o.originValue)).toEqual([
      'London, United Kingdom',
      'London, Canada',
    ]);
    expect(options.every((o) => o.kind === 'city')).toBe(true);
  });

  it('shows presets only when query is empty (none pre-selected by helper)', () => {
    const options = buildOriginOptions({
      presets: ['New York', 'London'],
      query: '',
      remote: [
        {
          kind: 'city',
          title: 'London',
          city: 'London',
          country: 'United Kingdom',
        },
      ],
    });
    expect(options.map((o) => o.originValue)).toEqual([
      'New York, United States',
      'London, United Kingdom',
    ]);
  });
});
