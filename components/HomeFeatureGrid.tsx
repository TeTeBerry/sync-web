import {
  ArrowRight,
  CalendarRange,
  Luggage,
  MapPin,
  Music2,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';

type FeatureItem = {
  id: 'timeline' | 'budget' | 'packing' | 'tips' | 'calendar';
  title: string;
};

type HomeFeatureGridProps = {
  features: readonly FeatureItem[];
};

const featureIcons: Record<FeatureItem['id'], LucideIcon> = {
  timeline: Music2,
  budget: Wallet,
  packing: Luggage,
  tips: MapPin,
  calendar: CalendarRange,
};

export function HomeFeatureGrid({ features }: HomeFeatureGridProps) {
  return (
    <ul className="feature-deliverables" data-reveal-stagger>
      {features.map((feature, index) => {
        const Icon = featureIcons[feature.id];
        return (
          <li
            className={`feature-deliverables__item${index === 0 ? ' feature-deliverables__item--lead' : ''}`}
            key={feature.id}
            style={{ '--card-index': index } as CSSProperties}
          >
            <span className="feature-deliverables__icon" aria-hidden>
              <Icon size={17} strokeWidth={1.75} />
            </span>
            <span className="feature-deliverables__title">{feature.title}</span>
            <ArrowRight className="feature-deliverables__arrow" size={14} strokeWidth={2} aria-hidden />
          </li>
        );
      })}
    </ul>
  );
}
