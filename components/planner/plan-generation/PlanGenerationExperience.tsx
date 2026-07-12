'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type {
  FestivalGenerationTheme,
  PlanGenerationCopy,
  PlanGenerationStage,
} from '../../../lib/plan-generation/types';
import {
  getPlanGenerationCopy,
  resolveSceneNarrative,
} from '../../../lib/plan-generation/copy';
import {
  advanceNarrativeStage,
  PLAN_GENERATION_SCENE_ORDER,
  stageIndex,
} from '../../../lib/plan-generation/progress';
import { festivalThemeCssVars } from '../../../lib/plan-generation/theme';
import type { Locale } from '../../../lib/i18n';
import { BrandLogo } from '../../BrandLogo';
import { EventImage } from '../../EventImage';

type PlanGenerationExperienceProps = {
  locale: Locale;
  festivalName: string;
  originCity: string;
  destinationCity: string;
  meta?: string;
  image?: string;
  artists: string[];
  theme: FestivalGenerationTheme;
  backendStage: PlanGenerationStage;
  active: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;

function useDocumentVisibility(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== 'hidden');
    onChange();
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

function StageMarkers({
  stage,
  copy,
  reducedMotion,
}: {
  stage: PlanGenerationStage;
  copy: PlanGenerationCopy;
  reducedMotion: boolean | null;
}) {
  const current = stageIndex(stage === 'failed' ? 'mission' : stage);
  const markers = PLAN_GENERATION_SCENE_ORDER.filter(
    (item): item is Exclude<PlanGenerationStage, 'completed' | 'failed'> =>
      item !== 'completed' && item !== 'failed',
  );

  return (
    <ol className="plan-gen__markers" aria-hidden>
      {markers.map((item, index) => {
        const done = index < current;
        const active = index === current || (stage === 'completed' && item === 'guide');
        return (
          <li
            key={item}
            className={[
              'plan-gen__marker',
              done ? 'is-done' : '',
              active ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-reduced={reducedMotion ? 'true' : undefined}
          >
            <span className="plan-gen__marker-dot" />
            <span className="plan-gen__marker-label">{copy.stageLabels[item]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function RouteSceneVisual({
  origin,
  destination,
  festival,
  reducedMotion,
}: {
  origin: string;
  destination: string;
  festival: string;
  reducedMotion: boolean | null;
}) {
  return (
    <div className="plan-gen__route" aria-hidden>
      <svg className="plan-gen__route-svg" viewBox="0 0 320 80" fill="none">
        <path
          className="plan-gen__route-path"
          d="M24 52 C 90 12, 150 12, 160 40 C 170 68, 230 68, 296 28"
        />
        {!reducedMotion ? (
          <circle className="plan-gen__route-traveler" r="4" cx="0" cy="0">
            <animateMotion
              dur="3.6s"
              repeatCount="indefinite"
              path="M24 52 C 90 12, 150 12, 160 40 C 170 68, 230 68, 296 28"
            />
          </circle>
        ) : null}
        <circle cx="24" cy="52" r="5" className="plan-gen__route-node" />
        <circle cx="160" cy="40" r="5" className="plan-gen__route-node" />
        <circle cx="296" cy="28" r="5" className="plan-gen__route-node is-end" />
      </svg>
      <div className="plan-gen__route-labels">
        <span>{origin || '—'}</span>
        <span>{destination || '—'}</span>
        <span>{festival}</span>
      </div>
    </div>
  );
}

function LineupVisual({ artists }: { artists: string[] }) {
  const shown = artists.slice(0, 5);
  if (!shown.length) {
    return <div className="plan-gen__constellation plan-gen__constellation--empty" aria-hidden />;
  }
  return (
    <ul className="plan-gen__constellation" aria-hidden>
      {shown.map((artist, index) => (
        <li
          key={artist}
          className="plan-gen__artist-node"
          style={{ '--node-i': String(index) } as CSSProperties}
        >
          {artist}
        </li>
      ))}
    </ul>
  );
}

function AssemblyVisual({
  labels,
  reducedMotion,
}: {
  labels: string[];
  reducedMotion: boolean | null;
}) {
  return (
    <ul
      className="plan-gen__assembly"
      aria-hidden
      data-reduced={reducedMotion ? 'true' : undefined}
      style={{ '--layer-count': String(labels.length) } as CSSProperties}
    >
      {labels.map((label, index) => (
        <li
          key={label}
          className="plan-gen__assembly-layer"
          style={{ '--layer-i': String(index) } as CSSProperties}
        >
          {label}
        </li>
      ))}
    </ul>
  );
}

function GuideVisual({ reducedMotion }: { reducedMotion: boolean | null }) {
  return (
    <div className="plan-gen__guide" aria-hidden data-reduced={reducedMotion ? 'true' : undefined}>
      <div className="plan-gen__guide-page">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="plan-gen__guide-cursor" />
    </div>
  );
}

export function PlanGenerationExperience({
  locale,
  festivalName,
  originCity,
  destinationCity,
  meta,
  image,
  artists,
  theme,
  backendStage,
  active,
}: PlanGenerationExperienceProps) {
  const reducedMotion = useReducedMotion();
  const pageVisible = useDocumentVisibility();
  const copy = getPlanGenerationCopy(locale);
  const [scene, setScene] = useState<PlanGenerationStage>('mission');
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [guideLineIndex, setGuideLineIndex] = useState(0);
  const sceneEnteredAtRef = useRef(Date.now());
  const hasArtists = artists.length > 0;

  useEffect(() => {
    if (!active) return;
    setScene('mission');
    const now = Date.now();
    setStartedAt(now);
    sceneEnteredAtRef.current = now;
    setGuideLineIndex(0);
  }, [active]);

  useEffect(() => {
    if (!active || !pageVisible) return;

    const tick = () => {
      const elapsedMs = Date.now() - startedAt;
      const msInNarrativeStage = Date.now() - sceneEnteredAtRef.current;
      setScene((current) => {
        const next = advanceNarrativeStage({
          backendStage,
          narrativeStage: current,
          elapsedMs,
          msInNarrativeStage,
          hasArtists,
        });
        if (next !== current) {
          sceneEnteredAtRef.current = Date.now();
        }
        return next;
      });
    };

    tick();
    const timer = window.setInterval(tick, reducedMotion ? 900 : 450);
    return () => window.clearInterval(timer);
  }, [active, backendStage, hasArtists, pageVisible, reducedMotion, startedAt]);

  useEffect(() => {
    if (!active || scene !== 'guide' || !pageVisible || reducedMotion) return;
    const timer = window.setInterval(() => {
      setGuideLineIndex((index) => (index + 1) % copy.guideRotating.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [active, copy.guideRotating.length, pageVisible, reducedMotion, scene]);

  const narrative = resolveSceneNarrative(scene, copy, {
    festivalName,
    originCity,
    destinationCity,
    hasArtists,
  });

  const rotatingLead =
    scene === 'guide' && !reducedMotion
      ? copy.guideRotating[guideLineIndex] ?? narrative.lead
      : narrative.lead;

  // Announce only major scene changes — not rotating decorative guide lines.
  const statusAnnouncement = narrative.title;

  return (
    <section
      className="plan-gen"
      data-atmosphere={theme.ravenAtmosphere}
      data-motif={theme.motif}
      data-route={theme.routeStyle}
      data-tone={theme.copyTone}
      data-stage={scene}
      data-reduced={reducedMotion ? 'true' : undefined}
      style={festivalThemeCssVars(theme)}
      aria-busy="true"
    >
      <div className="plan-gen__bg" aria-hidden>
        {image ? (
          <EventImage
            src={image}
            alt=""
            className="plan-gen__image"
            sizes="100vw"
            priority
          />
        ) : null}
        <div className="plan-gen__scrim" />
        <div className="plan-gen__glow plan-gen__glow--a" />
        <div className="plan-gen__glow plan-gen__glow--b" />
        <div className="plan-gen__motif" />
        {!reducedMotion && pageVisible ? <div className="plan-gen__particles" /> : null}
      </div>

      <div className="plan-gen__brand">
        <BrandLogo height={26} />
      </div>

      <div className="plan-gen__content">
        <p className="plan-gen__festival">{festivalName}</p>
        {meta ? <p className="plan-gen__meta">{meta}</p> : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            className="plan-gen__scene"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reducedMotion ? 0.2 : 0.45, ease: EASE }}
          >
            <p className="plan-gen__eyebrow">{narrative.eyebrow}</p>
            <h2 className="plan-gen__title">{narrative.title}</h2>
            <AnimatePresence mode="wait">
              <motion.p
                key={rotatingLead}
                className="plan-gen__lead"
                aria-hidden={scene === 'guide' && !reducedMotion ? true : undefined}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.28, ease: EASE }}
              >
                {rotatingLead}
              </motion.p>
            </AnimatePresence>

            {scene === 'lineup' ? <LineupVisual artists={artists} /> : null}
            {scene === 'route' ? (
              <RouteSceneVisual
                origin={originCity}
                destination={destinationCity}
                festival={festivalName}
                reducedMotion={reducedMotion}
              />
            ) : null}
            {scene === 'assembly' ? (
              <AssemblyVisual labels={copy.assemblyLabels} reducedMotion={reducedMotion} />
            ) : null}
            {scene === 'guide' || scene === 'completed' ? (
              <GuideVisual reducedMotion={reducedMotion} />
            ) : null}
            {scene === 'mission' ? <div className="plan-gen__mission-pulse" aria-hidden /> : null}
            {scene === 'festival' ? <div className="plan-gen__portal" aria-hidden /> : null}
          </motion.div>
        </AnimatePresence>

        <StageMarkers stage={scene} copy={copy} reducedMotion={reducedMotion} />
      </div>

      <span className="visually-hidden" aria-live="polite" aria-atomic="true">
        {statusAnnouncement}
      </span>
    </section>
  );
}
