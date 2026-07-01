import { compactMeta } from '../lib/format';
import type { RecruitPost } from '../lib/types';
import { getMessages, localizeRecruitPost, type Locale } from '../lib/i18n';

function recruitPeople(post: RecruitPost, locale: Locale): string {
  const t = getMessages(locale);
  if (post.currentPeople != null && post.targetPeople != null) {
    return `${post.currentPeople}/${post.targetPeople}`;
  }
  if (post.targetPeople != null) {
    return t.recruitCard.targetPeople(post.targetPeople);
  }
  return t.recruitCard.fallbackPeople;
}

export function RecruitCard({ post, locale }: { post: RecruitPost; locale: Locale }) {
  const t = getMessages(locale);
  const localizedPost = localizeRecruitPost(post, locale);
  const body = localizedPost.body ?? localizedPost.content ?? t.recruitCard.fallbackBody;
  const isFull = localizedPost.recruitStatus === 'full';

  return (
    <article className="recruit-card">
      <div className="event-card__meta">
        {compactMeta([
          localizedPost.authorName ?? localizedPost.name ?? t.recruitCard.publicUser,
          localizedPost.departureCity ?? localizedPost.location,
        ])}
      </div>
      <h3>{body}</h3>
      <div className="ticker" aria-label="Squad tags">
        {(localizedPost.unityTags ?? []).slice(0, 4).map((tag) => (
          <span className="pill pill--secondary" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="recruit-card__footer">
        <span style={{ color: isFull ? 'rgb(255, 100, 103)' : 'rgb(163, 230, 53)' }}>
          {isFull ? t.recruitCard.full : t.recruitCard.open}
        </span>
        <span>{recruitPeople(localizedPost, locale)}</span>
      </div>
    </article>
  );
}
