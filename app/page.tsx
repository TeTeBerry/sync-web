import type { CSSProperties } from 'react';
import Link from 'next/link';
import { EventCard } from '../components/EventCard';
import { RecruitCard } from '../components/RecruitCard';
import { getActivityImage, getActivityTitle, listActivities, listRecruitPosts } from '../lib/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const activities = await listActivities();
  const featured = activities[0];
  const posts = featured ? await listRecruitPosts(featured.legacyId) : [];
  const heroImage = getActivityImage(featured);

  return (
    <main>
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <div className="eyebrow">SYNC</div>
            <h1>
              电音节资讯
              <br />
              与公开组队招募
            </h1>
            <p className="lead" style={{ marginTop: 20 }}>
              先在 Web 上发现活动、查看阵容和公开组队需求。小程序审核期间，这里就是 SYNC
              的第一版内测入口。
            </p>
            <div className="hero__actions">
              <Link className="button" href="/events">
                查活动
              </Link>
              <Link className="button secondary" href="/waitlist">
                加入内测
              </Link>
            </div>
          </div>
          <Link
            className="hero__media"
            href={featured ? `/events/${featured.legacyId}` : '/events'}
            style={
              heroImage ? ({ '--hero-image': `url("${heroImage}")` } as CSSProperties) : undefined
            }
          >
            <div className="hero__media-caption">
              <div className="ticker">
                <span className="pill pill--primary">活动详情</span>
                <span className="pill pill--secondary">阵容更新</span>
                <span className="pill pill--accent">公开招募</span>
              </div>
              <h2>{featured ? getActivityTitle(featured) : '精选活动'}</h2>
            </div>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header">
            <div>
              <div className="eyebrow">Events</div>
              <h2>先从热门活动开始</h2>
            </div>
            <Link className="button secondary" href="/events">
              查看全部
            </Link>
          </div>
          <div className="event-grid">
            {activities.slice(0, 6).map((activity) => (
              <EventCard activity={activity} key={activity.legacyId} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header">
            <div>
              <div className="eyebrow">Crew</div>
              <h2>公开组队需求</h2>
            </div>
          </div>
          <div className="event-grid">
            {posts.slice(0, 3).map((post) => (
              <RecruitCard post={post} key={post.id} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
