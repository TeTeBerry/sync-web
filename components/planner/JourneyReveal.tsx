'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { BrandLogo } from '../BrandLogo';
import { EventImage } from '../EventImage';
import type { Locale } from '../../lib/i18n';

type JourneyRevealProps = {
  active: boolean;
  locale: Locale;
  origin: string;
  destination: string;
  festivalName: string;
  image?: string;
  onComplete: (shouldAnimateResult?: boolean) => void;
};

const COPY = {
  en: {
    statuses: [
      'Finding the best flights...',
      'Selecting the best stay...',
      'Matching your favorite artists...',
      'Balancing your budget...',
      'Building your festival journey...',
    ],
    title: 'Your Festival Journey',
    skip: 'Skip',
    origin: 'Origin',
    destination: 'Destination',
    festival: 'Festival',
  },
  zh: {
    statuses: ['寻找合适航班...', '挑选适合入住的地方...', '匹配你喜欢的艺人...', '平衡旅程预算...', '组装你的电音节旅程...'],
    title: '你的电音节旅程',
    skip: '跳过',
    origin: '出发地',
    destination: '目的地',
    festival: '电音节',
  },
} as const;

export function JourneyReveal({
  active,
  locale,
  origin,
  destination,
  festivalName,
  image,
  onComplete,
}: JourneyRevealProps) {
  const reducedMotion = useReducedMotion();
  const [statusIndex, setStatusIndex] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const copy = COPY[locale];

  useEffect(() => {
    if (!active) return;
    if (reducedMotion) {
      onComplete(false);
      return;
    }

    setStatusIndex(0);
    setCanSkip(false);
    let statusTimer: number | null = null;
    const statusStartTimer = window.setTimeout(() => {
      statusTimer = window.setInterval(() => {
        setStatusIndex((current) => (current + 1) % copy.statuses.length);
      }, 650);
    }, 1000);
    const skipTimer = window.setTimeout(() => setCanSkip(true), 2000);
    const completeTimer = window.setTimeout(onComplete, 5000);

    return () => {
      window.clearTimeout(statusStartTimer);
      if (statusTimer != null) window.clearInterval(statusTimer);
      window.clearTimeout(skipTimer);
      window.clearTimeout(completeTimer);
    };
  }, [active, copy.statuses.length, onComplete, reducedMotion]);

  const route = [
    { label: copy.origin, value: origin || '...' },
    { label: copy.destination, value: destination || '...' },
    { label: copy.festival, value: festivalName },
  ];

  return (
    <AnimatePresence>
      {active ? (
        <motion.section
          className="journey-reveal"
          aria-live="polite"
          aria-label={copy.title}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {image ? <EventImage src={image} alt="" className="journey-reveal__image" sizes="100vw" priority /> : null}
          <div className="journey-reveal__scrim" aria-hidden />
          <div className="journey-reveal__glow" aria-hidden />

          <div className="journey-reveal__content">
            <motion.div
              className="journey-reveal__brand"
              initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <BrandLogo height={24} />
            </motion.div>

            <motion.div
              className="journey-reveal__status"
              aria-atomic="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.3 }}
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={statusIndex}
                  initial={{ opacity: 0, y: 5, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -5, filter: 'blur(4px)' }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {copy.statuses[statusIndex]}
                </motion.p>
              </AnimatePresence>
            </motion.div>

            <motion.ol
              className="journey-reveal__route"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { delayChildren: 2.5, staggerChildren: 0.22 } },
              }}
            >
              {route.map((stop, index) => (
                <motion.li
                  key={stop.label}
                  variants={{
                    hidden: { opacity: 0, y: 8, filter: 'blur(5px)' },
                    visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
                  }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                >
                  {index < route.length - 1 ? (
                    <span className="journey-reveal__route-line" aria-hidden />
                  ) : null}
                  <span className="journey-reveal__route-label">{stop.label}</span>
                  <span className="journey-reveal__route-value">{stop.value}</span>
                </motion.li>
              ))}
            </motion.ol>

            <motion.h2
              className="journey-reveal__title"
              initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 3.5, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {copy.title}
            </motion.h2>
          </div>

          {canSkip ? (
            <button type="button" className="journey-reveal__skip" onClick={() => onComplete()}>
              {copy.skip}
            </button>
          ) : null}
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
