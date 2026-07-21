'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const BOOKMARKS_KEY = 'sync_bookmarks';

function coerceFavoriteIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
}

function readBookmarks(): Set<number> {
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return new Set();
    return new Set(coerceFavoriteIds(JSON.parse(raw) as unknown));
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
  const bookmarksRef = useRef(bookmarks);
  bookmarksRef.current = bookmarks;

  useEffect(() => {
    const initial = readBookmarks();
    bookmarksRef.current = initial;
    setBookmarks(initial);
    setHydrated(true);
  }, []);

  const isBookmarked = useCallback(
    (legacyId: number) => bookmarks.has(legacyId),
    [bookmarks],
  );

  const toggleBookmark = useCallback((legacyId: number): { added: boolean; ids: number[] } => {
    const next = new Set(bookmarksRef.current);
    const added = !next.has(legacyId);
    if (added) next.add(legacyId);
    else next.delete(legacyId);
    const ids = [...next];
    writeBookmarks(next);
    bookmarksRef.current = next;
    setBookmarks(next);
    return { added, ids };
  }, []);

  const replaceBookmarks = useCallback((nextIds: number[]) => {
    const next = new Set(coerceFavoriteIds(nextIds));
    writeBookmarks(next);
    bookmarksRef.current = next;
    setBookmarks(next);
  }, []);

  return { bookmarks, hydrated, isBookmarked, toggleBookmark, replaceBookmarks };
}

export { coerceFavoriteIds, BOOKMARKS_KEY };
