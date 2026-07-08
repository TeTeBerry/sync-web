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
    <main className="detail-page detail-page--journey" aria-busy="true" aria-label={t.states.loadingEvent}>
      <section className="detail-hero page-loading__section">
        <div className="container">
          <div className="detail-hero__media detail-hero-skeleton">
            <div className="detail-hero-skeleton__shimmer" aria-hidden="true" />
            <div className="detail-hero__body">
              <div className="detail-hero-skeleton__tags">
                <Skeleton style={{ width: 88, height: 26 }} rounded="full" />
                <Skeleton style={{ width: 64, height: 26 }} delay={1} rounded="full" />
              </div>
              <Skeleton style={{ width: 'min(100%, 520px)', height: 48 }} delay={1} rounded="md" />
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

      <div className="detail-journey">
        <section className="section section--detail-tight page-loading__section" style={{ animationDelay: '0.08s' }}>
          <div className="container">
            <Skeleton style={{ width: 200, height: 28, marginBottom: 20 }} />
            <div className="festival-snapshot-skeleton">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="festival-snapshot-skeleton__card" delay={index as 0 | 1 | 2 | 3} rounded="lg" />
              ))}
            </div>
          </div>
        </section>

        <section className="section section--detail-block page-loading__section" style={{ animationDelay: '0.12s' }}>
          <div className="container">
            <Skeleton style={{ width: 120, height: 28, marginBottom: 12 }} />
            <Skeleton style={{ width: 'min(100%, 420px)', height: 16, marginBottom: 20 }} delay={1} />
            <div className="lineup-preview-skeleton">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <Skeleton key={index} className="lineup-preview-skeleton__card" delay={index as 0 | 1 | 2 | 3 | 4 | 5} rounded="lg" />
              ))}
            </div>
          </div>
        </section>

        <section className="section section--detail-block page-loading__section" style={{ animationDelay: '0.16s' }}>
          <div className="container">
            <Skeleton className="planner-promo-skeleton" delay={2} rounded="lg" />
          </div>
        </section>
      </div>

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
