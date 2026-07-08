'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function revealElement(el: Element) {
  el.setAttribute('data-revealed', '');
}

/**
 * Elements that globals.css already renders visible without `data-revealed`.
 * Skipping them avoids pointless DOM mutations and hydration races on above-fold
 * event detail / hero sections.
 */
function shouldSkipReveal(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;

  if (el.classList.contains('detail-hero')) return true;
  if (el.classList.contains('detail-sub-hero')) return true;
  if (el.classList.contains('section--detail-body')) return true;
  if (el.classList.contains('section--detail-tight')) return true;
  if (el.classList.contains('section--detail-countdown')) return true;
  if (el.classList.contains('section--detail-block')) return true;
  if (el.classList.contains('events-hero')) return true;
  if (el.classList.contains('plan-context')) return true;
  if (el.closest('.home')?.classList.contains('home') && el.classList.contains('section')) {
    return true;
  }

  return false;
}

function initScrollReveal() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = [...document.querySelectorAll('[data-reveal], [data-reveal-stagger]')].filter(
    (el) => !shouldSkipReveal(el),
  );

  if (!targets.length) return () => undefined;

  if (prefersReduced) {
    targets.forEach(revealElement);
    return () => undefined;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealElement(entry.target);
        observer.unobserve(entry.target);
      });
    },
    // threshold 0: tall sections (e.g. event lineup) can exceed the viewport height,
    // so 0.1 would never fire because 10% of the element cannot fit on screen.
    { rootMargin: '0px 0px -6% 0px', threshold: 0 },
  );

  // Always observe — never synchronously reveal in-viewport nodes. Sync reads +
  // setAttribute can run before React finishes hydrating route segments.
  targets.forEach((el) => {
    if (el.hasAttribute('data-revealed')) return;
    observer.observe(el);
  });

  return () => observer.disconnect();
}

function afterHydration(task: () => void): () => void {
  let cancelled = false;
  let frame1 = 0;
  let frame2 = 0;

  frame1 = window.requestAnimationFrame(() => {
    frame2 = window.requestAnimationFrame(() => {
      if (!cancelled) task();
    });
  });

  return () => {
    cancelled = true;
    window.cancelAnimationFrame(frame1);
    window.cancelAnimationFrame(frame2);
  };
}

export function ScrollRevealInit() {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let cleanup: (() => void) | undefined;
    let cancelAfterHydration: (() => void) | undefined;
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      cancelAfterHydration?.();
      cancelAfterHydration = afterHydration(() => {
        if (cancelled) return;
        cleanup?.();
        cleanup = initScrollReveal();
      });
    };

    // Retry covers client navigations where segment children hydrate after layout effects.
    run();
    const retryId = window.setTimeout(run, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(retryId);
      cancelAfterHydration?.();
      cleanup?.();
    };
  }, [pathname, hydrated]);

  return null;
}
