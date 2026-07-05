'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { readLineupSelection, writeLineupSelection } from '../../lib/lineup-selection';

type LineupSelectionContextValue = {
  hydrated: boolean;
  count: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  clear: () => void;
};

const LineupSelectionContext = createContext<LineupSelectionContextValue | null>(null);

export function LineupSelectionProvider({
  activityLegacyId,
  children,
}: {
  activityLegacyId: number;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSelected(new Set(readLineupSelection(activityLegacyId)));
    setHydrated(true);
  }, [activityLegacyId]);

  const persist = useCallback(
    (next: Set<string>) => {
      writeLineupSelection(activityLegacyId, [...next]);
    },
    [activityLegacyId],
  );

  const toggle = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    const next = new Set<string>();
    setSelected(next);
    persist(next);
  }, [persist]);

  const value = useMemo<LineupSelectionContextValue>(
    () => ({
      hydrated,
      count: selected.size,
      isSelected: (id: string) => selected.has(id),
      toggle,
      clear,
    }),
    [clear, hydrated, selected, toggle],
  );

  return (
    <LineupSelectionContext.Provider value={value}>{children}</LineupSelectionContext.Provider>
  );
}

export function useLineupSelection(): LineupSelectionContextValue {
  const context = useContext(LineupSelectionContext);
  if (!context) {
    throw new Error('useLineupSelection must be used within LineupSelectionProvider');
  }
  return context;
}
