import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventCard } from '../../../../components/EventCard';
import { getActivityImage, getActivityTitle, listActivities } from '../../../../lib/api';
import { eventPath } from '../../../../lib/event-slug';
import {
  cityAlternateLanguages,
  cityDescription,
  cityPath,
  cityTitle,
  findCityGroup,
} from '../../../../lib/seo-cities';
import {
  getMessages,
  isLocale,
  localizedPath,
  type Locale,
} from '../../../../lib/i18n';
import { buildSocialMetadata } from '../../../../lib/seo';
import { getSiteUrl } from '../../../../lib/site';

export const revalidate = 300;

type CityPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

async function getCityPageData(rawLocale: string, slug: string) {
  if (!isLocale(rawLocale)) return null;
  const locale = rawLocale as Locale;
  const activities = await listActivities();
  const group = findCityGroup(activities, locale, slug);
  if (!group) return null;
  return { locale, activities, group };
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const data = await getCityPageData(rawLocale, slug);
  if (!data) return {};

  const title = cityTitle(data.group, data.locale);
  const description = cityDescription(data.group, data.locale);
  const firstActivity = data.group.activities[0];
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}${cityPath(data.locale, data.group.city)}`;
  const languages = firstActivity
    ? Object.fromEntries(
        Object.entries(cityAlternateLanguages(data.activities, firstActivity.legacyId)).map(
          ([language, href]) => [language, `${siteUrl}${href}`],
        ),
      )
    : undefined;
  const image = firstActivity ? getActivityImage(firstActivity) : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages,
    },
    ...buildSocialMetadata({
      title,
      description,
      url,
      locale: data.locale,
      image: image
        ? { url: image, width: 1200, height: 630, alt: title }
        : undefined,
    }),
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { locale: rawLocale, slug } = await params;
  const data = await getCityPageData(rawLocale, slug);
  if (!data) notFound();

  const { locale, group } = data;
  const t = getMessages(locale);
  const title = cityTitle(group, locale);
  const description = cityDescription(group, locale);
  const relatedAreas = [...new Set(group.activities.map((activity) => activity.area).filter(Boolean))];
  const siteUrl = getSiteUrl();
  const cityUrl = `${siteUrl}${cityPath(locale, group.city)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${cityUrl}#collection`,
        url: cityUrl,
        name: title,
        description,
        inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${siteUrl}/#website`,
          name: 'Raven',
          url: siteUrl,
        },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: group.activities.length,
          itemListElement: group.activities.map((activity, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${siteUrl}${eventPath(locale, activity)}`,
            name: getActivityTitle(activity),
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: t.breadcrumbs.home,
            item: `${siteUrl}${localizedPath(locale)}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: t.breadcrumbs.events,
            item: `${siteUrl}${localizedPath(locale, '/events')}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: title,
            item: cityUrl,
          },
        ],
      },
    ],
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <section className="section city-landing">
        <div className="container">
          <div className="section__header city-landing__header">
            <div>
              <div className="eyebrow">{t.city.eyebrow}</div>
              <h1>{title}</h1>
            </div>
            <Link className="button secondary" href={localizedPath(locale, '/events')}>
              {t.city.allEvents}
            </Link>
          </div>

          <p className="lead city-landing__lead">{description}</p>

          <div className="city-landing__stats" aria-label={t.city.overviewLabel}>
            <div>
              <span>{t.city.statsEvents}</span>
              <strong>{group.activities.length}</strong>
            </div>
            <div>
              <span>{t.city.statsRegion}</span>
              <strong>{relatedAreas.join(' / ') || group.area || group.city}</strong>
            </div>
            <div>
              <span>{t.city.statsSignal}</span>
              <strong>{t.city.signalValue}</strong>
            </div>
          </div>

          <div className="event-grid city-landing__grid">
            {group.activities.map((activity, index) => (
              <EventCard
                activity={activity}
                locale={locale}
                priorityImage={index < 3}
                key={activity.legacyId}
              />
            ))}
          </div>

          <div className="city-landing__footer">
            <p>{t.city.allEvents}</p>
            <Link
              className="button"
              href={localizedPath(locale, '/events')}
            >
              {t.nav.festivals}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
