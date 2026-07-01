import Link from 'next/link';
import type { CSSProperties } from 'react';
import { activityMeta } from '../lib/format';
import { getActivityImage, getActivityTitle } from '../lib/api';
import type { Activity } from '../lib/types';
import {
  getActivityTypeLabel,
  getMessages,
  getRegionLabel,
  localizeActivity,
  localizedPath,
  type Locale,
} from '../lib/i18n';

export function EventCard({ activity, locale }: { activity: Activity; locale: Locale }) {
  const t = getMessages(locale);
  const localizedActivity = localizeActivity(activity, locale);
  const image = getActivityImage(localizedActivity);
  const meta = activityMeta(localizedActivity);
  const [datePart] = meta.split(' · ');

  return (
    <Link className="event-card" href={localizedPath(locale, `/events/${localizedActivity.legacyId}`)}>
      <div
        className="event-card__image"
        style={image ? ({ '--event-image': `url("${image}")` } as CSSProperties) : undefined}
      >
        {datePart && <span className="event-card__date">{datePart}</span>}
      </div>
      <div className="event-card__body">
        <div className="event-card__tags">
          {activity.hot && <span className="pill pill--primary">{t.eventCard.hot}</span>}
          {activity.activityType && (
            <span className="pill pill--secondary">
              {getActivityTypeLabel(locale, activity.activityType)}
            </span>
          )}
          {activity.region && (
            <span className="pill pill--accent">
              {getRegionLabel(locale, activity.region)}
            </span>
          )}
        </div>
        <h3>{getActivityTitle(localizedActivity)}</h3>
        <p className="event-card__location">
          {localizedActivity.location ?? localizedActivity.area ?? t.eventCard.locationFallback}
        </p>
        <div className="event-card__footer">
          <span>{localizedActivity.city ?? localizedActivity.area ?? t.eventCard.cityFallback}</span>
          <span className="event-card__action">{t.eventCard.action}</span>
        </div>
      </div>
    </Link>
  );
}
