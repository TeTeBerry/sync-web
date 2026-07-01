import Link from 'next/link';
import type { CSSProperties } from 'react';
import { activityMeta } from '../lib/format';
import { getActivityImage, getActivityTitle } from '../lib/api';
import type { Activity } from '../lib/types';

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  festival: '户外电音节',
  indoor: '室内电音',
};

const REGION_LABELS: Record<string, string> = {
  domestic: '国内',
  overseas: '海外',
  hmt: '港澳台',
};

export function EventCard({ activity }: { activity: Activity }) {
  const image = getActivityImage(activity);
  const meta = activityMeta(activity);
  const [datePart] = meta.split(' · ');

  return (
    <Link className="event-card" href={`/events/${activity.legacyId}`}>
      <div
        className="event-card__image"
        style={image ? ({ '--event-image': `url("${image}")` } as CSSProperties) : undefined}
      >
        {datePart && <span className="event-card__date">{datePart}</span>}
      </div>
      <div className="event-card__body">
        <div className="event-card__tags">
          {activity.hot && <span className="pill pill--primary">热门</span>}
          {activity.activityType && (
            <span className="pill pill--secondary">
              {ACTIVITY_TYPE_LABELS[activity.activityType] ?? activity.activityType}
            </span>
          )}
          {activity.region && (
            <span className="pill pill--accent">
              {REGION_LABELS[activity.region] ?? activity.region}
            </span>
          )}
        </div>
        <h3>{getActivityTitle(activity)}</h3>
        <p className="event-card__location">{activity.location ?? activity.area ?? '地点待定'}</p>
        <div className="event-card__footer">
          <span>{activity.city ?? activity.area ?? '活动'}</span>
          <span className="event-card__action">查看详情</span>
        </div>
      </div>
    </Link>
  );
}
