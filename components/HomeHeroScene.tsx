import Image from 'next/image';
import { BrandLogo } from './BrandLogo';
import { EventImage } from './EventImage';
import { HomeBudgetEstimator } from './HomeBudgetEstimator';
import type { FestivalAtmosphere } from '../lib/festival-atmosphere';
import type { Locale } from '../lib/i18n';
import type { Activity } from '../lib/types';

type HomeHeroSceneProps = {
  locale: Locale;
  seoHeading: string;
  titleLine1: string;
  titleLine2: string;
  lead: string;
  festivalName: string;
  festivalDate: string;
  festivalLocation: string;
  imageSrc?: string;
  imageAlt: string;
  atmosphere: FestivalAtmosphere;
  activities: Activity[];
  featuredActivity?: Activity;
};

export function HomeHeroScene({
  locale,
  seoHeading,
  titleLine1,
  titleLine2,
  lead,
  festivalName,
  festivalDate,
  festivalLocation,
  imageSrc,
  imageAlt,
  atmosphere,
  activities,
  featuredActivity,
}: HomeHeroSceneProps) {
  return (
    <section
      className="ai-hero ai-hero--statement home-hero"
      aria-labelledby="home-hero-title"
      data-atmosphere={atmosphere}
    >
      <div className="home-hero__media" aria-hidden={!imageSrc}>
        {imageSrc ? (
          <EventImage
            src={imageSrc}
            alt={imageAlt}
            className="home-hero__photo"
            priority
            sizes="100vw"
          />
        ) : (
          <Image
            className="home-hero__photo home-hero__photo--fallback"
            src="/images/home/squad-planner.png?v=20260705"
            alt=""
            fill
            priority
            sizes="100vw"
            unoptimized
          />
        )}
        <div className="home-hero__shade" aria-hidden />
      </div>

      <div className="ai-hero__atmosphere" aria-hidden="true">
        <div className="ai-hero__mesh" />
        <div className="ai-hero__glow ai-hero__glow--warm" />
        <div className="ai-hero__glow ai-hero__glow--cool" />
        <div className="ai-hero__spotlight" />
        <div className="ai-hero__stage">
          <span className="ai-hero__stage-light ai-hero__stage-light--left" />
          <span className="ai-hero__stage-light ai-hero__stage-light--right" />
          <span className="ai-hero__stage-arc" />
          <span className="ai-hero__crowd" />
        </div>
        <div className="ai-hero__grain" />
      </div>

      <div className="container ai-hero__grid">
        <div className="ai-hero__copy">
          <div className="ai-hero__head">
            <BrandLogo className="home-hero__brand" height={36} />

            <h1 className="ai-hero__title" id="home-hero-title">
              <span className="visually-hidden">{seoHeading}</span>
              <span className="ai-hero__headline" aria-hidden="true">
                {titleLine1}
              </span>
              <span className="ai-hero__headline ai-hero__headline--accent" aria-hidden="true">
                {titleLine2}
              </span>
            </h1>

            <div className="ai-hero__ctas">
              <HomeBudgetEstimator
                locale={locale}
                activities={activities}
                featuredActivity={featuredActivity}
                variant="hero"
              />
            </div>

            <p className="lead ai-hero__lead">{lead}</p>

            <p className="ai-hero__festival-meta">
              <span className="ai-hero__festival-name">{festivalName}</span>
              <span className="ai-hero__festival-sep" aria-hidden="true">
                ·
              </span>
              <span>{festivalDate}</span>
              <span className="ai-hero__festival-sep" aria-hidden="true">
                ·
              </span>
              <span>{festivalLocation}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
