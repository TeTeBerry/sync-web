'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function revealElement(el: Element) {
  el.classList.add('is-revealed');
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
    if (el.classList.contains('is-revealed')) return;
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

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const run = () => {
      cleanup = initScrollReveal();
    };

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(run, { timeout: 1200 });
      return () => {
        idleWindow.cancelIdleCallback?.(idleId);
        cleanup?.();
      };
    }

    const timeoutId = window.setTimeout(run, 1);
    return () => {
      window.clearTimeout(timeoutId);
      cleanup?.();
    };
  }, [pathname]);

  return null;
}
