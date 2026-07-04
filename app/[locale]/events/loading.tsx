import type { CSSProperties } from 'react';
import { EventCardSkeleton } from '../../../components/states/EventCardSkeleton';
import { Skeleton } from '../../../components/states/Skeleton';
import { getMessages, resolveLoadingLocale, type Locale } from '../../../lib/i18n';

type EventsLoadingProps = {
  locale: Locale;
};

export function EventsLoading({ locale }: EventsLoadingProps) {
  const t = getMessages(locale);

  return (
    <main className="events-page" aria-busy="true" aria-label={t.states.loadingEvents}>
      <section className="events-hero page-loading__section">
        <div className="ai-hero__atmosphere" aria-hidden="true">
          <div className="ai-hero__glow ai-hero__glow--warm" />
          <div className="ai-hero__glow ai-hero__glow--cool" />
        </div>
        <div className="container events-hero__inner">
          <div className="events-hero__copy">
            <Skeleton style={{ width: 'min(100%, 220px)', height: 44 }} rounded="md" />
            <Skeleton style={{ width: 'min(100%, 380px)', height: 18 }} delay={1} />
          </div>
          <div className="events-hero__stat stat-card page-loading__stat">
            <Skeleton style={{ width: 48, height: 32 }} delay={2} />
            <Skeleton style={{ width: 72, height: 14 }} delay={2} />
          </div>
        </div>
      </section>

      <section className="events-discovery">
        <div className="container">
          <div className="page-loading__toolbar-row page-loading__section" style={{ animationDelay: '0.06s' }}>
            <Skeleton style={{ flex: '1 1 280px', height: 52 }} rounded="lg" />
            <Skeleton style={{ width: 220, height: 52 }} delay={1} rounded="lg" />
          </div>

          <div className="page-loading__city-pills page-loading__section" style={{ animationDelay: '0.1s' }}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Skeleton
                key={index}
                style={{ width: index % 2 === 0 ? 72 : 88, height: 32 }}
                delay={index as 0 | 1 | 2 | 3 | 4 | 5}
                rounded="full"
              />
            ))}
          </div>

          <div className="events-grid page-loading__section" style={{ animationDelay: '0.14s' }}>
            <EventCardSkeleton featured style={{ '--card-index': 0 } as CSSProperties} />
            {[1, 2, 3, 4, 5].map((index) => (
              <EventCardSkeleton
                key={index}
                delay={(index % 5) as 0 | 1 | 2 | 3 | 4 | 5}
                style={{ '--card-index': index } as CSSProperties}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function EventsRouteLoading({
  params,
}: {
  params?: Promise<{ locale: string }>;
}) {
  const locale = await resolveLoadingLocale(params);
  return <EventsLoading locale={locale} />;
}
