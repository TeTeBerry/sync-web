'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function revealElement(el: Element) {
  el.setAttribute('data-revealed', '');
}

function isInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewWidth = window.innerWidth || document.documentElement.clientWidth;
  return rect.bottom > 0 && rect.top < viewHeight && rect.right > 0 && rect.left < viewWidth;
}

function initScrollReveal() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll('[data-reveal], [data-reveal-stagger]');

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

  targets.forEach((el) => {
    if (el.hasAttribute('data-revealed')) return;
    if (isInViewport(el)) {
      revealElement(el);
      return;
    }
    observer.observe(el);
  });

  return () => observer.disconnect();
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
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      cleanup?.();
      cleanup = initScrollReveal();
    };

    // Wait until the new route segment has hydrated before mutating className.
    // Immediate timers (setTimeout 0 / rAF) can still race client navigations.
    const timeoutId = window.setTimeout(run, 50);
    const retryId = window.setTimeout(run, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.clearTimeout(retryId);
      cleanup?.();
    };
  }, [pathname, hydrated]);

  return null;
}
