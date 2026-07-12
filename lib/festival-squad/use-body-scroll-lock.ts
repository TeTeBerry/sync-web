'use client';

import { useEffect } from 'react';

let lockCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';
let previousHtmlOverflow = '';

/**
 * Shared body scroll lock for stacked Festival Squad dialogs/sheets.
 * Uses a ref-count so nested open/close does not restore overflow too early.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;

    if (lockCount === 0) {
      const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
      previousOverflow = document.body.style.overflow;
      previousPaddingRight = document.body.style.paddingRight;
      previousHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      if (scrollbarGap > 0) {
        document.body.style.paddingRight = `${scrollbarGap}px`;
      }
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
        document.body.style.paddingRight = previousPaddingRight;
        document.documentElement.style.overflow = previousHtmlOverflow;
        previousOverflow = '';
        previousPaddingRight = '';
        previousHtmlOverflow = '';
      }
    };
  }, [active]);
}
