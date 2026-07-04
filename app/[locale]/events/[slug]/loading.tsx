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
    <main className="detail-page" aria-busy="true" aria-label={t.states.loadingEvent}>
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

      <section className="section section--detail-tight page-loading__section" style={{ animationDelay: '0.08s' }}>
        <div className="container">
          <div className="event-ai-summary-skeleton">
            <div className="event-ai-summary-skeleton__header">
              <div>
                <Skeleton style={{ width: 72, height: 22 }} rounded="full" />
                <Skeleton style={{ width: 220, height: 28, marginTop: 12 }} delay={1} />
                <Skeleton style={{ width: 280, height: 14, marginTop: 10 }} delay={2} />
              </div>
              <Skeleton style={{ width: 112, height: 40 }} delay={2} rounded="md" />
            </div>
            <div className="event-ai-summary-skeleton__grid">
              {[0, 1, 2, 3].map((index) => (
                <div className="event-ai-summary-skeleton__card" key={index}>
                  <Skeleton style={{ width: 64, height: 12 }} delay={index as 0 | 1 | 2 | 3} />
                  <Skeleton style={{ width: '100%', height: 14 }} delay={index as 0 | 1 | 2 | 3} />
                  <Skeleton style={{ width: '82%', height: 14 }} delay={index as 0 | 1 | 2 | 3} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--detail-body page-loading__section" style={{ animationDelay: '0.12s' }}>
        <div className="container detail-layout detail-layout--lineup">
          <article className="detail-lineup">
            <header className="detail-lineup__header">
              <div>
                <Skeleton style={{ width: 160, height: 28 }} />
                <Skeleton style={{ width: 280, height: 14, marginTop: 10 }} delay={1} />
              </div>
              <Skeleton style={{ width: 140, height: 16 }} delay={2} />
            </header>

            {[0, 1].map((groupIndex) => (
              <div className="lineup-section-skeleton" key={groupIndex}>
                <Skeleton style={{ width: 120, height: 18 }} delay={groupIndex as 0 | 1} />
                <div className="lineup-genre-grid">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <div className="artist-card-skeleton" key={index}>
                      <Skeleton className="artist-card-skeleton__bar" delay={index as 0 | 1 | 2 | 3 | 4 | 5} rounded="sm" />
                      <div className="artist-card-skeleton__copy">
                        <Skeleton style={{ width: '72%', height: 14 }} delay={index as 0 | 1 | 2 | 3 | 4 | 5} />
                        <Skeleton style={{ width: '48%', height: 12 }} delay={index as 0 | 1 | 2 | 3 | 4 | 5} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </article>

          <aside className="detail-rail">
            <div className="detail-panel-skeleton">
              <Skeleton style={{ width: 120, height: 20 }} />
              <Skeleton style={{ width: '100%', height: 14 }} delay={1} />
              <Skeleton style={{ width: '92%', height: 14 }} delay={1} />
              {[0, 1, 2].map((index) => (
                <div className="detail-panel-skeleton__row" key={index}>
                  <Skeleton style={{ width: 72, height: 14 }} delay={index as 0 | 1 | 2} />
                  <Skeleton style={{ width: 96, height: 14 }} delay={index as 0 | 1 | 2} />
                </div>
              ))}
            </div>
            <div className="detail-cta-card-skeleton">
              <Skeleton style={{ width: 160, height: 20 }} />
              <Skeleton style={{ width: '100%', height: 14 }} delay={1} />
              <Skeleton style={{ width: '100%', height: 44 }} delay={2} rounded="md" />
            </div>
          </aside>
        </div>
      </section>

      <section className="section section--detail-related page-loading__section" style={{ animationDelay: '0.16s' }}>
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
