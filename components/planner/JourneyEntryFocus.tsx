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

    // Defer past first paint so journey scenes are visible before scroll.
    // Immediate scrollIntoView on SPA entry can land on an empty-looking frame.
    const timeoutId = window.setTimeout(() => {
      const target = document.getElementById(id);
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const alreadyInView = rect.top >= 0 && rect.top < window.innerHeight * 0.45;
      if (alreadyInView) return;

      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [entryFrom]);

  return null;
}
