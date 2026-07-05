'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Backpack,
  Calendar,
  Check,
  Clock,
  MapPin,
  Music2,
  Plane,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { TrackedLink } from './TrackedLink';
import { localizedPath, type Locale } from '../lib/i18n';

export type DashboardTabId = 'trip' | 'budget' | 'timeline' | 'packing' | 'calendar';

type DashboardTab = {
  id: DashboardTabId;
  label: string;
};

type DashboardContent = {
  badge: string;
  festival: string;
  meta: string;
  status: string;
  cta: string;
  tabs: readonly DashboardTab[];
  trip: {
    flight: { label: string; route: string; detail: string };
    hotel: { label: string; name: string; detail: string };
    shuttle: { label: string; route: string; detail: string };
    days: readonly { label: string; summary: string }[];
  };
  budget: {
    total: string;
    perPerson: string;
    items: readonly { label: string; amount: string; share: number }[];
  };
  timeline: {
    days: readonly {
      label: string;
      sets: readonly { time: string; artist: string; stage: string; highlight?: boolean }[];
    }[];
  };
  packing: {
    progress: string;
    progressLabel: string;
    groups: readonly { name: string; items: readonly string[] }[];
  };
  calendar: {
    synced: string;
    events: readonly { date: string; title: string; kind: string }[];
  };
};

type AiPlannerExperienceProps = {
  locale: Locale;
  dashboard: DashboardContent;
};

const tabIcons: Record<DashboardTabId, typeof MapPin> = {
  trip: MapPin,
  budget: Wallet,
  timeline: Clock,
  packing: Backpack,
  calendar: Calendar,
};

export function AiPlannerExperience({ locale, dashboard }: AiPlannerExperienceProps) {
  const [activeTab, setActiveTab] = useState<DashboardTabId>('trip');

  return (
    <div className="ai-planner">
      <div className="ai-planner__panel">
        <header className="ai-planner__topbar">
          <div className="ai-planner__topbar-copy">
            <span className="ai-planner__badge">
              <Sparkles size={12} strokeWidth={2.25} aria-hidden />
              {dashboard.badge}
            </span>
            <h3 className="ai-planner__festival">{dashboard.festival}</h3>
            <p className="ai-planner__meta">{dashboard.meta}</p>
          </div>
          <span className="ai-planner__status">{dashboard.status}</span>
        </header>

        <nav className="ai-planner__tabs" role="tablist" aria-label={dashboard.festival}>
          {dashboard.tabs.map((tab) => {
            const Icon = tabIcons[tab.id];
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`ai-planner-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`ai-planner-panel-${tab.id}`}
                className={`ai-planner__tab${selected ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={14} strokeWidth={2} aria-hidden />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div
          className="ai-planner__body"
          role="tabpanel"
          id={`ai-planner-panel-${activeTab}`}
          aria-labelledby={`ai-planner-tab-${activeTab}`}
        >
          {activeTab === 'trip' ? (
            <div className="ai-planner__trip">
              <div className="ai-planner__trip-cards">
                <article className="ai-planner__info-card">
                  <span className="ai-planner__info-icon" aria-hidden>
                    <Plane size={15} strokeWidth={2} />
                  </span>
                  <div>
                    <span className="ai-planner__info-label">{dashboard.trip.flight.label}</span>
                    <p className="ai-planner__info-value">{dashboard.trip.flight.route}</p>
                    <p className="ai-planner__info-detail">{dashboard.trip.flight.detail}</p>
                  </div>
                </article>
                <article className="ai-planner__info-card">
                  <span className="ai-planner__info-icon" aria-hidden>
                    <MapPin size={15} strokeWidth={2} />
                  </span>
                  <div>
                    <span className="ai-planner__info-label">{dashboard.trip.hotel.label}</span>
                    <p className="ai-planner__info-value">{dashboard.trip.hotel.name}</p>
                    <p className="ai-planner__info-detail">{dashboard.trip.hotel.detail}</p>
                  </div>
                </article>
                <article className="ai-planner__info-card">
                  <span className="ai-planner__info-icon" aria-hidden>
                    <Calendar size={15} strokeWidth={2} />
                  </span>
                  <div>
                    <span className="ai-planner__info-label">{dashboard.trip.shuttle.label}</span>
                    <p className="ai-planner__info-value">{dashboard.trip.shuttle.route}</p>
                    <p className="ai-planner__info-detail">{dashboard.trip.shuttle.detail}</p>
                  </div>
                </article>
              </div>
              <ol className="ai-planner__day-list">
                {dashboard.trip.days.map((day) => (
                  <li className="ai-planner__day-item" key={day.label}>
                    <span className="ai-planner__day-tag">{day.label}</span>
                    <p>{day.summary}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {activeTab === 'budget' ? (
            <div className="ai-planner__budget">
              <div className="ai-planner__budget-hero">
                <div>
                  <span className="ai-planner__budget-label">{dashboard.budget.perPerson}</span>
                  <p className="ai-planner__budget-total">{dashboard.budget.total}</p>
                </div>
                <span className="ai-planner__budget-icon" aria-hidden>
                  <Wallet size={18} strokeWidth={2} />
                </span>
              </div>
              <ul className="ai-planner__budget-list">
                {dashboard.budget.items.map((item) => (
                  <li className="ai-planner__budget-row" key={item.label}>
                    <div className="ai-planner__budget-row-head">
                      <span>{item.label}</span>
                      <span>{item.amount}</span>
                    </div>
                    <span className="ai-planner__budget-track" aria-hidden>
                      <span className="ai-planner__budget-fill" style={{ width: `${item.share}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {activeTab === 'timeline' ? (
            <div className="ai-planner__timeline">
              {dashboard.timeline.days.map((day) => (
                <section className="ai-planner__timeline-day" key={day.label}>
                  <h4 className="ai-planner__timeline-day-label">{day.label}</h4>
                  <ol className="ai-planner__timeline-sets">
                    {day.sets.map((set) => (
                      <li
                        className={`ai-planner__timeline-set${set.highlight ? ' is-highlight' : ''}`}
                        key={`${day.label}-${set.time}-${set.artist}`}
                      >
                        <span className="ai-planner__timeline-time">{set.time}</span>
                        <div className="ai-planner__timeline-set-copy">
                          <p className="ai-planner__timeline-artist">{set.artist}</p>
                          <p className="ai-planner__timeline-stage">{set.stage}</p>
                        </div>
                        <Music2 size={13} strokeWidth={2} aria-hidden />
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          ) : null}

          {activeTab === 'packing' ? (
            <div className="ai-planner__packing">
              <div className="ai-planner__packing-head">
                <p className="ai-planner__packing-progress">{dashboard.packing.progress}</p>
                <p className="ai-planner__packing-label">{dashboard.packing.progressLabel}</p>
              </div>
              <div className="ai-planner__packing-groups">
                {dashboard.packing.groups.map((group) => (
                  <section className="ai-planner__packing-group" key={group.name}>
                    <h4>{group.name}</h4>
                    <ul>
                      {group.items.map((item) => (
                        <li className="ai-planner__packing-item" key={item}>
                          <span className="ai-planner__packing-check" aria-hidden>
                            <Check size={11} strokeWidth={2.5} />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === 'calendar' ? (
            <div className="ai-planner__calendar">
              <div className="ai-planner__calendar-sync">
                <Calendar size={14} strokeWidth={2} aria-hidden />
                <span>{dashboard.calendar.synced}</span>
              </div>
              <ol className="ai-planner__calendar-list">
                {dashboard.calendar.events.map((event) => (
                  <li className="ai-planner__calendar-event" key={`${event.date}-${event.title}`}>
                    <span className="ai-planner__calendar-date">{event.date}</span>
                    <div>
                      <p className="ai-planner__calendar-title">{event.title}</p>
                      <p className="ai-planner__calendar-kind">{event.kind}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>

        <footer className="ai-planner__footer">
          <TrackedLink
            className="ai-planner__cta"
            href={localizedPath(locale, '/waitlist')}
            eventName="home_plan_click"
            eventProperties={{ locale, source: 'ai-planner-dashboard' }}
          >
            {dashboard.cta}
            <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
          </TrackedLink>
        </footer>
      </div>
    </div>
  );
}
