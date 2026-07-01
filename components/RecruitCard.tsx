import { compactMeta, recruitPeople } from '../lib/format';
import type { RecruitPost } from '../lib/types';

export function RecruitCard({ post }: { post: RecruitPost }) {
  const body = post.body ?? post.content ?? '这条公开招募还在整理中。';
  return (
    <article className="recruit-card">
      <div className="event-card__meta">
        {compactMeta([post.authorName ?? '公开用户', post.departureCity ?? post.location])}
      </div>
      <h3>{body}</h3>
      <div className="ticker" aria-label="Recruit tags">
        {(post.unityTags ?? []).slice(0, 4).map((tag) => (
          <span className="pill" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="recruit-card__footer">
        <span>{post.recruitStatus === 'full' ? '已满' : '招募中'}</span>
        <span>{recruitPeople(post)}</span>
      </div>
    </article>
  );
}
