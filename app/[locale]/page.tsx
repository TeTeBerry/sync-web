import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventCard } from '../../components/EventCard';
import { RecruitCard } from '../../components/RecruitCard';
import { TrackedLink } from '../../components/TrackedLink';
import { getActivityImage, getActivityTitle, listActivities, listRecruitPosts } from '../../lib/api';
import { activityMeta } from '../../lib/format';
import {
  getMessages,
  isLocale,
  localizeActivity,
  localizedPath,
  type Locale,
} from '../../lib/i18n';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : 'zh';
  const t = getMessages(locale);
  return {
    title: {
      absolute: t.siteTitle,
    },
    description: t.siteDescription,
    alternates: {
      canonical: localizedPath(locale),
      languages: {
        'zh-CN': localizedPath('zh'),
        en: localizedPath('en'),
      },
    },
    openGraph: {
      title: t.siteTitle,
      description: t.ogDescription,
      type: 'website',
      url: localizedPath(locale),
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const activities = await listActivities();
  const featured = activities[0];
  const localizedFeatured = featured ? localizeActivity(featured, locale) : undefined;
  const posts = featured ? await listRecruitPosts(featured.legacyId) : [];
  const heroImage = getActivityImage(localizedFeatured);
  const featuredMeta = localizedFeatured ? activityMeta(localizedFeatured) : t.home.featuredMetaFallback;

  return (
    <main>
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <div className="eyebrow">{t.home.eyebrow}</div>
            <h1 className="hero__title">
              <span>{t.home.titlePrefix}</span>
              <span className="hero__title-highlight">{t.home.titleHighlight}</span>
              <span>{t.home.titleSuffix}</span>
            </h1>
            <p className="lead" style={{ marginTop: 20 }}>
              {t.home.lead}
            </p>
            <div className="hero__actions">
              <TrackedLink
                className="button"
                href={localizedPath(locale, '/events')}
                eventName="home_events_click"
                eventProperties={{ locale }}
              >
                {t.home.eventsCta}
              </TrackedLink>
              <TrackedLink
                className="button secondary"
                href={localizedPath(locale, '/waitlist')}
                eventName="home_waitlist_click"
                eventProperties={{ locale }}
              >
                {t.home.waitlistCta}
              </TrackedLink>
            </div>
          </div>
          <Link
            className="hero__media"
            href={featured ? localizedPath(locale, `/events/${featured.legacyId}`) : localizedPath(locale, '/events')}
            style={
              heroImage ? ({ '--hero-image': `url("${heroImage}")` } as CSSProperties) : undefined
            }
          >
            <div className="hero__media-caption">
              <div className="hero__media-label">{t.home.featuredLabel}</div>
              <div className="ticker">
                <span className="pill pill--primary">{t.home.mediaPills[0]}</span>
                <span className="pill pill--secondary">{t.home.mediaPills[1]}</span>
                <span className="pill pill--accent">{t.home.mediaPills[2]}</span>
              </div>
              <h2>{localizedFeatured ? getActivityTitle(localizedFeatured) : t.home.featuredFallback}</h2>
              <p className="hero__media-meta">{featuredMeta || t.home.featuredMetaFallback}</p>
            </div>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header">
            <div>
              <div className="eyebrow">{t.home.eventsEyebrow}</div>
              <h2>{t.home.eventsTitle}</h2>
            </div>
            <TrackedLink
              className="button secondary"
              href={localizedPath(locale, '/events')}
              eventName="home_events_click"
              eventProperties={{ locale, source: 'section' }}
            >
              {t.home.viewAll}
            </TrackedLink>
          </div>
          <div className="event-grid">
            {activities.slice(0, 6).map((activity) => (
              <EventCard activity={activity} locale={locale} key={activity.legacyId} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header">
            <div>
              <div className="eyebrow">{t.home.crewEyebrow}</div>
              <h2>{t.home.crewTitle}</h2>
            </div>
          </div>
          <div className="event-grid">
            {posts.slice(0, 3).map((post) => (
              <RecruitCard post={post} locale={locale} key={post.id} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
