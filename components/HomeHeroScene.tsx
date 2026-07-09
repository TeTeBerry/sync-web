import Image from 'next/image';
import { BrandLogo } from './BrandLogo';
import { EventImage } from './EventImage';
import { TrackedLink } from './TrackedLink';
import { ArrowRight } from 'lucide-react';
import type { FestivalAtmosphere } from '../lib/festival-atmosphere';
import { localizedPath, type Locale } from '../lib/i18n';

type HomeHeroSceneProps = {
  locale: Locale;
  seoHeading: string;
  titleLine1: string;
  titleLine2: string;
  lead: string;
  primaryCta: string;
  exploreCta: string;
  festivalName: string;
  festivalDate: string;
  festivalLocation: string;
  imageSrc?: string;
  imageAlt: string;
  atmosphere: FestivalAtmosphere;
};

export function HomeHeroScene({
  locale,
  seoHeading,
  titleLine1,
  titleLine2,
  lead,
  primaryCta,
  exploreCta,
  festivalName,
  festivalDate,
  festivalLocation,
  imageSrc,
  imageAlt,
  atmosphere,
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

          <div className="ai-hero__ctas">
            <TrackedLink
              className="button button--glow ai-hero__cta-primary"
              href={localizedPath(locale, '/waitlist')}
              eventName="home_plan_click"
              eventProperties={{ locale, source: 'hero-primary' }}
            >
              {primaryCta}
            </TrackedLink>
            <TrackedLink
              className="ai-hero__cta-text"
              href={localizedPath(locale, '/events')}
              eventName="home_events_click"
              eventProperties={{ locale, source: 'hero-secondary' }}
            >
              {exploreCta}
              <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
            </TrackedLink>
          </div>
        </div>
      </div>
    </section>
  );
}
