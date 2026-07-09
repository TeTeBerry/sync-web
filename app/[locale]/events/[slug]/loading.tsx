import type { CSSProperties } from 'react';
import { EventCardSkeleton } from '../../../../components/states/EventCardSkeleton';
import { Skeleton } from '../../../../components/states/Skeleton';
import { getMessages, resolveLoadingLocale, type Locale } from '../../../../lib/i18n';

type EventDetailLoadingProps = {
  locale: Locale;
};

export function EventDetailLoading({ locale }: EventDetailLoadingProps) {
  const t = getMessages(locale);

  return (
    <main className="detail-page detail-page--experience" aria-busy="true" aria-label={t.states.loadingEvent}>
      <section className="detail-hero detail-hero--scene page-loading__section">
        <div className="detail-hero__stage detail-hero-skeleton">
          <div className="detail-hero-skeleton__shimmer" aria-hidden="true" />
          <div className="container detail-hero__frame">
            <div className="detail-hero__body">
              <Skeleton style={{ width: 140, height: 14 }} rounded="full" />
              <Skeleton style={{ width: 'min(100%, 420px)', height: 56 }} delay={1} rounded="md" />
              <Skeleton style={{ width: 'min(100%, 320px)', height: 20 }} delay={1} />
              <div className="detail-hero-skeleton__meta">
                <Skeleton style={{ width: 120, height: 16 }} delay={2} />
                <Skeleton style={{ width: 180, height: 16 }} delay={2} />
              </div>
              <div className="detail-hero-skeleton__actions">
                <Skeleton style={{ width: 132, height: 44 }} delay={3} rounded="md" />
                <Skeleton style={{ width: 112, height: 44 }} delay={3} rounded="md" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="detail-story page-loading__section" style={{ animationDelay: '0.05s' }}>
        <div className="container">
          <Skeleton style={{ width: 120, height: 14, marginBottom: 16 }} />
          <Skeleton style={{ width: 'min(100%, 360px)', height: 36, marginBottom: 16 }} delay={1} />
          <Skeleton style={{ width: 'min(100%, 480px)', height: 22 }} delay={1} />
        </div>
      </section>

      <section className="detail-lineup page-loading__section" style={{ animationDelay: '0.1s' }}>
        <div className="container">
          <Skeleton style={{ width: 160, height: 14, marginBottom: 14 }} />
          <Skeleton style={{ width: 'min(100%, 420px)', height: 40, marginBottom: 28 }} delay={1} />
          <Skeleton style={{ width: 'min(100%, 280px)', height: 56, marginBottom: 24 }} delay={2} rounded="md" />
          <div className="lineup-preview-skeleton">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="lineup-preview-skeleton__card" delay={index as 0 | 1 | 2 | 3} rounded="lg" />
            ))}
          </div>
        </div>
      </section>

      <section className="detail-plan-cta page-loading__section" style={{ animationDelay: '0.16s' }}>
        <div className="container">
          <Skeleton className="planner-promo-skeleton" delay={2} rounded="lg" />
        </div>
      </section>

      <section className="section section--detail-related page-loading__section" style={{ animationDelay: '0.2s' }}>
        <div className="container">
          <Skeleton style={{ width: 180, height: 28, marginBottom: 24 }} />
          <div className="event-grid">
            {[0, 1, 2].map((index) => (
              <EventCardSkeleton
                key={index}
                delay={index as 0 | 1 | 2}
                style={{ '--card-index': index } as CSSProperties}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function EventDetailRouteLoading({
  params,
}: {
  params?: Promise<{ locale: string; slug?: string }>;
}) {
  const locale = await resolveLoadingLocale(params);
  return <EventDetailLoading locale={locale} />;
}
