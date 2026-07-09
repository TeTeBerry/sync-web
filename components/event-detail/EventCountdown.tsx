'use client';

import { useEffect, useState } from 'react';
import { CATALOG_TIMEZONE } from '../../lib/activity-date';
import {
  computeEventCountdown,
  padCountdownUnit,
  type EventCountdownSnapshot,
} from '../../lib/event-countdown';

export type EventCountdownLabels = {
  happeningIn: string;
  happeningNow: string;
  eventEnded: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  planEarly: string;
  localTime: string;
};

type EventCountdownProps = {
  eventStartDate?: string | null;
  eventEndDate?: string | null;
  timezone?: string;
  location?: string;
  displayDate?: string;
  labels: EventCountdownLabels;
  /** SSR snapshot — keeps the first client render aligned with server HTML. */
  initialSnapshot: EventCountdownSnapshot | null;
};

type CountdownUnitProps = {
  value: number;
  label: string;
  pad?: boolean;
  animate?: boolean;
};

function CountdownUnit({ value, label, pad = true, animate = true }: CountdownUnitProps) {
  const display = pad ? padCountdownUnit(value) : String(value);

  return (
    <span className="event-countdown__unit">
      <span
        className="event-countdown__number"
        data-animate={animate ? 'true' : undefined}
        key={display}
      >
        {display}
      </span>
      <span className="event-countdown__unit-label">{label}</span>
    </span>
  );
}

function CountdownStatus({
  snapshot,
  labels,
}: {
  snapshot: EventCountdownSnapshot;
  labels: EventCountdownLabels;
}) {
  if (snapshot.phase === 'live') {
    return (
      <p className="event-countdown__status event-countdown__status--live">{labels.happeningNow}</p>
    );
  }

  if (snapshot.phase === 'ended') {
    return (
      <p className="event-countdown__status event-countdown__status--ended">{labels.eventEnded}</p>
    );
  }

  if (!snapshot.units) return null;

  const { days, hours, minutes, seconds } = snapshot.units;

  return (
    <div className="event-countdown__ticker" role="timer">
      <CountdownUnit value={days} label={labels.days} pad={false} />
      <CountdownUnit value={hours} label={labels.hours} />
      <CountdownUnit value={minutes} label={labels.minutes} />
      <CountdownUnit value={seconds} label={labels.seconds} />
    </div>
  );
}

export function EventCountdown({
  eventStartDate,
  eventEndDate,
  timezone = CATALOG_TIMEZONE,
  location,
  displayDate,
  labels,
  initialSnapshot,
}: EventCountdownProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  useEffect(() => {
    if (!eventStartDate) return;

    const tick = () => {
      setSnapshot(computeEventCountdown(eventStartDate, eventEndDate, Date.now(), timezone));
    };

    tick();
    const intervalMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 60_000
      : 1_000;
    const id = window.setInterval(tick, intervalMs);

    const frame = window.requestAnimationFrame(() => setAnimate(true));

    return () => {
      window.clearInterval(id);
      window.cancelAnimationFrame(frame);
    };
  }, [eventEndDate, eventStartDate, timezone]);

  if (!snapshot) return null;

  const showPlanHint = snapshot.phase === 'upcoming';

  const ariaLabel =
    snapshot.phase === 'upcoming'
      ? labels.happeningIn
      : snapshot.phase === 'live'
        ? labels.happeningNow
        : labels.eventEnded;

  return (
    <aside
      className={`event-countdown surface-panel${animate ? ' event-countdown--ready' : ''}`}
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <div className="event-countdown__primary">
        {snapshot.phase === 'upcoming' ? (
          <span className="event-countdown__label">{labels.happeningIn}</span>
        ) : null}
        <CountdownStatus snapshot={snapshot} labels={labels} />
      </div>

      <div className="event-countdown__context">
        {displayDate ? <p className="event-countdown__date">{displayDate}</p> : null}
        {location ? <p className="event-countdown__location">{location}</p> : null}
        <p className="event-countdown__local-time">{labels.localTime}</p>
        {showPlanHint ? <p className="event-countdown__hint">{labels.planEarly}</p> : null}
      </div>
    </aside>
  );
}
