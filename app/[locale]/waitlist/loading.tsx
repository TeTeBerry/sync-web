import { Skeleton } from '../../../components/states/Skeleton';
import { getMessages, resolveLoadingLocale, type Locale } from '../../../lib/i18n';

type WaitlistLoadingProps = {
  locale: Locale;
};

export function WaitlistLoading({ locale }: WaitlistLoadingProps) {
  const t = getMessages(locale);

  return (
    <main className="waitlist-page" aria-busy="true" aria-label={t.states.loadingWaitlist}>
      <section className="waitlist-hero ai-hero ai-hero--split page-loading__section">
        <div className="ai-hero__atmosphere" aria-hidden="true">
          <div className="ai-hero__mesh" />
          <div className="ai-hero__glow ai-hero__glow--warm" />
          <div className="ai-hero__glow ai-hero__glow--cool" />
        </div>

        <div className="container ai-hero__grid waitlist-hero__grid">
          <div className="waitlist-hero__copy">
            <Skeleton style={{ width: 96, height: 28 }} rounded="full" />
            <div className="page-loading__hero-title">
              <Skeleton style={{ width: 'min(100%, 280px)', height: 42 }} rounded="md" />
              <Skeleton style={{ width: 'min(100%, 240px)', height: 42 }} delay={1} rounded="md" />
            </div>
            <Skeleton style={{ width: 'min(100%, 400px)', height: 18 }} delay={2} />
            <Skeleton style={{ width: 'min(100%, 340px)', height: 18 }} delay={2} />

            <div className="waitlist-benefits-skeleton">
              {[0, 1, 2].map((index) => (
                <div className="waitlist-benefits-skeleton__item" key={index}>
                  <Skeleton style={{ width: 8, height: 8, marginTop: 6 }} delay={index as 0 | 1 | 2} rounded="full" />
                  <div>
                    <Skeleton style={{ width: 140, height: 16 }} delay={index as 0 | 1 | 2} />
                    <Skeleton style={{ width: '100%', height: 14, marginTop: 8 }} delay={index as 0 | 1 | 2} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="waitlist-hero__panel">
            <div className="waitlist-card-skeleton page-loading__section" style={{ animationDelay: '0.08s' }}>
              <Skeleton style={{ width: '100%', height: 120 }} rounded="xl" />
            </div>

            <div className="waitlist-panel-skeleton page-loading__section" style={{ animationDelay: '0.12s' }}>
              <Skeleton style={{ width: 160, height: 24 }} />
              <Skeleton style={{ width: '100%', height: 14 }} delay={1} />
              <Skeleton style={{ width: '100%', height: 48 }} delay={2} rounded="md" />
              <Skeleton style={{ width: '100%', height: 48 }} delay={3} rounded="md" />
              <Skeleton style={{ width: '100%', height: 48 }} delay={4} rounded="md" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function WaitlistRouteLoading({
  params,
}: {
  params?: Promise<{ locale: string }>;
}) {
  const locale = await resolveLoadingLocale(params);
  return <WaitlistLoading locale={locale} />;
}
