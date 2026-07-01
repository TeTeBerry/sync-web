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

function recruitStatus(post: RecruitPost, locale: Locale): { label: string; tone: 'open' | 'almost' | 'full' } {
  const t = getMessages(locale);
  if (post.recruitStatus === 'full') return { label: t.recruitCard.full, tone: 'full' };

  if (
    post.currentPeople != null &&
    post.targetPeople != null &&
    post.targetPeople > post.currentPeople &&
    post.targetPeople - post.currentPeople <= 1
  ) {
    return { label: t.recruitCard.almostFull, tone: 'almost' };
  }

  return { label: t.recruitCard.open, tone: 'open' };
}

export function RecruitCard({ post, locale }: { post: RecruitPost; locale: Locale }) {
  const t = getMessages(locale);
  const localizedPost = localizeRecruitPost(post, locale);
  const body = localizedPost.body ?? localizedPost.content ?? t.recruitCard.fallbackBody;
  const status = recruitStatus(localizedPost, locale);
  const hasProgress =
    localizedPost.currentPeople != null &&
    localizedPost.targetPeople != null &&
    localizedPost.targetPeople > 0;
  const progress = hasProgress
    ? Math.min(100, Math.max(0, (localizedPost.currentPeople! / localizedPost.targetPeople!) * 100))
    : 0;

  return (
    <article className="recruit-card">
      <div className="recruit-card__topline">
        <div className="event-card__meta">
          {compactMeta([
            localizedPost.authorName ?? localizedPost.name ?? t.recruitCard.publicUser,
            localizedPost.departureCity ?? localizedPost.location,
          ])}
        </div>
        <span className={`recruit-card__status recruit-card__status--${status.tone}`}>
          {status.label}
        </span>
      </div>
      <h3>{body}</h3>
      <div className="ticker recruit-card__tags" aria-label="Squad tags">
        {(localizedPost.unityTags ?? []).slice(0, 4).map((tag) => (
          <span className="pill pill--secondary" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="recruit-card__footer">
        <span>{recruitPeople(localizedPost, locale)}</span>
        {hasProgress && (
          <span
            className="recruit-card__progress"
            aria-label={recruitPeople(localizedPost, locale)}
          >
            <span style={{ width: `${progress}%` }} />
          </span>
        )}
      </div>
    </article>
  );
}
