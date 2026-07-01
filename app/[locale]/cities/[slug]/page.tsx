import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventCard } from '../../../../components/EventCard';
import { listActivities } from '../../../../lib/api';
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

export const dynamic = 'force-dynamic';

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

  return {
    title,
    description,
    alternates: {
      canonical: cityPath(data.locale, data.group.city),
      languages: firstActivity
        ? cityAlternateLanguages(data.activities, firstActivity.legacyId)
        : undefined,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: cityPath(data.locale, data.group.city),
    },
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

  return (
    <main>
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
            {group.activities.map((activity) => (
              <EventCard activity={activity} locale={locale} key={activity.legacyId} />
            ))}
          </div>

          <div className="city-landing__footer">
            <p>{t.city.waitlistPrompt}</p>
            <Link
              className="button"
              href={`${localizedPath(locale, '/waitlist')}?event=${encodeURIComponent(group.city)}`}
            >
              {t.nav.waitlist}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
