import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Breadcrumbs } from '../../../../../components/Breadcrumbs';
import { AiPlannerFlow } from '../../../../../components/planner/AiPlannerFlow';
import { EventLoadError } from '../../../../../components/states/EventLoadError';
import { EventUnavailableState } from '../../../../../components/states/EventUnavailableState';
import {
  fetchActivitySchedule,
  getActivity,
  getActivityTitle,
} from '../../../../../lib/api';
import {
  eventPath,
  eventPlanPath,
  eventSlugMatches,
  parseEventLegacyId,
} from '../../../../../lib/event-slug';
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
  const t = getMessages(locale);
  const title = getActivityTitle(activity);

  return {
    title: `${title} — ${t.aiPlanner.pageTitleSuffix}`,
    description: t.eventDetail.fallbackDescription,
  };
}

export default async function AiPlannerPage({ params }: PlannerPageProps) {
  const { locale: rawLocale, slug } = await params;
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
  const metaLine = activityMetaForLocale(activity, locale);
  const [metaDate, ...metaLocationParts] = metaLine.split(' · ');
  const metaLocation = metaLocationParts.join(' · ');
  const detailPath = eventPath(locale, activity);
  const waitlistHref = `${localizedPath(locale, '/waitlist')}?event=${encodeURIComponent(eventTitle)}`;
  const siteUrl = getSiteUrl();

  return (
    <main className="plan-page">
      <section className="plan-page__intro">
        <div className="container container--plan">
          <Breadcrumbs
            ariaLabel={t.breadcrumbs.ariaLabel}
            items={[
              { label: t.breadcrumbs.home, href: localizedPath(locale) },
              { label: t.breadcrumbs.events, href: localizedPath(locale, '/events') },
              { label: eventTitle, href: detailPath },
              { label: t.aiPlanner.breadcrumb },
            ]}
          />
        </div>
      </section>

      <section className="section section--plan">
        <div className="container container--plan">
          <AiPlannerFlow
            locale={locale}
            activity={activity}
            eventTitle={eventTitle}
            metaDate={metaDate ?? ''}
            metaLocation={metaLocation}
            djs={djs}
            performances={performances}
            eventPath={detailPath}
            waitlistHref={waitlistHref}
          />
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: `${eventTitle} — ${t.aiPlanner.pageTitleSuffix}`,
            url: `${siteUrl}${eventPlanPath(locale, activity)}`,
            isPartOf: {
              '@type': 'WebSite',
              name: 'Raven',
              url: siteUrl,
            },
          }).replace(/</g, '\\u003c'),
        }}
      />
    </main>
  );
}
