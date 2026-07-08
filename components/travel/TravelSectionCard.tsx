import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TravelInsightCard } from './TravelInsightCard';

type TravelSectionCardProps = {
  id: string;
  title: string;
  icon: LucideIcon;
  insight: string;
  insightBadge: string;
  officialLabel: string;
  unofficialLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  seoLink?: { href: string; label: string; comingSoon?: boolean };
};

export function TravelSectionCard({
  id,
  title,
  icon: Icon,
  insight,
  insightBadge,
  officialLabel,
  unofficialLabel,
  children,
  footer,
  seoLink,
}: TravelSectionCardProps) {
  return (
    <section className="travel-section" id={id} aria-labelledby={`${id}-title`}>
      <header className="travel-section__header">
        <div className="travel-section__title-row">
          <span className="travel-section__icon" aria-hidden="true">
            <Icon size={18} strokeWidth={2} />
          </span>
          <h3 id={`${id}-title`} className="travel-section__title">
            {title}
          </h3>
        </div>
        {seoLink ? (
          <span
            className={`travel-section__seo-link${seoLink.comingSoon ? ' travel-section__seo-link--soon' : ''}`}
            title={seoLink.comingSoon ? 'Coming soon' : undefined}
          >
            {seoLink.label}
          </span>
        ) : null}
      </header>

      <TravelInsightCard summary={insight} badge={insightBadge} />

      <div className="travel-section__body">{children}</div>

      <div className="travel-section__legend">
        <span className="travel-legend travel-legend--official">{officialLabel}</span>
        <span className="travel-legend travel-legend--raven">{unofficialLabel}</span>
      </div>

      {footer ? <footer className="travel-section__footer">{footer}</footer> : null}
    </section>
  );
}
