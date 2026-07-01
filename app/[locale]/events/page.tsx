import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CountrySelect } from '../../../components/CountrySelect';
import { EventCard } from '../../../components/EventCard';
import { listActivities } from '../../../lib/api';
import { listCityGroups, cityPath } from '../../../lib/seo-cities';
import {
  alternateLanguages,
  getMessages,
  isLocale,
  localizeActivities,
  localizedPath,
  type Locale,
} from '../../../lib/i18n';

export const dynamic = 'force-dynamic';

type EventsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    q?: string;
    country?: string;
    status?: string;
  }>;
};

export async function generateMetadata({ params }: EventsPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : 'zh';
  const t = getMessages(locale);
  return {
    title: t.events.title,
    description: t.events.description,
    alternates: {
      canonical: localizedPath(locale, '/events'),
      languages: alternateLanguages('/events'),
    },
  };
}

export default async function EventsPage({ params: routeParams, searchParams }: EventsPageProps) {
  const { locale: rawLocale } = await routeParams;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const queryParams = (await searchParams) ?? {};
  const rawActivities = await listActivities();
  const activities = localizeActivities(rawActivities, locale);
  const query = queryParams.q?.trim().toLowerCase() ?? '';
  const country = queryParams.country?.trim() ?? '';
  const cityGroups = listCityGroups(rawActivities, locale).slice(0, 12);

  const countries = [...new Set(activities.map((item) => item.area).filter(Boolean))] as string[];
  const filtered = activities.filter((activity) => {
    const text = [activity.name, activity.title, activity.location, activity.city, activity.area, activity.code]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesQuery = query ? text.includes(query) : true;
    const matchesCountry = country ? activity.area === country : true;
    return matchesQuery && matchesCountry;
  });

  return (
    <main>
      <section className="section">
        <div className="container">
          <div className="section__header">
            <div>
              <div className="eyebrow">Event Catalog</div>
              <h1>{t.events.heading}</h1>
            </div>

          </div>

          <form className="filter-bar" action={localizedPath(locale, '/events')}>
            <input name="q" placeholder={t.events.searchPlaceholder} defaultValue={queryParams.q ?? ''} />
            <CountrySelect
              name="country"
              value={country}
              options={countries}
              placeholder={t.events.allCountries}
            />
            <button className="button" type="submit">
              {t.events.search}
            </button>
          </form>

          {cityGroups.length > 0 && (
            <div className="city-link-strip" aria-label={t.events.cityLinksTitle}>
              <span>{t.events.cityLinksTitle}</span>
              <div>
                {cityGroups.map((group) => (
                  <Link href={cityPath(locale, group.city)} key={group.slug}>
                    {group.city}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="event-grid">
            {filtered.map((activity) => (
              <EventCard activity={activity} locale={locale} key={activity.legacyId} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
