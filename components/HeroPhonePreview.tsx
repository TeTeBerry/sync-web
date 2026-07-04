'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, MapPin, Sparkles, Users, Wallet } from 'lucide-react';
import type { Locale } from '../lib/i18n';

type PreviewContent = {
  badge: string;
  prompt: string;
  replyIntro: string;
  days: readonly { label: string; detail: string }[];
  budget: { label: string; value: string };
  chips: readonly [string, string, string, string];
};

type HeroPhonePreviewProps = {
  locale: Locale;
  preview: PreviewContent;
  ariaLabel: string;
};

const chipIcons = [Calendar, MapPin, Users, Wallet];

export function HeroPhonePreview({ locale, preview, ariaLabel }: HeroPhonePreviewProps) {
  const [phase, setPhase] = useState(0);
  const [pointerTiltEnabled, setPointerTiltEnabled] = useState(false);
  const visualRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setPhase(3);
      return;
    }

    const timers = [
      window.setTimeout(() => setPhase(1), 500),
      window.setTimeout(() => setPhase(2), 1100),
      window.setTimeout(() => setPhase(3), 1700),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const canTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPointerTiltEnabled(canTilt && !prefersReduced);
  }, []);

  function setTilt(x: number, y: number) {
    const visual = visualRef.current;
    if (!visual) return;
    visual.style.setProperty('--preview-tilt-x', x.toFixed(4));
    visual.style.setProperty('--preview-tilt-y', y.toFixed(4));
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const visual = visualRef.current;
    if (!visual) return;

    const rect = visual.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt(Math.max(-0.5, Math.min(0.5, x)), Math.max(-0.5, Math.min(0.5, y)));
  }

  function handlePointerLeave() {
    setTilt(0, 0);
  }

  const statusSubtitle = locale === 'zh' ? '音乐节出行规划' : 'Festival trip planning';

  return (
    <figure
      ref={visualRef}
      className={`ai-hero__visual${pointerTiltEnabled ? ' ai-hero__visual--tilt' : ''}`}
      onPointerMove={pointerTiltEnabled ? handlePointerMove : undefined}
      onPointerLeave={pointerTiltEnabled ? handlePointerLeave : undefined}
    >
      <figcaption className="visually-hidden">{ariaLabel}</figcaption>
      <div className="ai-hero__visual-halo" aria-hidden="true" />
      <div className="ai-preview">
        <div className="ai-preview__frame">
          <div className="ai-preview__bezel">
            <div className="ai-preview__status" aria-hidden="true">
              <span className="ai-preview__status-time">9:41</span>
              <span className="ai-preview__status-notch" />
              <span className="ai-preview__status-icons">
                <span />
                <span />
                <span />
              </span>
            </div>

            <header className="ai-preview__chrome">
              <span className="ai-preview__avatar">
                <Sparkles size={14} strokeWidth={2.25} />
              </span>
              <div className="ai-preview__chrome-copy">
                <span className="ai-preview__title">{preview.badge}</span>
                <span className="ai-preview__subtitle">{statusSubtitle}</span>
              </div>
              <span className="ai-preview__live" aria-hidden="true" />
            </header>

            <div className="ai-preview__body">
              <div
                className={`ai-preview__bubble ai-preview__bubble--user${phase >= 1 ? ' is-visible' : ''}`}
              >
                <p>{preview.prompt}</p>
              </div>

              <div
                className={`ai-preview__bubble ai-preview__bubble--ai${phase >= 2 ? ' is-visible' : ''}`}
              >
                <p>{preview.replyIntro}</p>

                <div className={`ai-preview__plan${phase >= 2 ? ' is-visible' : ''}`}>
                  {preview.days.map((day) => (
                    <article className="ai-preview__day" key={day.label}>
                      <span className="ai-preview__day-label">{day.label}</span>
                      <p>{day.detail}</p>
                    </article>
                  ))}

                  <div className="ai-preview__budget">
                    <Wallet size={13} strokeWidth={2} aria-hidden />
                    <div>
                      <span className="ai-preview__budget-label">{preview.budget.label}</span>
                      <span className="ai-preview__budget-value">{preview.budget.value}</span>
                    </div>
                  </div>
                </div>

                <div
                  className={`ai-preview__chips${phase >= 3 ? ' is-visible' : ''}`}
                  aria-hidden={phase < 3}
                >
                  {preview.chips.map((chip, index) => {
                    const Icon = chipIcons[index];
                    return (
                      <span className="ai-preview__chip" key={chip}>
                        <Icon size={9} strokeWidth={2} aria-hidden />
                        {chip}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
