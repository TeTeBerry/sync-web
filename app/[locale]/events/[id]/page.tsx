import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventCard } from '../../../../components/EventCard';
import { RecruitCard } from '../../../../components/RecruitCard';
import { TrackedLink } from '../../../../components/TrackedLink';
import {
  fetchActivitySchedule,
  getActivity,
  getActivityImage,
  getActivityTitle,
  listActivities,
  listRecruitPosts,
} from '../../../../lib/api';
import { activityMeta } from '../../../../lib/format';
import type { ScheduleDj } from '../../../../lib/api';
import type { Activity } from '../../../../lib/types';
import { getSiteUrl } from '../../../../lib/site';
import {
  activityMetaForLocale,
  alternateLanguages,
  getActivityTypeLabel,
  getMessages,
  getRegionLabel,
  isLocale,
  localizeActivities,
  localizeActivity,
  localizeRecruitPosts,
  localizedPath,
  type Locale,
} from '../../../../lib/i18n';

type EventDetailProps = {
  params: Promise<{ locale: string; id: string }>;
};

export const dynamic = 'force-dynamic';

const siteUrl = getSiteUrl();

function absoluteUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, siteUrl).toString();
  } catch {
    return undefined;
  }
}

function eventUrl(locale: Locale, legacyId: number): string {
  return `${siteUrl}${localizedPath(locale, `/events/${legacyId}`)}`;
}

export async function generateMetadata({ params }: EventDetailProps): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : 'zh';
  const t = getMessages(locale);
  const activity = await getActivity(Number(id));
  if (!activity) return {};
  const localizedActivity = localizeActivity(activity, locale);
  const title = getActivityTitle(localizedActivity);
  const description =
    localizedActivity.description ||
    `${activityMetaForLocale(localizedActivity, locale)} · ${t.eventDetail.fallbackDescription}`;
  const url = eventUrl(locale, activity.legacyId);
  const image = absoluteUrl(getActivityImage(localizedActivity));
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: alternateLanguages(`/events/${activity.legacyId}`),
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      images: image ? [{ url: image, alt: title }] : undefined,
    },
  };
}

const GENRE_BROAD: Record<string, string> = {
  House: 'House',
  house: 'House',
  'Chicago house': 'House',
  'Deep House': 'House',
  'deep house': 'House',
  'Progressive House': 'House',
  'Progressive house': 'House',
  'Tech House': 'House',
  'tech house': 'House',
  'Euro House': 'House',
  'Tropical House': 'House',
  'piano house': 'House',
  'Big Room': 'House',
  'Hard House': 'House',
  Electro: 'House',
  Euro: 'House',
  Disco: 'House',
  Techno: 'Techno',
  'Dub Techno': 'Techno',
  'Minimal Techno': 'Techno',
  'Melodic and cinematic techno': 'Techno',
  Minimal: 'Techno',
  Industrial: 'Techno',
  'Hard Techno': 'Hard',
  'Hard techno': 'Hard',
  Hardstyle: 'Hardstyle',
  hardstyle: 'Hardstyle',
  'Dutch hardstyle': 'Hardstyle',
  rawstyle: 'Hardstyle',
  Hardcore: 'Hardcore',
  'Hardcore box set': 'Hardcore',
  'early hardcore': 'Hardcore',
  'Happy Hardcore': 'Hardcore',
  frenchcore: 'Hardcore',
  Frenchcore: 'Hardcore',
  Gabber: 'Hardcore',
  'Industrial Techno & Hardcore': 'Hardcore',
  Hard: 'Hard',
  Trance: 'Trance',
  'Progressive Trance': 'Trance',
  Psytrance: 'Trance',
  psytrance: 'Trance',
  'Psy-Trance': 'Trance',
  'Tech Trance': 'Trance',
  'Hard Trance': 'Trance',
  'uplifting electronic': 'Trance',
  'Drum n Bass': 'Drum & Bass',
  'Drum & Bass': 'Drum & Bass',
  'DnB mixes': 'Drum & Bass',
  Dubstep: 'Dubstep',
  dubstep: 'Dubstep',
  'Dubstep producer': 'Dubstep',
  Bass: 'Bass',
  'Future Bass': 'Bass',
  'UK Bass': 'Bass',
  'including bass and trap': 'Bass',
  'EDM base with Trap': 'Bass',
  'EDM blended with Cantopop': 'Bass',
  Trap: 'Bass',
  riddim: 'Bass',
  Ambient: 'Ambient',
  ambient: 'Ambient',
  'Dark Ambient': 'Ambient',
  'dark ambient': 'Ambient',
  Breakbeat: 'Breaks',
  'UK Garage': 'UK Garage',
  Acid: 'Acid',
  'Acid Jazz': 'Acid',
  'hip hop': 'Hip Hop',
  'hip-hop': 'Hip Hop',
  Reggae: 'Reggae',
  'Reggae Artist': 'Reggae',
  latin: 'Latin',
  merengue: 'Latin',
};

const GENRE_BROAD_COLORS: Record<string, string> = {
  House: '#4cc9f0',
  Techno: '#a855f7',
  Hard: '#ff0066',
  Hardstyle: '#f97316',
  Hardcore: '#dc2626',
  Trance: '#22c55e',
  'Drum & Bass': '#eab308',
  Dubstep: '#8b5cf6',
  Bass: '#f59e0b',
  Ambient: '#06b6d4',
  Breaks: '#84cc16',
  'UK Garage': '#ec4899',
  Acid: '#14b8a6',
  'Hip Hop': '#6366f1',
  Reggae: '#fbbf24',
  Latin: '#ef4444',
};

const NAME_GENRE_HINTS: Array<{ pattern: RegExp; broad: string }> = [
  { pattern: /\bhardstyle\b/i, broad: 'Hardstyle' },
  { pattern: /\bhardcore\b/i, broad: 'Hardcore' },
  { pattern: /\btechno\b/i, broad: 'Techno' },
  { pattern: /\btrance\b/i, broad: 'Trance' },
  { pattern: /\bhouse\b/i, broad: 'House' },
  { pattern: /\bdubstep\b/i, broad: 'Dubstep' },
  { pattern: /\b(drum\s*(n|&)\s*bass|dnb)\b/i, broad: 'Drum & Bass' },
  { pattern: /\bbass\b/i, broad: 'Bass' },
];

function genreBroadKey(dj: ScheduleDj): string {
  const primary = dj.genre?.trim();
  if (primary && GENRE_BROAD[primary]) return GENRE_BROAD[primary];
  if (primary && GENRE_BROAD[primary.toLowerCase()]) return GENRE_BROAD[primary.toLowerCase()];
  const first = dj.genreLabel?.split('·')[0]?.trim();
  if (first && GENRE_BROAD[first]) return GENRE_BROAD[first];
  if (first && GENRE_BROAD[first.toLowerCase()]) return GENRE_BROAD[first.toLowerCase()];
  // genre is unknown/missing — try to infer from artist name
  const name = dj.name;
  for (const hint of NAME_GENRE_HINTS) {
    if (hint.pattern.test(name)) return hint.broad;
  }
  return '其他';
}

/** Normalize diacritics: HALŌ → HALO, ÉTÉ → ETE, etc. */
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

function groupByBroadGenre(
  djs: ScheduleDj[],
): Map<string, { color: string; djs: ScheduleDj[] }> {
  const seen = new Set<string>();
  const groups = new Map<string, { color: string; djs: ScheduleDj[] }>();
  for (const dj of djs) {
    const key = normalizeName(dj.name);
    if (seen.has(key)) continue;
    seen.add(key);

    const broad = genreBroadKey(dj);
    const entry = groups.get(broad);
    if (entry) {
      entry.djs.push(dj);
    } else {
      groups.set(broad, {
        color: GENRE_BROAD_COLORS[broad] || dj.genreColor || 'var(--primary)',
        djs: [dj],
      });
    }
  }
  return groups;
}

function toIsoDate(value?: string, title?: string): string | undefined {
  if (!value) return undefined;
  const explicitDate = value.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (explicitDate) {
    const [, year, month, day] = explicitDate;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
  }

  const titleYear = title?.match(/\b(20\d{2})\b/)?.[1];
  const monthDay = value.match(/\b(\d{1,2})[./-](\d{1,2})\b/);
  if (titleYear && monthDay) {
    const [, month, day] = monthDay;
    return new Date(Date.UTC(Number(titleYear), Number(month) - 1, Number(day))).toISOString();
  }

  const date = new Date(value);
  return /^\d{4}/.test(value) && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
}

function buildEventJsonLd(activity: Activity, djs: ScheduleDj[], locale: Locale) {
  const localizedActivity = localizeActivity(activity, locale);
  const title = getActivityTitle(localizedActivity);
  const image = absoluteUrl(getActivityImage(localizedActivity));
  const performers = djs.slice(0, 24).map((dj) => ({
    '@type': 'MusicGroup',
    name: dj.name,
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: title,
    description: localizedActivity.description || activityMetaForLocale(localizedActivity, locale),
    url: eventUrl(locale, localizedActivity.legacyId),
    image: image ? [image] : undefined,
    startDate: toIsoDate(activity.date, title),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: localizedActivity.location || localizedActivity.city
      ? {
          '@type': 'Place',
          name: localizedActivity.location || localizedActivity.city,
          address: localizedActivity.location || localizedActivity.city,
        }
      : undefined,
    performer: performers.length ? performers : undefined,
    offers: localizedActivity.externalUrl
      ? {
          '@type': 'Offer',
          url: localizedActivity.externalUrl,
          availability: 'https://schema.org/InStock',
        }
      : undefined,
  };
}

export default async function EventDetailPage({ params }: EventDetailProps) {
  const { locale: rawLocale, id } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const rawActivity = await getActivity(Number(id));
  if (!rawActivity) notFound();
  const activity = localizeActivity(rawActivity, locale);

  const [rawPosts, rawAllActivities, schedule] = await Promise.all([
    listRecruitPosts(activity.legacyId),
    listActivities(),
    fetchActivitySchedule(activity.legacyId),
  ]);
  const posts = localizeRecruitPosts(rawPosts, locale);
  const allActivities = localizeActivities(rawAllActivities, locale);
  const image = getActivityImage(activity);
  const related = allActivities.filter((item) => item.legacyId !== activity.legacyId).slice(0, 3);

  const djs = schedule?.djs ?? [];
  const genreGroups = groupByBroadGenre(djs);
  const genreKeys = [...genreGroups.keys()];
  const subscribeEventProperties = {
    event: String(activity.legacyId),
    sourcePath: localizedPath(locale, `/events/${activity.legacyId}`),
    locale,
  };
  const jsonLd = buildEventJsonLd(activity, djs, locale);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <section className="detail-hero">
        <div className="container">
          <div
            className="detail-hero__media"
            style={image ? ({ '--detail-image': `url("${image}")` } as CSSProperties) : undefined}
          >
            <div>
              <div className="eyebrow">{t.eventDetail.eyebrow}</div>
              <h1>{getActivityTitle(activity)}</h1>
              <p className="lead">{activityMetaForLocale(activity)}</p>
              <div className="detail-actions" style={{ marginTop: 16 }}>
                <TrackedLink
                  className="button"
                  href={`${localizedPath(locale, '/waitlist')}?event=${activity.legacyId}`}
                  eventName="event_subscribe_click"
                  eventProperties={subscribeEventProperties}
                >
                  {t.eventDetail.subscribe}
                </TrackedLink>
                <a className="button secondary" href="#crew">
                  {t.eventDetail.crewCta}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container detail-layout">
          <div className="detail-stack">
            <article className="detail-panel">
              <div className="eyebrow">{t.eventDetail.aboutEyebrow}</div>
              <h2>{t.eventDetail.aboutTitle}</h2>
              <p className="lead">{activity.description || ''}</p>
              <div className="detail-meta">
                <div className="detail-meta__row">
                  <span className="detail-meta__label">{t.eventDetail.type}</span>
                  <span className="pill pill--secondary">
                    {activity.activityType
                      ? getActivityTypeLabel(locale, activity.activityType)
                      : getActivityTypeLabel(locale, 'festival')}
                  </span>
                </div>
                <div className="detail-meta__row">
                  <span className="detail-meta__label">{t.eventDetail.region}</span>
                  <span className="pill pill--accent">
                    {activity.region ? getRegionLabel(locale, activity.region) : '—'}
                  </span>
                </div>
                {activity.attendees != null && (
                  <div className="detail-meta__row">
                    <span className="detail-meta__label">{t.eventDetail.attendees}</span>
                    <span className="detail-meta__value">{activity.attendees}</span>
                  </div>
                )}
                {activity.recruitPostCount != null && activity.recruitPostCount > 0 && (
                  <div className="detail-meta__row">
                    <span className="detail-meta__label">{t.eventDetail.recruitPosts}</span>
                    <span className="detail-meta__value">
                      {activity.recruitPostCount} {t.eventDetail.recruitPostsUnit}
                    </span>
                  </div>
                )}
                {activity.externalUrl && (
                  <div className="detail-meta__row">
                    <span className="detail-meta__label">{t.eventDetail.externalUrl}</span>
                    <a
                      className="detail-meta__link"
                      href={activity.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {activity.externalUrl}
                    </a>
                  </div>
                )}
                {activity.infoSource && (
                  <div className="detail-meta__row">
                    <span className="detail-meta__label">{t.eventDetail.infoSource}</span>
                    <span className="detail-meta__value">{activity.infoSource}</span>
                  </div>
                )}
              </div>
            </article>

            <article className="detail-panel">
              <div className="eyebrow">{t.eventDetail.lineupEyebrow}</div>
              <h2>{t.eventDetail.lineupTitle}</h2>
              {djs.length > 0 ? (
                <div className="lineup-genre-groups">
                  {genreKeys.map((genreLabel) => {
                    const { color, djs: groupDjs } = genreGroups.get(genreLabel)!;
                    return (
                      <div className="lineup-section" key={genreLabel}>
                        <h3 className="lineup-section__title">
                          <span
                            className="lineup-section__accent"
                            style={{ background: color }}
                          />
                          {genreLabel}
                        </h3>
                        <div className="lineup-genre-grid">
                          {groupDjs.map((dj) => (
                            <div className="artist-name-card" key={dj.id}>
                              <span
                                className="artist-name-card__dot"
                                style={{ background: color }}
                              />
                              <span className="artist-name-card__name">{dj.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="section__note">{t.eventDetail.lineupEmpty}</p>
              )}
            </article>

            <article className="detail-panel" id="crew">
              <div className="eyebrow">{t.eventDetail.crewEyebrow}</div>
              <h2>{t.eventDetail.crewTitle}</h2>
              <div className="recruit-list">
                {posts.length ? (
                  posts.map((post) => <RecruitCard post={post} locale={locale} key={post.id} />)
                ) : (
                  <p className="section__note">{t.eventDetail.crewEmpty}</p>
                )}
              </div>
            </article>
          </div>

          <aside className="detail-panel">
            <div className="eyebrow">{t.eventDetail.signalEyebrow}</div>
            <h2>{t.eventDetail.signalTitle}</h2>
            <p className="section__note">
              {t.eventDetail.signalCopy}
            </p>
            <div className="section__actions" style={{ marginTop: 8 }}>
              <TrackedLink
                className="button"
                href={`${localizedPath(locale, '/waitlist')}?event=${activity.legacyId}`}
                eventName="event_subscribe_click"
                eventProperties={subscribeEventProperties}
              >
                {t.eventDetail.join}
              </TrackedLink>
            </div>
          </aside>
        </div>
      </section>

      {related.length ? (
        <section className="section">
          <div className="container">
            <div className="section__header">
              <div>
                <div className="eyebrow">{t.eventDetail.moreEyebrow}</div>
                <h2>{t.eventDetail.moreTitle}</h2>
              </div>
            </div>
            <div className="event-grid">
              {related.map((item) => (
                <EventCard activity={item} locale={locale} key={item.legacyId} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
