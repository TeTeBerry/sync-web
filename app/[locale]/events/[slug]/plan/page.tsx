import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { PlannerLandingContent } from '../../../../../components/planner/PlannerLandingContent';
import { AiPlannerFlow } from '../../../../../components/planner/AiPlannerFlow';
import { EventLoadError } from '../../../../../components/states/EventLoadError';
import { EventUnavailableState } from '../../../../../components/states/EventUnavailableState';
import {
  fetchActivitySchedule,
  getActivity,
  getActivityImage,
  getActivityTitle,
  getSavedRavenPlan,
} from '../../../../../lib/api';
import {
  eventLineupPath,
  eventPath,
  eventPlanPath,
  eventSlugMatches,
  eventTravelPath,
  parseEventLegacyId,
} from '../../../../../lib/event-slug';
import { getFestivalAtmosphere } from '../../../../../lib/festival-atmosphere';
import { buildPlannerLandingData } from '../../../../../lib/planner-landing';
import { resolveJourneyEntryFrom } from '../../../../../lib/planner-journey';
import { buildPlannerJsonLd, buildPlannerMetadata } from '../../../../../lib/seo';
import { getSiteUrl } from '../../../../../lib/site';
import {
  activityMetaForLocale,
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  localizeActivity,
  localizedPath,
  type Locale,
} from '../../../../../lib/i18n';

type PlannerPageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ tab?: string; from?: string; guideId?: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PlannerPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const legacyId = parseEventLegacyId(slug);
  if (!legacyId) return {};

  const activityResult = await getActivity(legacyId);
  if (!activityResult.activity) return {};

  const activity = localizeActivity(activityResult.activity, locale);
  return buildPlannerMetadata(activity, locale);
}

export default async function AiPlannerPage({ params, searchParams }: PlannerPageProps) {
  const { locale: rawLocale, slug } = await params;
  const resolvedSearch = await searchParams;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const legacyId = parseEventLegacyId(slug);
  if (!legacyId) notFound();

  const activityResult = await getActivity(legacyId);

  if (activityResult.status === 'error') {
    return <EventLoadError locale={locale} />;
  }

  if (activityResult.status === 'not_found' || !activityResult.activity) {
    return <EventUnavailableState locale={locale} />;
  }

  const rawActivity = activityResult.activity;
  const activity = localizeActivity(rawActivity, locale);

  if (!eventSlugMatches(slug, rawActivity, locale)) {
    permanentRedirect(eventPlanPath(locale, activity));
  }

  const scheduleResult = await fetchActivitySchedule(activity.legacyId);
  const schedule = scheduleResult.schedule;
  const djs = schedule?.djs ?? [];
  const performances = schedule?.performances ?? [];

  const eventTitle = getActivityTitle(activity);
  const activityImage = getActivityImage(activity);
  const metaLine = activityMetaForLocale(activity, locale);
  const [metaDate, ...metaLocationParts] = metaLine.split(' · ');
  const metaLocation = metaLocationParts.join(' · ');
  const detailPath = eventPath(locale, activity);
  const lineupHref = eventLineupPath(locale, activity);
  const travelHref = eventTravelPath(locale, activity);
  const waitlistHref = `${localizedPath(locale, '/waitlist')}?event=${encodeURIComponent(eventTitle)}`;
  const landing = buildPlannerLandingData(activity, djs, performances, locale);
  const atmosphere = getFestivalAtmosphere(activity, landing.lineupIntel.genres[0]);
  const siteUrl = getSiteUrl();
  const entryFrom = resolveJourneyEntryFrom(resolvedSearch);
  const savedPlan = resolvedSearch.guideId ? await getSavedRavenPlan(resolvedSearch.guideId).catch(() => null) : null;
  const initialRemotePlan = savedPlan?.activityLegacyId === activity.legacyId ? savedPlan.plan : null;

  const breadcrumbItems = [
    { name: t.breadcrumbs.home, url: `${siteUrl}${localizedPath(locale)}` },
    { name: t.breadcrumbs.events, url: `${siteUrl}${localizedPath(locale, '/events')}` },
    { name: eventTitle, url: `${siteUrl}${detailPath}` },
    { name: t.aiPlanner.breadcrumb, url: `${siteUrl}${eventPlanPath(locale, activity)}` },
  ];

  const jsonLd = buildPlannerJsonLd(activity, djs, locale, breadcrumbItems, landing.faq);

  return (
    <main className="plan-page plan-page--journey" data-atmosphere={atmosphere}>
      <PlannerLandingContent
        locale={locale}
        eventTitle={eventTitle}
        metaDate={metaDate ?? ''}
        metaLocation={metaLocation}
        image={activityImage}
        landing={landing}
        detailHref={detailPath}
        lineupHref={lineupHref}
        travelHref={travelHref}
        legacyId={activity.legacyId}
        entryFrom={entryFrom}
        djs={djs}
        performances={performances}
      />

      <section
        id="planner-form"
        className="section section--plan"
        tabIndex={-1}
        aria-label={t.aiPlanner.landing.plannerSection}
      >
        <div className="container container--plan">
          <div className="plan-page__composer">
            <AiPlannerFlow
              locale={locale}
              activity={activity}
              eventTitle={eventTitle}
              metaDate={metaDate ?? ''}
              metaLocation={metaLocation}
              djs={djs}
              performances={performances}
              eventPath={detailPath}
              image={activityImage}
              waitlistHref={waitlistHref}
              hideHeader
              initialRemotePlan={initialRemotePlan}
            />
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
    </main>
  );
}
