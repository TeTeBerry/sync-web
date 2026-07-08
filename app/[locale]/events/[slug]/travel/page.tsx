import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '../../../../../components/Breadcrumbs';
import { EventLoadError } from '../../../../../components/states/EventLoadError';
import { EventUnavailableState } from '../../../../../components/states/EventUnavailableState';
import { TravelTab } from '../../../../../components/travel/TravelTab';
import { TrackedLink } from '../../../../../components/TrackedLink';
import { getActivity, getActivityTitle } from '../../../../../lib/api';
import { loadEventPageData } from '../../../../../lib/event-page';
import { buildFaqJsonLd } from '../../../../../lib/seo';
import {
  eventPath,
  eventPlanPath,
  eventTravelPath,
  parseEventLegacyId,
} from '../../../../../lib/event-slug';
import {
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  localizeActivity,
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

  const activity = localizeActivity(activityResult.activity, locale);
  const t = getMessages(locale);
  const title = getActivityTitle(activity);

  return {
    title: `${title} — ${t.eventDetail.travel.pageTitle} | Raven`,
    description: t.eventDetail.travel.pageLead,
  };
}

export default async function EventTravelPage({ params }: TravelPageProps) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const pageData = await loadEventPageData(locale, slug);

  if (pageData === 'error') return <EventLoadError locale={locale} />;
  if (pageData === 'not_found') return <EventUnavailableState locale={locale} />;

  const { activity, eventTitle, travelData } = pageData;
  const planHref = eventPlanPath(locale, activity);
  const eventHref = eventPath(locale, activity);
  const subscribeEventProperties = {
    event: String(activity.legacyId),
    sourcePath: eventTravelPath(locale, activity),
    locale,
  };
  const faqJsonLd = buildFaqJsonLd(travelData.faq);

  return (
    <main className="detail-page detail-page--sub">
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [faqJsonLd],
            }).replace(/</g, '\\u003c'),
          }}
        />
      ) : null}

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
              <h1 className="detail-sub-hero__title">{t.eventDetail.travel.pageTitle}</h1>
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
