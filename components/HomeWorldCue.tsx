import Link from 'next/link';
import { EventImage } from './EventImage';
import { activityMeta } from '../lib/format';
import { getActivityImage, getActivityTitle } from '../lib/api';
import { eventPath } from '../lib/event-slug';
import { getFestivalAtmosphere } from '../lib/festival-atmosphere';
import { localizeActivity, localizedPath, type Locale } from '../lib/i18n';
import type { Activity } from '../lib/types';

type HomeWorldCueProps = {
  locale: Locale;
  activity: Activity;
  eyebrow: string;
  exploreLabel: string;
};

export function HomeWorldCue({ locale, activity, eyebrow, exploreLabel }: HomeWorldCueProps) {
  const localized = localizeActivity(activity, locale);
  const image = getActivityImage(localized);
  const title = getActivityTitle(localized);
  const meta = activityMeta(localized);
  const atmosphere = getFestivalAtmosphere(localized);

  return (
    <aside className="world-cue" data-atmosphere={atmosphere}>
      <div className="world-cue__copy">
        <p className="world-cue__eyebrow">{eyebrow}</p>
        <Link className="world-cue__festival" href={eventPath(locale, localized)}>
          <span className="world-cue__name">{title}</span>
          <span className="world-cue__meta">{meta}</span>
        </Link>
        <Link className="world-cue__explore" href={localizedPath(locale, '/events')}>
          {exploreLabel}
        </Link>
      </div>

      {image ? (
        <Link
          className="world-cue__poster"
          href={eventPath(locale, localized)}
          aria-label={title}
        >
          <EventImage src={image} alt={title} className="world-cue__photo" sizes="(max-width: 860px) 40vw, 220px" />
        </Link>
      ) : null}
    </aside>
  );
}
