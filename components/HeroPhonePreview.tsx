'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CalendarDays, ChevronLeft, Compass, Sparkles } from 'lucide-react';
import type { Locale } from '../lib/i18n';

type HeroFlowFestival = {
  name: string;
  date: string;
  location: string;
  tag: string;
  featured?: boolean;
};

type HeroFlowArtist = {
  name: string;
  time: string;
  accent: string;
};

type HeroFlowPlanRow = {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
};

type HeroFlowCalendarEvent = {
  day: number;
  label: string;
};

type HeroFlowAgendaItem = {
  time: string;
  title: string;
  meta: string;
};

export type HeroFlowContent = {
  ariaLabel: string;
  steps: readonly { label: string }[];
  discovery: {
    title: string;
    festivals: readonly HeroFlowFestival[];
  };
  lineup: {
    title: string;
    stage: string;
    artists: readonly HeroFlowArtist[];
  };
  generate: {
    title: string;
    status: string;
    detail: string;
  };
  plan: {
    badge: string;
    title: string;
    meta: string;
    rows: readonly HeroFlowPlanRow[];
  };
  calendar: {
    title: string;
    month: string;
    weekdays: readonly string[];
    events: readonly HeroFlowCalendarEvent[];
    agenda: readonly HeroFlowAgendaItem[];
  };
};

type HeroPhonePreviewProps = {
  locale: Locale;
  flow: HeroFlowContent;
};

const STEP_MS = [2800, 3200, 1800, 3000, 3200] as const;
const STEP_COUNT = STEP_MS.length;

function buildCalendarCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [];

  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const CALENDAR_CELLS = buildCalendarCells(2026, 11);

export function HeroPhonePreview({ locale, flow }: HeroPhonePreviewProps) {
  const [step, setStep] = useState(0);
  const [selectedFestival, setSelectedFestival] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState(0);
  const [pointerTiltEnabled, setPointerTiltEnabled] = useState(false);
  const visualRef = useRef<HTMLElement>(null);
  const stepRef = useRef(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setStep(STEP_COUNT - 1);
      setSelectedFestival(true);
      setSelectedArtists(flow.lineup.artists.length);
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    function scheduleNext() {
      const duration = STEP_MS[stepRef.current] ?? STEP_MS[0];
      timer = window.setTimeout(() => {
        if (cancelled) return;
        stepRef.current = (stepRef.current + 1) % STEP_COUNT;
        setStep(stepRef.current);
        scheduleNext();
      }, duration);
    }

    scheduleNext();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [flow.lineup.artists.length]);

  useEffect(() => {
    if (step !== 0) {
      setSelectedFestival(false);
      return;
    }

    setSelectedFestival(false);
    const timer = window.setTimeout(() => setSelectedFestival(true), 700);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== 1) {
      setSelectedArtists(0);
      return;
    }

    setSelectedArtists(0);
    const timers = [
      window.setTimeout(() => setSelectedArtists(1), 500),
      window.setTimeout(() => setSelectedArtists(2), 1000),
      window.setTimeout(() => setSelectedArtists(3), 1500),
    ];

    return () => timers.forEach(window.clearTimeout);
  }, [step]);

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

  const eventDays = new Set(flow.calendar.events.map((event) => event.day));
  const stepLabel = flow.steps[step]?.label ?? '';

  return (
    <figure
      ref={visualRef}
      className={`ai-hero__visual${pointerTiltEnabled ? ' ai-hero__visual--tilt' : ''}`}
      onPointerMove={pointerTiltEnabled ? handlePointerMove : undefined}
      onPointerLeave={pointerTiltEnabled ? handlePointerLeave : undefined}
    >
      <figcaption className="visually-hidden">{flow.ariaLabel}</figcaption>
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

            <header className="ai-preview__app-nav" aria-hidden="true">
              <span className="ai-preview__app-nav-back">
                <ChevronLeft size={14} strokeWidth={2.25} />
              </span>
              <span className="ai-preview__app-nav-title">{stepLabel}</span>
              <span className="ai-preview__app-nav-mark">
                <Sparkles size={12} strokeWidth={2.25} />
              </span>
            </header>

            <div className="ai-preview__body hero-flow">
              <div className="hero-flow__screens" aria-hidden="true">
                <div className={`hero-flow__screen${step === 0 ? ' is-active' : ''}`}>
                  <div className="hero-flow__screen-head">
                    <Compass size={13} strokeWidth={2.25} />
                    <span>{flow.discovery.title}</span>
                  </div>
                  <div className="hero-flow__festivals">
                    {flow.discovery.festivals.map((festival) => {
                      const isSelected =
                        festival.featured && (selectedFestival || step !== 0);
                      return (
                        <article
                          className={`hero-flow__festival${isSelected ? ' is-selected' : ''}${festival.featured ? ' is-featured' : ''
                            }`}
                          key={festival.name}
                        >
                          <div className="hero-flow__festival-copy">
                            <span className="hero-flow__festival-tag">{festival.tag}</span>
                            <h3>{festival.name}</h3>
                            <p>
                              {festival.date} · {festival.location}
                            </p>
                          </div>
                          {isSelected ? <span className="hero-flow__festival-check" /> : null}
                        </article>
                      );
                    })}
                  </div>
                </div>

                <div className={`hero-flow__screen${step === 1 ? ' is-active' : ''}`}>
                  <div className="hero-flow__screen-head">
                    <span>{flow.lineup.title}</span>
                    <span className="hero-flow__screen-meta">{flow.lineup.stage}</span>
                  </div>
                  <div className="hero-flow__artists">
                    {flow.lineup.artists.map((artist, index) => {
                      const selected = index < selectedArtists;
                      return (
                        <div
                          className={`hero-flow__artist${selected ? ' is-selected' : ''}`}
                          key={artist.name}
                          style={{ '--artist-accent': artist.accent } as CSSProperties}
                        >
                          <span className="hero-flow__artist-bar" />
                          <div className="hero-flow__artist-copy">
                            <span className="hero-flow__artist-name">{artist.name}</span>
                            <span className="hero-flow__artist-time">{artist.time}</span>
                          </div>
                          {selected ? <span className="hero-flow__artist-mark" /> : null}
                        </div>
                      );
                    })}
                  </div>
                  <p className="hero-flow__selection-count">
                    {locale === 'zh'
                      ? `已选 ${selectedArtists} 位 DJ`
                      : `${selectedArtists} DJs selected`}
                  </p>
                </div>

                <div className={`hero-flow__screen hero-flow__screen--center${step === 2 ? ' is-active' : ''}`}>
                  <div className="hero-flow__generate">
                    <div className="hero-flow__generate-visual">
                      <span className="hero-flow__generate-ring" />
                      <span className="hero-flow__generate-icon">
                        <Sparkles size={22} strokeWidth={2} />
                      </span>
                    </div>
                    <p className="hero-flow__generate-status">{flow.generate.status}</p>
                    <p className="hero-flow__generate-detail">{flow.generate.detail}</p>
                  </div>
                </div>

                <div className={`hero-flow__screen${step === 3 ? ' is-active' : ''}`}>
                  <div className="hero-flow__plan">
                    <header className="hero-flow__plan-header">
                      <span className="hero-flow__plan-badge">{flow.plan.badge}</span>
                      <h3>{flow.plan.title}</h3>
                      <p>{flow.plan.meta}</p>
                    </header>
                    <ul className="hero-flow__plan-rows">
                      {flow.plan.rows.map((row) => (
                        <li
                          className={`hero-flow__plan-row${row.highlight ? ' is-highlight' : ''}`}
                          key={row.label}
                        >
                          <span className="hero-flow__plan-icon">{row.icon}</span>
                          <span className="hero-flow__plan-label">{row.label}</span>
                          <span className="hero-flow__plan-value">{row.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className={`hero-flow__screen${step === 4 ? ' is-active' : ''}`}>
                  <div className="hero-flow__calendar">
                    <header className="hero-flow__calendar-head">
                      <CalendarDays size={13} strokeWidth={2.25} />
                      <span>{flow.calendar.month}</span>
                    </header>
                    <div className="hero-flow__calendar-grid">
                      {flow.calendar.weekdays.map((weekday, index) => (
                        <span className="hero-flow__calendar-weekday" key={`weekday-${index}`}>
                          {weekday}
                        </span>
                      ))}
                      {CALENDAR_CELLS.map((day, index) => {
                        const hasEvent = day !== null && eventDays.has(day);
                        const isTripDay = day !== null && day >= 12 && day <= 14;
                        return (
                          <span
                            className={[
                              'hero-flow__calendar-day',
                              day === null ? 'is-empty' : '',
                              hasEvent ? 'has-event' : '',
                              isTripDay ? 'is-trip' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            key={`${day ?? 'empty'}-${index}`}
                          >
                            {day ?? ''}
                          </span>
                        );
                      })}
                    </div>
                    <ul className="hero-flow__calendar-agenda">
                      {flow.calendar.agenda.map((item) => (
                        <li className="hero-flow__calendar-event" key={`${item.title}-${item.time}`}>
                          <span className="hero-flow__calendar-event-time">{item.time}</span>
                          <div>
                            <strong>{item.title}</strong>
                            <span>{item.meta}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="hero-flow__progress" aria-hidden="true">
                {flow.steps.map((item, index) => (
                  <span
                    className={[
                      'hero-flow__progress-dot',
                      index === step ? 'is-current' : '',
                      index < step ? 'is-complete' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={item.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
