import type { CSSProperties } from 'react';
import { EventCardSkeleton } from './EventCardSkeleton';

export function PopularEventsSkeleton() {
  return (
    <div className="event-showcase" aria-hidden="true">
      <EventCardSkeleton featured style={{ '--card-index': 0 } as CSSProperties} />
      <EventCardSkeleton delay={1} style={{ '--card-index': 1 } as CSSProperties} />
      <EventCardSkeleton delay={2} style={{ '--card-index': 2 } as CSSProperties} />
    </div>
  );
}
