'use client';

import { useEffect, useState } from 'react';
import { Bell, Calendar, Sparkles, Users } from 'lucide-react';

type WaitlistAccessCardProps = {
  badge: string;
  status: string;
  perks: readonly [string, string, string];
};

const perkIcons = [Calendar, Bell, Users];

export function WaitlistAccessCard({ badge, status, perks }: WaitlistAccessCardProps) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setVisible(1), 400),
      window.setTimeout(() => setVisible(2), 800),
      window.setTimeout(() => setVisible(3), 1200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="waitlist-card" aria-hidden="true">
      <div className="waitlist-card__halo" />
      <div className="waitlist-card__frame">
        <header className="waitlist-card__header">
          <span className="waitlist-card__avatar">
            <Sparkles size={14} strokeWidth={2.25} />
          </span>
          <div className="waitlist-card__header-copy">
            <span className="waitlist-card__title">{badge}</span>
            <span className="waitlist-card__status">
              <span className="waitlist-card__pulse" />
              {status}
            </span>
          </div>
        </header>

        <ul className="waitlist-card__perks">
          {perks.map((perk, index) => {
            const Icon = perkIcons[index];
            return (
              <li
                className={`waitlist-card__perk${visible > index ? ' is-visible' : ''}`}
                key={perk}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <span className="waitlist-card__perk-icon">
                  <Icon size={14} strokeWidth={1.75} />
                </span>
                <span>{perk}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
