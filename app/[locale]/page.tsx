import type { Metadata } from 'next';
import nextDynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { HomeDiscoveryPromise } from '../../components/HomeDiscoveryPromise';
import { HomeHeroScene } from '../../components/HomeHeroScene';
import { HomeWorldCue } from '../../components/HomeWorldCue';
import { AiPlannerSkeleton } from '../../components/states/AiPlannerSkeleton';
import { TrackedLink } from '../../components/TrackedLink';
import { ArrowRight } from 'lucide-react';
import {
  fetchActivities,
  getActivityImage,
  getActivityTitle,
} from '../../lib/api';
import { eventPath } from '../../lib/event-slug';
import { getFestivalAtmosphere } from '../../lib/festival-atmosphere';
import { activityMeta } from '../../lib/format';
import {
  getMessages,
  DEFAULT_LOCALE,
  isLocale,
  localizeActivities,
  localizedPath,
  type Locale,
} from '../../lib/i18n';
import {
  absoluteAlternateLanguages,
  absoluteLocalizedUrl,
  buildSocialMetadata,
} from '../../lib/seo';
import type { Activity } from '../../lib/types';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

const AiPlannerExperience = nextDynamic(
  () =>
    import('../../components/AiPlannerExperience').then((module) => ({
      default: module.AiPlannerExperience,
    })),
  {
    loading: () => <AiPlannerSkeleton />,
  },
);

function pickHeroActivity(activities: Activity[]): Activity | undefined {
  const tomorrowland = activities.find((activity) =>
    `${activity.name} ${activity.title ?? ''}`.toLowerCase().includes('tomorrowland'),
  );
  if (tomorrowland) return tomorrowland;

  return [...activities].sort((left, right) => {
    const hotDelta = Number(Boolean(right.hot)) - Number(Boolean(left.hot));
    if (hotDelta !== 0) return hotDelta;
    return (right.attendees ?? 0) - (left.attendees ?? 0);
  })[0];
}

function pickWorldCue(activities: Activity[], hero?: Activity): Activity | undefined {
  const others = activities.filter((activity) => activity.legacyId !== hero?.legacyId);
  return [...others].sort((left, right) => {
    const hotDelta = Number(Boolean(right.hot)) - Number(Boolean(left.hot));
    if (hotDelta !== 0) return hotDelta;
    return (right.attendees ?? 0) - (left.attendees ?? 0);
  })[0];
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = getMessages(locale);
  const url = absoluteLocalizedUrl(locale);

  return {
    title: {
      absolute: t.siteTitle,
    },
    description: t.siteDescription,
    alternates: {
      canonical: url,
      languages: absoluteAlternateLanguages(),
    },
    ...buildSocialMetadata({
      title: t.siteTitle,
      description: t.ogDescription,
      url,
      locale,
    }),
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const { activities: rawActivities } = await fetchActivities();
  const activities = localizeActivities(rawActivities, locale);
  const heroActivity = pickHeroActivity(activities);
  const worldCueActivity = pickWorldCue(activities, heroActivity);

  const fallbackFestival =
    t.home.heroFlow.discovery.festivals.find(
      (festival) => 'featured' in festival && festival.featured,
    ) ?? t.home.heroFlow.discovery.festivals[0];

  const festivalName = heroActivity ? getActivityTitle(heroActivity) : fallbackFestival.name;
  const festivalMeta = heroActivity ? activityMeta(heroActivity) : `${fallbackFestival.date} · ${fallbackFestival.location}`;
  const [festivalDate, festivalLocation] = heroActivity
    ? festivalMeta.split(' · ')
    : [fallbackFestival.date, fallbackFestival.location];
  const atmosphere = heroActivity ? getFestivalAtmosphere(heroActivity) : 'amber';
  const heroImage = heroActivity ? getActivityImage(heroActivity) : undefined;

  const timelineMoments = t.home.timeline.days.flatMap((day) =>
    day.items.map((item, index) => ({
      time: index === 0 ? `${day.label} · ${item.time}` : item.time,
      label: item.label,
      kind: item.kind,
    })),
  );

  const journey = {
    festival: heroActivity ? festivalName : t.home.dashboard.festival,
    meta: heroActivity ? festivalMeta : t.home.dashboard.meta,
    story: t.home.plannerLead,
    cta: t.home.dashboard.cta,
    arrival: `${t.home.dashboard.trip.flight.label} ${t.home.dashboard.trip.flight.route}`,
    stay: `${t.home.dashboard.trip.hotel.label} · ${t.home.dashboard.trip.hotel.name}`,
    budgetLabel: t.home.dashboard.budget.perPerson,
    budgetValue: t.home.dashboard.budget.total,
    moments: timelineMoments.slice(0, 10),
  };

  return (
    <main className="home">
      <HomeHeroScene
        locale={locale}
        seoHeading={t.home.seoHeading}
        titleLine1={t.home.titleLine1}
        titleLine2={t.home.titleLine2}
        lead={t.home.lead}
        primaryCta={t.home.primaryCta}
        exploreCta={t.home.exploreCta}
        festivalName={festivalName}
        festivalDate={festivalDate ?? fallbackFestival.date}
        festivalLocation={festivalLocation ?? fallbackFestival.location}
        imageSrc={heroImage}
        imageAlt={festivalName}
        atmosphere={atmosphere}
      />

      <section
        className="section home-scene home-scene--promise"
        id="discovery-promise"
        aria-labelledby="discovery-promise-title"
        data-reveal
      >
        <div className="container">
          <HomeDiscoveryPromise
            title={t.home.howTitle}
            lead={t.home.promiseLead}
            beats={t.home.steps.map((step) => ({ title: step.title }))}
          />
        </div>
      </section>

      <section
        className="section home-scene home-scene--journey"
        id="journey-preview"
        aria-labelledby="journey-preview-title"
        data-reveal
      >
        <div className="container">
          <div className="section__header section__header--editorial">
            <div>
              <h2 id="journey-preview-title">{t.home.plannerTitle}</h2>
              <p className="section__note">{t.home.timelineLead}</p>
            </div>
          </div>

          <Suspense fallback={<AiPlannerSkeleton />}>
            <AiPlannerExperience locale={locale} journey={journey} />
          </Suspense>
        </div>
      </section>

      {worldCueActivity ? (
        <section className="section home-scene home-scene--worlds" aria-label={t.home.worldsEyebrow}>
          <div className="container">
            <HomeWorldCue
              locale={locale}
              activity={worldCueActivity}
              eyebrow={t.home.worldsEyebrow}
              exploreLabel={t.home.worldsExplore}
            />
          </div>
        </section>
      ) : null}

      <section className="section cta-band home-scene home-scene--cta" aria-labelledby="cta-title" data-reveal>
        <div className="container">
          <div className="cta-band__panel">
            <div className="cta-band__atmosphere" aria-hidden>
              <div className="cta-band__glow cta-band__glow--primary" />
              <div className="cta-band__glow cta-band__glow--accent" />
              <div className="cta-band__grid" />
            </div>

            <div className="cta-band__content">
              <p className="cta-band__crew">{t.home.futureLead}</p>
              <h2 id="cta-title">{t.home.ctaTitle}</h2>
            </div>

            <div className="cta-band__actions">
              <TrackedLink
                className="button button--glow cta-band__primary"
                href={localizedPath(locale, '/waitlist')}
                eventName="home_plan_click"
                eventProperties={{ locale, source: 'footer-cta' }}
              >
                {t.home.ctaButton}
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
              </TrackedLink>
              {heroActivity ? (
                <TrackedLink
                  className="cta-band__secondary-link"
                  href={eventPath(locale, heroActivity)}
                  eventName="home_events_click"
                  eventProperties={{ locale, source: 'footer-festival' }}
                >
                  {festivalName}
                  <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
                </TrackedLink>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
