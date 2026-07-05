import Image from 'next/image';

type SquadPlannerTeaserProps = {
  comingSoon: string;
  imageAlt: string;
};

export function SquadPlannerTeaser({ comingSoon, imageAlt }: SquadPlannerTeaserProps) {
  return (
    <article className="future-teaser" aria-label={imageAlt}>
      <div className="future-teaser__frame">
        <div className="future-teaser__atmosphere" aria-hidden>
          <div className="future-teaser__glow future-teaser__glow--warm" />
          <div className="future-teaser__glow future-teaser__glow--cool" />
        </div>

        <div className="future-teaser__visual">
          <Image
            className="future-teaser__image"
            src="/images/home/squad-planner.png?v=20260705"
            alt={imageAlt}
            width={1280}
            height={800}
            unoptimized
            sizes="(max-width: 860px) 100vw, min(960px, 88vw)"
          />
          <div className="future-teaser__overlay" aria-hidden />
          <span className="future-teaser__badge">{comingSoon}</span>
        </div>
      </div>
    </article>
  );
}
