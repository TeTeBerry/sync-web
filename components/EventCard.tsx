import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { activityMeta } from '../lib/format';
import { getActivityImage, getActivityTitle } from '../lib/api';
import { eventPath } from '../lib/event-slug';
import type { Activity } from '../lib/types';
import {
  getActivityTypeLabel,
  getContinentLabel,
  getMessages,
  localizeActivity,
  type Locale,
} from '../lib/i18n';
import { getActivityContinent } from '../lib/activity-continent';
import { getFestivalAtmosphere } from '../lib/festival-atmosphere';
import { EventImage } from './EventImage';

type EventCardProps = {
  activity: Activity;
  locale: Locale;
  featured?: boolean;
  variant?: 'standard' | 'poster' | 'list';
  priorityImage?: boolean;
  style?: CSSProperties;
};

function lineupCount(activity: Activity): number {
  return activity.artists?.length ?? activity.lineup?.length ?? 0;
}

export function EventCard({
  activity,
  locale,
  featured = false,
  variant = 'standard',
  priorityImage = false,
  style,
}: EventCardProps) {
  const t = getMessages(locale);
  const localizedActivity = localizeActivity(activity, locale);
  const image = getActivityImage(localizedActivity);
  const title = getActivityTitle(localizedActivity);
  const meta = activityMeta(localizedActivity);
  const [datePart] = meta.split(' · ');
  const artists = lineupCount(activity);
  const continent = getActivityContinent(localizedActivity);
  const continentLabel = getContinentLabel(locale, continent);
  const isComparison = variant === 'list';
  const imageSizes =
    variant === 'poster'
      ? '(max-width: 760px) 80vw, 326px'
      : variant === 'list'
        ? '(max-width: 760px) 100vw, 28vw'
        : featured
          ? '(max-width: 760px) 100vw, 66vw'
          : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';

  return (
    <Link
      className={`event-card event-card--${variant}${featured ? ' event-card--featured' : ''}`}
      href={eventPath(locale, localizedActivity)}
      style={style}
      data-atmosphere={getFestivalAtmosphere(localizedActivity)}
    >
      <div className="event-card__spotlight" aria-hidden />
      <div className="event-card__image">
        {image ? (
          <EventImage
            src={image}
            alt={title}
            className="event-card__photo"
            priority={priorityImage}
            sizes={imageSizes}
          />
        ) : null}
        {datePart ? <span className="event-card__date">{datePart}</span> : null}
        {artists > 0 ? (
          <span className="event-card__lineup-count">
            {artists} {t.eventCard.artists}
          </span>
        ) : null}
      </div>
      <div className="event-card__body">
        {!isComparison ? (
          <div className="event-card__tags">
            {activity.hot ? <span className="pill pill--primary">{t.eventCard.hot}</span> : null}
            {activity.activityType ? (
              <span className="pill pill--secondary">
                {getActivityTypeLabel(locale, activity.activityType)}
              </span>
            ) : null}
            {continentLabel ? (
              <span className="pill pill--accent">{continentLabel}</span>
            ) : null}
          </div>
        ) : null}
        <h3>{title}</h3>
        <p className="event-card__location">
          {localizedActivity.location ?? localizedActivity.area ?? t.eventCard.locationFallback}
        </p>
        <div className="event-card__footer">
          <span className="event-card__city">
            {localizedActivity.city ?? localizedActivity.area ?? t.eventCard.cityFallback}
          </span>
          <span className="event-card__action">
            {!isComparison ? <Sparkles size={13} strokeWidth={1.75} aria-hidden /> : null}
            {!isComparison ? t.eventCard.explore : null}
            <ArrowUpRight size={14} strokeWidth={2} aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
