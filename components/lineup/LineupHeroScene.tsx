"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Breadcrumbs } from "../Breadcrumbs";
import { EventImage } from "../EventImage";
import type { FestivalAtmosphere } from "../../lib/festival-atmosphere";
import type { Locale } from "../../lib/i18n";
import { getLineupDiscoveryCopy } from "../../lib/i18n";

export type LineupHeroLabels = {
  artistsUnit: string;
  stagesUnit: string;
  genresUnit: string;
};

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type LineupHeroSceneProps = {
  locale: Locale;
  eventTitle: string;
  atmosphere: FestivalAtmosphere;
  invite?: string;
  worldPremise?: string;
  image?: string;
  artistCount: number;
  stageCount: number;
  genreCount: number;
  breadcrumbsAriaLabel: string;
  breadcrumbs: BreadcrumbItem[];
  weekendContext?: {
    label: string;
    story: string;
    switchHref: string;
    switchLabel: string;
  };
  labels: LineupHeroLabels;
};

/**
 * Festival-first hero — name and atmosphere only.
 * The page is the night; no redundant enter CTA.
 */
export function LineupHeroScene({
  locale,
  eventTitle,
  atmosphere,
  invite,
  worldPremise,
  image,
  artistCount,
  breadcrumbsAriaLabel,
  breadcrumbs,
  weekendContext,
  labels,
}: LineupHeroSceneProps) {
  const copy = getLineupDiscoveryCopy(locale).hero;

  return (
    <section
      className="lineup-hero"
      aria-labelledby="lineup-hero-heading"
      data-reveal
      data-atmosphere={atmosphere}
    >
      <div className="lineup-hero__stage">
        {image ? (
          <EventImage
            src={image}
            alt={eventTitle}
            className="lineup-hero__photo"
            priority
            sizes="100vw"
          />
        ) : null}
        <div className="lineup-hero__atmosphere" aria-hidden="true">
          <div className="lineup-hero__glow" />
          <div className="lineup-hero__scrim" />
        </div>

        <div className="container lineup-hero__frame">
          <Breadcrumbs ariaLabel={breadcrumbsAriaLabel} items={breadcrumbs} />

          <div
            className="lineup-hero__body"
            style={{ "--reveal-delay": "0.08s" } as CSSProperties}
          >
            <h1 id="lineup-hero-heading" className="lineup-hero__title">
              {eventTitle}
            </h1>
            <p className="lineup-hero__invite">{invite?.trim() || copy.lead}</p>
            {worldPremise ? (
              <p className="lineup-hero__world">{worldPremise}</p>
            ) : null}
            {artistCount > 0 ? (
              <p className="lineup-hero__whisper">
                {artistCount} {labels.artistsUnit}
              </p>
            ) : null}
            {weekendContext ? (
              <>
                <p className="lineup-hero__weekend">
                  <span>{weekendContext.label}</span>
                  <Link href={weekendContext.switchHref}>
                    {weekendContext.switchLabel}
                  </Link>
                </p>
                <p className="lineup-hero__weekend-story">
                  {weekendContext.story}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
