import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventCard } from '../../../components/EventCard';
import { listActivities } from '../../../lib/api';
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
    city?: string;
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
  const activities = localizeActivities(await listActivities(), locale);
  const query = queryParams.q?.trim().toLowerCase() ?? '';
  const city = queryParams.city?.trim() ?? '';

  const cities = [...new Set(activities.map((item) => item.city).filter(Boolean))] as string[];
  const filtered = activities.filter((activity) => {
    const text = [activity.name, activity.title, activity.location, activity.city, activity.area, activity.code]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesQuery = query ? text.includes(query) : true;
    const matchesCity = city ? activity.city === city : true;
    return matchesQuery && matchesCity;
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
            <select name="city" defaultValue={city}>
              <option value="">{t.events.allCities}</option>
              {cities.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
            <button className="button" type="submit">
              {t.events.search}
            </button>
          </form>

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
