import type { Metadata } from 'next';
import Link from 'next/link';
import { EventCard } from '../../components/EventCard';
import { listActivities } from '../../lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '活动列表',
  description: '浏览 SYNC Web MVP 收录的电音节活动、城市与阵容信息。',
};

type EventsPageProps = {
  searchParams?: Promise<{
    q?: string;
    city?: string;
    status?: string;
  }>;
};

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = (await searchParams) ?? {};
  const activities = await listActivities();
  const query = params.q?.trim().toLowerCase() ?? '';
  const city = params.city?.trim() ?? '';

  const cities = [...new Set(activities.map((item) => item.city).filter(Boolean))] as string[];
  const filtered = activities.filter((activity) => {
    const text = [activity.name, activity.title, activity.location, activity.city, activity.code]
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
              <h1>查活动</h1>
            </div>

          </div>

          <form className="filter-bar" action="/events">
            <input name="q" placeholder="搜索活动、城市、阵容关键词" defaultValue={params.q ?? ''} />
            <select name="city" defaultValue={city}>
              <option value="">全部城市</option>
              {cities.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
            <button className="button" type="submit">
              搜索
            </button>
          </form>

          <div className="event-grid">
            {filtered.map((activity) => (
              <EventCard activity={activity} key={activity.legacyId} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
