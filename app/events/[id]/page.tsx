import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventCard } from '../../../components/EventCard';
import { RecruitCard } from '../../../components/RecruitCard';
import {
  getActivity,
  getActivityImage,
  getActivityLineup,
  getActivityTitle,
  listActivities,
  listRecruitPosts,
} from '../../../lib/api';
import { activityMeta } from '../../../lib/format';

type EventDetailProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const activities = await listActivities();
  return activities.slice(0, 24).map((activity) => ({
    id: String(activity.legacyId),
  }));
}

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

export default async function EventDetailPage({ params }: EventDetailProps) {
  const { id } = await params;
  const activity = await getActivity(Number(id));
  if (!activity) notFound();

  const [posts, allActivities] = await Promise.all([
    listRecruitPosts(activity.legacyId),
    listActivities(),
  ]);
  const lineup = getActivityLineup(activity);
  const image = getActivityImage(activity);
  const related = allActivities.filter((item) => item.legacyId !== activity.legacyId).slice(0, 3);

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
              <p className="lead">
                {activity.description ||
                  '活动信息正在同步中，先开放详情浏览、阵容关注和公开招募预览。'}
              </p>
            </article>

            <article className="detail-panel">
              <div className="eyebrow">Lineup</div>
              <h2>阵容</h2>
              <div className="lineup">
                {(lineup.length ? lineup : ['Lineup TBA']).map((artist) => (
                  <span className="pill pill--accent" key={artist}>
                    {artist}
                  </span>
                ))}
              </div>
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
