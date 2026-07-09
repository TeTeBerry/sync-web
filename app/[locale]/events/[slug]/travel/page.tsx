import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '../../../../../components/Breadcrumbs';
import { EventLoadError } from '../../../../../components/states/EventLoadError';
import { EventUnavailableState } from '../../../../../components/states/EventUnavailableState';
import { TravelTab } from '../../../../../components/travel/TravelTab';
import { TrackedLink } from '../../../../../components/TrackedLink';
import { getActivity } from '../../../../../lib/api';
import { loadEventPageData } from '../../../../../lib/event-page';
import { buildTravelJsonLd, buildTravelMetadata, travelPageTitle } from '../../../../../lib/seo';
import {
  eventPath,
  eventPlanPath,
  eventTravelPath,
  parseEventLegacyId,
} from '../../../../../lib/event-slug';
import { getSiteUrl } from '../../../../../lib/site';
import {
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  localizedPath,
  type Locale,
} from '../../../../../lib/i18n';

type TravelPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: TravelPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const legacyId = parseEventLegacyId(slug);
  if (!legacyId) return {};

  const activityResult = await getActivity(legacyId);
  if (!activityResult.activity) return {};

  return buildTravelMetadata(activityResult.activity, locale);
}

export default async function EventTravelPage({ params }: TravelPageProps) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const pageData = await loadEventPageData(locale, slug);

  if (pageData === 'error') return <EventLoadError locale={locale} />;
  if (pageData === 'not_found') return <EventUnavailableState locale={locale} />;

  const { activity, eventTitle, djs, travelData } = pageData;
  const siteUrl = getSiteUrl();
  const planHref = eventPlanPath(locale, activity, { from: 'event' });
  const eventHref = eventPath(locale, activity);
  const travelHref = eventTravelPath(locale, activity);
  const subscribeEventProperties = {
    event: String(activity.legacyId),
    sourcePath: travelHref,
    locale,
  };
  const breadcrumbItems = [
    { name: t.breadcrumbs.home, url: `${siteUrl}${localizedPath(locale)}` },
    { name: t.breadcrumbs.events, url: `${siteUrl}${localizedPath(locale, '/events')}` },
    { name: eventTitle, url: `${siteUrl}${eventHref}` },
    { name: t.eventDetail.travel.pageTitle, url: `${siteUrl}${travelHref}` },
  ];
  const jsonLd = buildTravelJsonLd(activity, djs, locale, breadcrumbItems, travelData.faq);
  const pageHeading = travelPageTitle(activity, locale);

  return (
    <main className="detail-page detail-page--sub">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <section className="detail-sub-hero" data-reveal>
        <div className="container">
          <Breadcrumbs
            ariaLabel={t.breadcrumbs.ariaLabel}
            items={[
              { label: t.breadcrumbs.home, href: localizedPath(locale) },
              { label: t.breadcrumbs.events, href: localizedPath(locale, '/events') },
              { label: eventTitle, href: eventHref },
              { label: t.eventDetail.travel.pageTitle },
            ]}
          />
          <header className="detail-sub-hero__header">
            <div>
              <h1 className="detail-sub-hero__title">{pageHeading}</h1>
              <p className="detail-sub-hero__lead">{t.eventDetail.travel.pageLead}</p>
            </div>
            <TrackedLink
              className="button button--compact"
              href={planHref}
              eventName="event_plan_click"
              eventProperties={{ ...subscribeEventProperties, source: 'travel-page' }}
            >
              {t.eventDetail.planCta}
            </TrackedLink>
          </header>
        </div>
      </section>

      <section className="section section--detail-body" data-reveal style={{ '--reveal-delay': '0.08s' } as CSSProperties}>
        <div className="container">
          <TravelTab
            data={travelData}
            planHref={planHref}
            labels={t.eventDetail.travel}
            subscribeEventProperties={subscribeEventProperties}
            embedded
          />
        </div>
      </section>
    </main>
  );
}
