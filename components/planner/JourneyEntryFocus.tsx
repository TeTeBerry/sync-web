'use client';

import { useEffect } from 'react';
import type { JourneyEntryFrom } from '../../lib/planner-journey';

type JourneyEntryFocusProps = {
  entryFrom?: JourneyEntryFrom;
};

const ENTRY_TARGETS: Record<JourneyEntryFrom, string> = {
  lineup: 'journey-music',
  event: 'journey-timeline',
};

export function JourneyEntryFocus({ entryFrom }: JourneyEntryFocusProps) {
  useEffect(() => {
    if (!entryFrom) return;
    const id = ENTRY_TARGETS[entryFrom];
    const target = document.getElementById(id);
    if (!target) return;

    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [entryFrom]);

  return null;
}
