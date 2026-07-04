'use client';

import { useCallback, useEffect, useState } from 'react';

const BOOKMARKS_KEY = 'sync_bookmarks';

function readBookmarks(): Set<number> {
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is number => typeof value === 'number'));
  } catch {
    return new Set();
  }
}

function writeBookmarks(ids: Set<number>) {
  try {
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage unavailable
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBookmarks(readBookmarks());
    setHydrated(true);
  }, []);

  const isBookmarked = useCallback(
    (legacyId: number) => bookmarks.has(legacyId),
    [bookmarks],
  );

  const toggleBookmark = useCallback((legacyId: number): boolean => {
    let added = false;
    setBookmarks((current) => {
      const next = new Set(current);
      if (next.has(legacyId)) {
        next.delete(legacyId);
      } else {
        next.add(legacyId);
        added = true;
      }
      writeBookmarks(next);
      return next;
    });
    return added;
  }, []);

  return { bookmarks, hydrated, isBookmarked, toggleBookmark };
}
