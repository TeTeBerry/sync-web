export const JOURNEY_TABS = ['experience', 'travel', 'budget'] as const;
export type JourneyTab = (typeof JOURNEY_TABS)[number];
export type JourneyEntryFrom = 'lineup' | 'event';

export function isJourneyTab(value: string): value is JourneyTab {
  return (JOURNEY_TABS as readonly string[]).includes(value);
}

export function resolveJourneyEntryFrom(input: {
  from?: string;
}): JourneyEntryFrom | undefined {
  if (input.from === 'lineup' || input.from === 'event') return input.from;
  return undefined;
}

export function resolveJourneyDefaultTab(input: {
  tab?: string;
  from?: string;
}): JourneyTab {
  if (input.tab && isJourneyTab(input.tab)) return input.tab;
  if (input.from === 'lineup') return 'experience';
  if (input.from === 'event') return 'travel';
  return 'travel';
}
