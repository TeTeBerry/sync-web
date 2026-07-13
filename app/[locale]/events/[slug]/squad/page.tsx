import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Breadcrumbs } from '../../../../../components/Breadcrumbs';
import { FestivalSquadExperience } from '../../../../../components/festival-squad/FestivalSquadExperience';
import { EventImage } from '../../../../../components/EventImage';
import { EventLoadError } from '../../../../../components/states/EventLoadError';
import { EventUnavailableState } from '../../../../../components/states/EventUnavailableState';
import { getActivityImage, getActivityTitle } from '../../../../../lib/api';
import { getActivityDateRange } from '../../../../../lib/activity-date';
import { loadEventPageData } from '../../../../../lib/event-page';
import { getFestivalAtmosphere } from '../../../../../lib/festival-atmosphere';
import {
  eventPath,
  eventSlugMatches,
  eventSquadAlternateLanguages,
  eventSquadPath,
  resolveActivityBySlug,
} from '../../../../../lib/event-slug';
import { getSiteUrl } from '../../../../../lib/site';
import {
  activityMetaForLocale,
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  localizedPath,
  type Locale,
} from '../../../../../lib/i18n';
import { buildSocialMetadata } from '../../../../../lib/seo';

type SquadPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: SquadPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = getMessages(locale);
  const activityResult = await resolveActivityBySlug(slug, locale);
  if (!activityResult.activity) return {};

  const activity = activityResult.activity;
  const festival = getActivityTitle(activity);
  const title = t.festivalSquad.page.seoTitle.replace('{festival}', festival);
  const description = t.festivalSquad.page.seoDescription.replace('{festival}', festival);
  const path = eventSquadPath(locale, activity);
  const url = `${getSiteUrl()}${path}`;
  const imagePath = getActivityImage(activity);
  const imageUrl = imagePath
    ? imagePath.startsWith('http')
      ? imagePath
      : `${getSiteUrl()}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`
    : undefined;
  const languages = Object.fromEntries(
    Object.entries(eventSquadAlternateLanguages(activity)).map(([language, href]) => [
      language,
      `${getSiteUrl()}${href}`,
    ]),
  );

  return {
    title: { absolute: `${title} | Raven` },
    description,
    alternates: { canonical: url, languages },
    ...buildSocialMetadata({
      title,
      description,
      url,
      locale,
      image: imageUrl ? { url: imageUrl, alt: festival } : undefined,
    }),
  };
}

export default async function EventSquadPage({ params }: SquadPageProps) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const activityResult = await resolveActivityBySlug(slug, locale);
  if (activityResult.status === 'error') return <EventLoadError locale={locale} />;
  if (activityResult.status === 'not_found' || !activityResult.activity) {
    return <EventUnavailableState locale={locale} />;
  }
  if (!eventSlugMatches(slug, activityResult.activity, locale)) {
    permanentRedirect(eventSquadPath(locale, activityResult.activity));
  }
  const pageData = await loadEventPageData(locale, slug);

  if (pageData === 'error') return <EventLoadError locale={locale} />;
  if (pageData === 'not_found') return <EventUnavailableState locale={locale} />;

  const { activity, eventTitle, featuredArtists, djs, aiSummary } = pageData;
  const siteUrl = getSiteUrl();
  const eventHref = eventPath(locale, activity);
  const squadHref = eventSquadPath(locale, activity);
  const metaLine = activityMetaForLocale(activity, locale);
  const festivalDateRange = getActivityDateRange(activity);
  const artistNameById = Object.fromEntries(djs.map((dj) => [dj.id, dj.name]));
  const image = getActivityImage(activity);
  const atmosphere = getFestivalAtmosphere(activity, aiSummary.genres[0]);

  return (
    <main className="detail-page detail-page--experience detail-page--squad" data-atmosphere={atmosphere}>
      <section className="squad-scene" aria-labelledby="squad-scene-title" data-reveal>
        <div className="squad-scene__stage">
          {image ? (
            <EventImage
              src={image}
              alt={eventTitle}
              className="squad-scene__photo"
              priority
              sizes="100vw"
            />
          ) : null}
          <div className="squad-scene__atmosphere" aria-hidden="true">
            <div className="squad-scene__glow" />
            <div className="squad-scene__scrim" />
          </div>

          <div className="container squad-scene__frame">
            <Breadcrumbs
              ariaLabel={t.breadcrumbs.ariaLabel}
              items={[
                { label: t.breadcrumbs.home, href: localizedPath(locale) },
                { label: t.breadcrumbs.events, href: localizedPath(locale, '/events') },
                { label: eventTitle, href: eventHref },
                { label: t.festivalSquad.breadcrumb },
              ]}
            />

            <div className="squad-scene__copy">
              <p className="squad-scene__kicker">{t.festivalSquad.hero.kicker}</p>
              <h1 id="squad-scene-title" className="squad-scene__title">
                {eventTitle}
              </h1>
              {metaLine ? <p className="squad-scene__meta">{metaLine}</p> : null}
              <p className="squad-scene__invite">{t.festivalSquad.hero.invite}</p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="section section--detail-body squad-body"
        data-reveal
        style={{ '--reveal-delay': '0.06s' } as CSSProperties}
      >
        <div className="container">
          <FestivalSquadExperience
            locale={locale}
            eventId={activity.legacyId}
            eventTitle={eventTitle}
            metaLine={metaLine}
            festivalStartDate={activity.startDate}
            festivalEndDate={activity.endDate}
            festivalDateLabel={activity.date}
            festivalDateRange={festivalDateRange}
            artistNames={featuredArtists.map((artist) => artist.name)}
            artistNameById={artistNameById}
            copy={t.festivalSquad}
            heroEmbedded
          />
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: t.breadcrumbs.home, item: `${siteUrl}${localizedPath(locale)}` },
              {
                '@type': 'ListItem',
                position: 2,
                name: t.breadcrumbs.events,
                item: `${siteUrl}${localizedPath(locale, '/events')}`,
              },
              { '@type': 'ListItem', position: 3, name: eventTitle, item: `${siteUrl}${eventHref}` },
              {
                '@type': 'ListItem',
                position: 4,
                name: t.festivalSquad.breadcrumb,
                item: `${siteUrl}${squadHref}`,
              },
            ],
          }).replace(/</g, '\\u003c'),
        }}
      />
    </main>
  );
}
