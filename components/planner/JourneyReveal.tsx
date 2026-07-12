'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { BrandLogo } from '../BrandLogo';
import { EventImage } from '../EventImage';
import type { Locale } from '../../lib/i18n';
import { getPlanGenerationCopy } from '../../lib/plan-generation/copy';

type JourneyRevealProps = {
  active: boolean;
  locale: Locale;
  origin: string;
  destination: string;
  festivalName: string;
  image?: string;
  onComplete: (shouldAnimateResult?: boolean) => void;
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Short completion → plan reveal. Generation narrative already ran during polling;
 * this only settles the world and opens the finished journey.
 */
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
  const [canSkip, setCanSkip] = useState(false);
  const copy = getPlanGenerationCopy(locale);
  const title = copy.completed.title;
  const lead = copy.completed.lead.replace('{festivalName}', festivalName);
  const skipLabel = locale === 'zh' ? '进入旅程' : 'Enter journey';

  useEffect(() => {
    if (!active) return;
    if (reducedMotion) {
      onComplete(false);
      return;
    }

    setCanSkip(false);
    const skipTimer = window.setTimeout(() => setCanSkip(true), 420);
    const completeTimer = window.setTimeout(() => onComplete(true), 780);

    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(completeTimer);
    };
  }, [active, onComplete, reducedMotion]);

  return (
    <AnimatePresence>
      {active ? (
        <motion.section
          className="journey-reveal journey-reveal--ready"
          aria-live="polite"
          aria-label={title}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          {image ? (
            <EventImage src={image} alt="" className="journey-reveal__image" sizes="100vw" priority />
          ) : null}
          <div className="journey-reveal__scrim" aria-hidden />
          <div className="journey-reveal__glow" aria-hidden />

          <div className="journey-reveal__content">
            <motion.div
              className="journey-reveal__brand"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <BrandLogo height={24} />
            </motion.div>

            <motion.p
              className="journey-reveal__eyebrow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.3 }}
            >
              {copy.completed.eyebrow}
            </motion.p>

            <motion.h2
              className="journey-reveal__title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.45, ease: EASE }}
            >
              {title}
            </motion.h2>

            <motion.p
              className="journey-reveal__lead"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
            >
              {lead}
            </motion.p>

            <motion.ol
              className="journey-reveal__route"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28, duration: 0.35 }}
            >
              <li>
                <span className="journey-reveal__route-label">
                  {locale === 'zh' ? '出发' : 'Origin'}
                </span>
                <span className="journey-reveal__route-value">{origin || '—'}</span>
              </li>
              <li>
                <span className="journey-reveal__route-line" aria-hidden />
                <span className="journey-reveal__route-label">
                  {locale === 'zh' ? '目的地' : 'Destination'}
                </span>
                <span className="journey-reveal__route-value">{destination || '—'}</span>
              </li>
              <li>
                <span className="journey-reveal__route-line" aria-hidden />
                <span className="journey-reveal__route-label">
                  {locale === 'zh' ? '电音节' : 'Festival'}
                </span>
                <span className="journey-reveal__route-value">{festivalName}</span>
              </li>
            </motion.ol>
          </div>

          {canSkip ? (
            <button type="button" className="journey-reveal__skip" onClick={() => onComplete()}>
              {skipLabel}
            </button>
          ) : null}
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
