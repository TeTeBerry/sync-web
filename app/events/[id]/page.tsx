import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventCard } from '../../../components/EventCard';
import { RecruitCard } from '../../../components/RecruitCard';
import {
  fetchActivitySchedule,
  getActivity,
  getActivityImage,
  getActivityTitle,
  listActivities,
  listRecruitPosts,
} from '../../../lib/api';
import { activityMeta } from '../../../lib/format';
import type { ScheduleDj } from '../../../lib/api';

type EventDetailProps = {
  params: Promise<{ id: string }>;
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  festival: '户外电音节',
  indoor: '室内电音',
};

const REGION_LABELS: Record<string, string> = {
  domestic: '国内',
  overseas: '海外',
  hmt: '港澳台',
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: EventDetailProps): Promise<Metadata> {
  const { id } = await params;
  const activity = await getActivity(Number(id));
  if (!activity) return {};
  const title = getActivityTitle(activity);
  const description = activity.description || `${activityMeta(activity)} · 查看阵容与公开组队招募。`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: getActivityImage(activity) ? [{ url: getActivityImage(activity)! }] : undefined,
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

export default async function EventDetailPage({ params }: EventDetailProps) {
  const { id } = await params;
  const activity = await getActivity(Number(id));
  if (!activity) notFound();

  const [posts, allActivities, schedule] = await Promise.all([
    listRecruitPosts(activity.legacyId),
    listActivities(),
    fetchActivitySchedule(activity.legacyId),
  ]);
  const image = getActivityImage(activity);
  const related = allActivities.filter((item) => item.legacyId !== activity.legacyId).slice(0, 3);

  const djs = schedule?.djs ?? [];
  const genreGroups = groupByBroadGenre(djs);
  const genreKeys = [...genreGroups.keys()];

  return (
    <main>
      <section className="detail-hero">
        <div className="container">
          <div
            className="detail-hero__media"
            style={image ? ({ '--detail-image': `url("${image}")` } as CSSProperties) : undefined}
          >
            <div>
              <div className="eyebrow">Event Detail</div>
              <h1>{getActivityTitle(activity)}</h1>
              <p className="lead">{activityMeta(activity)}</p>
              <div className="detail-actions" style={{ marginTop: 16 }}>
                <Link className="button" href={`/waitlist?event=${activity.legacyId}`}>
                  订阅更新
                </Link>
                <a className="button secondary" href="#crew">
                  查看同行招募
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
              <div className="eyebrow">About</div>
              <h2>活动信息</h2>
              <p className="lead">{activity.description || ''}</p>
              <div className="detail-meta">
                <div className="detail-meta__row">
                  <span className="detail-meta__label">类型</span>
                  <span className="pill pill--secondary">
                    {activity.activityType
                      ? ACTIVITY_TYPE_LABELS[activity.activityType] ?? activity.activityType
                      : '电音节'}
                  </span>
                </div>
                <div className="detail-meta__row">
                  <span className="detail-meta__label">区域</span>
                  <span className="pill pill--accent">
                    {activity.region ? REGION_LABELS[activity.region] ?? activity.region : '—'}
                  </span>
                </div>
                {activity.attendees != null && (
                  <div className="detail-meta__row">
                    <span className="detail-meta__label">关注人数</span>
                    <span className="detail-meta__value">{activity.attendees}</span>
                  </div>
                )}
                {activity.recruitPostCount != null && activity.recruitPostCount > 0 && (
                  <div className="detail-meta__row">
                    <span className="detail-meta__label">公开招募</span>
                    <span className="detail-meta__value">{activity.recruitPostCount} 条</span>
                  </div>
                )}
                {activity.externalUrl && (
                  <div className="detail-meta__row">
                    <span className="detail-meta__label">购票 / 官网</span>
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
                    <span className="detail-meta__label">信息来源</span>
                    <span className="detail-meta__value">{activity.infoSource}</span>
                  </div>
                )}
              </div>
            </article>

            <article className="detail-panel">
              <div className="eyebrow">Lineup</div>
              <h2>阵容</h2>
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
                <p className="section__note">阵容尚未公布，敬请期待。</p>
              )}
            </article>

            <article className="detail-panel" id="crew">
              <div className="eyebrow">Crew</div>
              <h2>公开同行招募</h2>
              <div className="recruit-list">
                {posts.length ? (
                  posts.map((post) => <RecruitCard post={post} key={post.id} />)
                ) : (
                  <p className="section__note">这场活动还没有公开招募，先订阅更新或加入内测。</p>
                )}
              </div>
            </article>
          </div>

          <aside className="detail-panel">
            <div className="eyebrow">MVP Signal</div>
            <h2>下一步想验证</h2>
            <p className="section__note">
              用户是否愿意订阅这场活动、浏览同行需求，并在小程序上线前留下联系方式。
            </p>
            <div className="section__actions" style={{ marginTop: 8 }}>
              <Link className="button" href={`/waitlist?event=${activity.legacyId}`}>
                加入内测
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {related.length ? (
        <section className="section">
          <div className="container">
            <div className="section__header">
              <div>
                <div className="eyebrow">More</div>
                <h2>继续看看其他活动</h2>
              </div>
            </div>
            <div className="event-grid">
              {related.map((item) => (
                <EventCard activity={item} key={item.legacyId} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
