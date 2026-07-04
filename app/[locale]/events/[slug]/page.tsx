import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { notFound, permanentRedirect } from 'next/navigation';
import { Breadcrumbs } from '../../../../components/Breadcrumbs';
import { EventAiSummary } from '../../../../components/EventAiSummary';
import { EventCard } from '../../../../components/EventCard';
import { EventLoadError } from '../../../../components/states/EventLoadError';
import { EventUnavailableState } from '../../../../components/states/EventUnavailableState';
import { LineupEmptyState } from '../../../../components/states/LineupEmptyState';
import { LineupErrorState } from '../../../../components/states/LineupErrorState';
import { EmptyState } from '../../../../components/states/EmptyState';
import { RelatedEventsError } from '../../../../components/states/RelatedEventsError';
import { EventDetailActions } from '../../../../components/EventDetailActions';
import { TrackedLink } from '../../../../components/TrackedLink';
import { EventImage } from '../../../../components/EventImage';
import {
  fetchActivities,
  fetchActivitySchedule,
  getActivity,
  getActivityImage,
  getActivityTitle,
  type ScheduleDj,
} from '../../../../lib/api';
import { buildEventAiSummary } from '../../../../lib/event-ai-summary';
import { buildEventJsonLd, buildEventMetadata } from '../../../../lib/seo';
import { cityPath } from '../../../../lib/seo-cities';
import {
  eventPath,
  eventSlugMatches,
  parseEventLegacyId,
} from '../../../../lib/event-slug';
import { getSiteUrl } from '../../../../lib/site';
import {
  activityMetaForLocale,
  getActivityTypeLabel,
  getMessages,
  getRegionLabel,
  isLocale,
  localizeActivities,
  localizeActivity,
  localizedPath,
  type Locale,
} from '../../../../lib/i18n';

type EventDetailProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: EventDetailProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : 'zh';
  const legacyId = parseEventLegacyId(slug);
  if (!legacyId) return {};

  const activityResult = await getActivity(legacyId);
  if (!activityResult.activity) return {};

  return buildEventMetadata(activityResult.activity, locale);
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

function genreBroadKey(dj: ScheduleDj, locale: Locale): string {
  const primary = dj.genre?.trim();
  if (primary && GENRE_BROAD[primary]) return GENRE_BROAD[primary];
  if (primary && GENRE_BROAD[primary.toLowerCase()]) return GENRE_BROAD[primary.toLowerCase()];
  const first = dj.genreLabel?.split('·')[0]?.trim();
  if (first && GENRE_BROAD[first]) return GENRE_BROAD[first];
  if (first && GENRE_BROAD[first.toLowerCase()]) return GENRE_BROAD[first.toLowerCase()];
  const name = dj.name;
  for (const hint of NAME_GENRE_HINTS) {
    if (hint.pattern.test(name)) return hint.broad;
  }
  return otherGenreLabel(locale);
}

function otherGenreLabel(locale: Locale): string {
  return getMessages(locale).eventDetail.lineupOtherGenre;
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
  locale: Locale,
): Map<string, { color: string; djs: ScheduleDj[] }> {
  const seen = new Set<string>();
  const groups = new Map<string, { color: string; djs: ScheduleDj[] }>();
  for (const dj of djs) {
    const key = normalizeName(dj.name);
    if (seen.has(key)) continue;
    seen.add(key);

    const broad = genreBroadKey(dj, locale);
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

export default async function EventDetailPage({ params }: EventDetailProps) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const legacyId = parseEventLegacyId(slug);
  if (!legacyId) notFound();

  const activityResult = await getActivity(legacyId);

  if (activityResult.status === 'error') {
    return <EventLoadError locale={locale} />;
  }

  if (activityResult.status === 'not_found' || !activityResult.activity) {
    return <EventUnavailableState locale={locale} />;
  }

  const rawActivity = activityResult.activity;
  const activity = localizeActivity(rawActivity, locale);

  if (!eventSlugMatches(slug, rawActivity, locale)) {
    permanentRedirect(eventPath(locale, activity));
  }

  const siteUrl = getSiteUrl();
  const [activitiesResult, scheduleResult] = await Promise.all([
    fetchActivities(),
    fetchActivitySchedule(activity.legacyId),
  ]);
  const allActivities = localizeActivities(activitiesResult.activities, locale);
  const image = getActivityImage(activity);
  const related = allActivities.filter((item) => item.legacyId !== activity.legacyId).slice(0, 3);
  const relatedFetchFailed = activitiesResult.status === 'error';

  const djs = scheduleResult.schedule?.djs ?? [];
  const lineupFetchFailed = scheduleResult.status === 'error';
  const genreGroups = groupByBroadGenre(djs, locale);
  const genreKeys = [...genreGroups.keys()].sort((a, b) => {
    const otherLabel = otherGenreLabel(locale);
    if (a === otherLabel) return 1;
    if (b === otherLabel) return -1;
    return (genreGroups.get(b)?.djs.length ?? 0) - (genreGroups.get(a)?.djs.length ?? 0);
  });
  const aiSummary = buildEventAiSummary(activity, djs, locale);
  const eventTitle = getActivityTitle(activity);
  const metaLine = activityMetaForLocale(activity, locale);
  const [metaDate, ...metaLocationParts] = metaLine.split(' · ');
  const metaLocation = metaLocationParts.join(' · ');
  const subscribeEventProperties = {
    event: String(activity.legacyId),
    sourcePath: eventPath(locale, activity),
    locale,
  };
  const breadcrumbItems = [
    { name: t.breadcrumbs.home, url: `${siteUrl}${localizedPath(locale)}` },
    { name: t.breadcrumbs.events, url: `${siteUrl}${localizedPath(locale, '/events')}` },
    { name: eventTitle },
  ];
  const jsonLd = buildEventJsonLd(activity, djs, locale, breadcrumbItems);

  return (
    <main className="detail-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <section className="detail-hero" data-reveal>
        <div className="container">
          <Breadcrumbs
            ariaLabel={t.breadcrumbs.ariaLabel}
            items={[
              { label: t.breadcrumbs.home, href: localizedPath(locale) },
              { label: t.breadcrumbs.events, href: localizedPath(locale, '/events') },
              { label: eventTitle },
            ]}
          />
          <div className="detail-hero__media">
            {image ? (
              <EventImage
                src={image}
                alt={eventTitle}
                className="detail-hero__photo"
                priority
                sizes="(max-width: 1200px) 100vw, 1100px"
              />
            ) : null}
            <div className="detail-hero__scrim" aria-hidden="true" />
            <div className="detail-hero__body">
              <div className="detail-hero__tags">
                {activity.activityType && (
                  <span className="pill pill--secondary">
                    {getActivityTypeLabel(locale, activity.activityType)}
                  </span>
                )}
                {getRegionLabel(locale, activity.region) ? (
                  <span className="pill pill--accent">
                    {getRegionLabel(locale, activity.region)}
                  </span>
                ) : null}
                {activity.hot && <span className="pill pill--primary">{t.eventCard.hot}</span>}
              </div>
              <h1 className="detail-hero__title">{eventTitle}</h1>
              <div className="detail-hero__meta">
                {metaDate ? <span>{metaDate}</span> : null}
                {metaLocation ? <span>{metaLocation}</span> : null}
                {activity.city ? (
                  <Link className="detail-hero__city-link" href={cityPath(locale, activity.city)}>
                    {t.eventDetail.cityEventsLink.replace('{city}', activity.city)}
                  </Link>
                ) : null}
              </div>
              <EventDetailActions
                legacyId={activity.legacyId}
                eventTitle={eventTitle}
                locale={locale}
                externalUrl={activity.externalUrl}
                subscribeEventProperties={subscribeEventProperties}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section section--detail-tight" data-reveal style={{ '--reveal-delay': '0.08s' } as CSSProperties}>
        <div className="container">
          <EventAiSummary
            summary={aiSummary}
            locale={locale}
            eventTitle={eventTitle}
            labels={t.eventDetail.aiSummary}
            subscribeEventProperties={subscribeEventProperties}
          />
        </div>
      </section>

      <section className="section section--detail-body" data-reveal style={{ '--reveal-delay': '0.12s' } as CSSProperties}>
        <div className="container detail-layout detail-layout--lineup">
          <article className="detail-lineup">
            <header className="detail-lineup__header">
              <div>
                <h2 className="detail-lineup__title">{t.eventDetail.lineupTitle}</h2>
                <p className="detail-lineup__lead">{t.eventDetail.lineupLead}</p>
              </div>
              {djs.length > 0 ? (
                <div className="detail-lineup__stats" aria-label={t.ui.lineupStats}>
                  <span>
                    <strong>{aiSummary.artistCount}</strong> {t.eventDetail.lineupStatsArtists}
                  </span>
                  <span className="detail-lineup__stats-divider" aria-hidden="true" />
                  <span>
                    <strong>{aiSummary.genreCount}</strong> {t.eventDetail.lineupStatsGenres}
                  </span>
                </div>
              ) : null}
            </header>

            {lineupFetchFailed ? (
              <LineupErrorState
                locale={locale}
                labels={{
                  title: t.eventDetail.lineupErrorTitle,
                  lead: t.eventDetail.lineupErrorLead,
                  retry: t.eventDetail.lineupErrorRetry,
                  browse: t.eventDetail.lineupEmptyBrowse,
                }}
              />
            ) : djs.length > 0 ? (
              <div className="lineup-genre-groups">
                {genreKeys.map((genreLabel) => {
                  const { color, djs: groupDjs } = genreGroups.get(genreLabel)!;
                  return (
                    <section className="lineup-section" key={genreLabel}>
                      <div className="lineup-section__header">
                        <h3 className="lineup-section__title">
                          <span
                            className="lineup-section__accent"
                            style={{ background: color }}
                          />
                          {genreLabel}
                        </h3>
                        <span className="lineup-section__count">{groupDjs.length}</span>
                      </div>
                      <div className="lineup-genre-grid">
                        {groupDjs.map((dj) => (
                          <div className="artist-card" key={dj.id} style={{ '--artist-accent': color } as CSSProperties}>
                            <span className="artist-card__bar" aria-hidden="true" />
                            <div className="artist-card__copy">
                              <span className="artist-card__name">{dj.name}</span>
                              {dj.stageLabel || dj.stage ? (
                                <span className="artist-card__stage">{dj.stageLabel ?? dj.stage}</span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <LineupEmptyState
                locale={locale}
                eventTitle={eventTitle}
                subscribeEventProperties={subscribeEventProperties}
                labels={{
                  title: t.eventDetail.lineupEmptyTitle,
                  lead: t.eventDetail.lineupEmptyLead,
                  action: t.eventDetail.lineupEmptyAction,
                  browseAction: t.eventDetail.lineupEmptyBrowse,
                }}
              />
            )}
          </article>

          <aside className="detail-rail">
            <article className="detail-panel detail-panel--compact">
              <h2 className="detail-panel__title">{t.eventDetail.aboutTitle}</h2>
              {activity.description ? (
                <p className="detail-panel__description">{activity.description}</p>
              ) : (
                <p className="detail-panel__description detail-panel__description--empty">
                  {t.eventDetail.aboutEmpty}
                </p>
              )}
              <dl className="detail-facts">
                <div className="detail-facts__row">
                  <dt>{t.eventDetail.type}</dt>
                  <dd>
                    {activity.activityType
                      ? getActivityTypeLabel(locale, activity.activityType)
                      : getActivityTypeLabel(locale, 'festival')}
                  </dd>
                </div>
                <div className="detail-facts__row">
                  <dt>{t.eventDetail.region}</dt>
                  <dd>{getRegionLabel(locale, activity.region) ?? '-'}</dd>
                </div>
                {activity.attendees != null ? (
                  <div className="detail-facts__row">
                    <dt>{t.eventDetail.attendees}</dt>
                    <dd>{activity.attendees.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}</dd>
                  </div>
                ) : null}
                {activity.infoSource ? (
                  <div className="detail-facts__row">
                    <dt>{t.eventDetail.infoSource}</dt>
                    <dd>{activity.infoSource}</dd>
                  </div>
                ) : null}
              </dl>
            </article>

            <article className="detail-cta-card">
              <h2 className="detail-cta-card__title">{t.eventDetail.ctaTitle}</h2>
              <p className="detail-cta-card__copy">{t.eventDetail.ctaCopy}</p>
              <TrackedLink
                className="button button--glow detail-cta-card__button"
                href={`${localizedPath(locale, '/waitlist')}?event=${encodeURIComponent(eventTitle)}`}
                eventName="event_subscribe_click"
                eventProperties={subscribeEventProperties}
              >
                {t.eventDetail.join}
              </TrackedLink>
            </article>
          </aside>
        </div>
      </section>

      {relatedFetchFailed ? (
        <section className="section section--detail-related" data-reveal>
          <div className="container">
            <RelatedEventsError
              locale={locale}
              labels={{
                title: t.eventDetail.relatedErrorTitle,
                lead: t.eventDetail.relatedErrorLead,
                retry: t.eventDetail.relatedErrorRetry,
                browse: t.eventDetail.relatedErrorBrowse,
              }}
            />
          </div>
        </section>
      ) : related.length ? (
        <section className="section section--detail-related" data-reveal>
          <div className="container">
            <div className="section__header">
              <div>
                <h2 className="section__title">{t.eventDetail.moreTitle}</h2>
              </div>
            </div>
            <div className="event-grid" data-reveal-stagger>
              {related.map((item, index) => (
                <EventCard
                  activity={item}
                  locale={locale}
                  key={item.legacyId}
                  style={{ '--card-index': index } as CSSProperties}
                />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="section section--detail-related" data-reveal>
          <div className="container">
            <EmptyState
              className="related-events-empty"
              icon={Sparkles}
              title={t.eventDetail.relatedEmptyTitle}
              lead={t.eventDetail.relatedEmptyLead}
              variant="compact"
              tone="accent"
              graphic="glow"
              actions={
                <TrackedLink
                  className="button button--compact"
                  href={`${localizedPath(locale, '/waitlist')}?event=${encodeURIComponent(eventTitle)}`}
                  eventName="event_subscribe_click"
                  eventProperties={{ ...subscribeEventProperties, source: 'related-empty' }}
                >
                  <span>{t.eventDetail.relatedEmptyAction}</span>
                  <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
                </TrackedLink>
              }
            />
          </div>
        </section>
      )}
    </main>
  );
}
