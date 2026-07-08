import { ArrowRight } from 'lucide-react';
import { TrackedLink } from '../TrackedLink';

type TravelCTAProps = {
  href: string;
  label: string;
  eventName: string;
  eventProperties: Record<string, string>;
  variant?: 'primary' | 'secondary';
};

export function TravelCTA({
  href,
  label,
  eventName,
  eventProperties,
  variant = 'secondary',
}: TravelCTAProps) {
  return (
    <TrackedLink
      className={`travel-cta travel-cta--${variant}`}
      href={href}
      eventName={eventName}
      eventProperties={eventProperties}
    >
      <span>{label}</span>
      <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
    </TrackedLink>
  );
}
