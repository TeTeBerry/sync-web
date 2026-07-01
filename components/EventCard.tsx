import Link from 'next/link';
import type { CSSProperties } from 'react';
import { activityMeta } from '../lib/format';
import { getActivityImage, getActivityTitle } from '../lib/api';
import type { Activity } from '../lib/types';

export function EventCard({ activity }: { activity: Activity }) {
  const image = getActivityImage(activity);
  return (
    <Link className="event-card" href={`/events/${activity.legacyId}`}>
      <div
        className="event-card__image"
        style={image ? ({ '--event-image': `url("${image}")` } as CSSProperties) : undefined}
      />
      <div className="event-card__body">
        <div className="event-card__meta">{activityMeta(activity)}</div>
        <h3>{getActivityTitle(activity)}</h3>
        <div className="event-card__footer">
          <span>{activity.city ?? '活动'}</span>
          <span>查看详情</span>
        </div>
      </div>
    </Link>
  );
}
