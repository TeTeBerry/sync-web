import type { CSSProperties } from 'react';
import { Skeleton } from './Skeleton';

type EventCardSkeletonProps = {
  featured?: boolean;
  style?: CSSProperties;
  delay?: 0 | 1 | 2 | 3 | 4 | 5;
};

export function EventCardSkeleton({ featured = false, style, delay = 0 }: EventCardSkeletonProps) {
  return (
    <article
      className={`event-card-skeleton${featured ? ' event-card-skeleton--featured' : ''}`}
      style={style}
      aria-hidden="true"
    >
      <div className="event-card-skeleton__image">
        <Skeleton className="event-card-skeleton__shimmer" delay={delay} rounded="sm" />
      </div>
      <div className="event-card-skeleton__body">
        <div className="event-card-skeleton__tags">
          <Skeleton style={{ width: 52, height: 22 }} delay={delay} rounded="full" />
          <Skeleton style={{ width: 68, height: 22 }} delay={delay} rounded="full" />
        </div>
        <Skeleton style={{ width: '78%', height: 20 }} delay={delay} />
        <Skeleton style={{ width: '54%', height: 14 }} delay={delay} />
        <div className="event-card-skeleton__footer">
          <Skeleton style={{ width: 72, height: 14 }} delay={delay} />
          <Skeleton style={{ width: 88, height: 14 }} delay={delay} />
        </div>
      </div>
    </article>
  );
}
