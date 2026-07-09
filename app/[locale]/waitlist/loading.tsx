import { Skeleton } from '../../../components/states/Skeleton';
import { getMessages, resolveLoadingLocale, type Locale } from '../../../lib/i18n';

type WaitlistLoadingProps = {
  locale: Locale;
};

export function WaitlistLoading({ locale }: WaitlistLoadingProps) {
  const t = getMessages(locale);

  return (
    <main className="waitlist-page" aria-busy="true" aria-label={t.states.loadingWaitlist}>
      <section className="ai-hero ai-hero--statement waitlist-hero home-hero page-loading__section">
        <div className="ai-hero__atmosphere" aria-hidden="true">
          <div className="ai-hero__mesh" />
          <div className="ai-hero__glow ai-hero__glow--warm" />
          <div className="ai-hero__glow ai-hero__glow--cool" />
          <div className="ai-hero__spotlight" />
        </div>

        <div className="container ai-hero__grid">
          <div className="ai-hero__copy waitlist-hero__copy">
            <Skeleton style={{ width: 120, height: 28 }} rounded="md" />
            <div className="page-loading__hero-title">
              <Skeleton style={{ width: 'min(100%, 320px)', height: 48 }} rounded="md" />
              <Skeleton style={{ width: 'min(100%, 260px)', height: 48 }} delay={1} rounded="md" />
            </div>
            <Skeleton style={{ width: 'min(100%, 360px)', height: 18 }} delay={2} />
            <Skeleton style={{ width: 'min(100%, 220px)', height: 16 }} delay={2} />
            <div style={{ display: 'flex', gap: 16, marginTop: 28 }}>
              <Skeleton style={{ width: 148, height: 48 }} delay={3} rounded="md" />
              <Skeleton style={{ width: 120, height: 20, alignSelf: 'center' }} delay={3} />
            </div>
          </div>
        </div>
      </section>

      <section className="section waitlist-scene waitlist-scene--moments page-loading__section">
        <div className="container">
          <div className="waitlist-moments-skeleton">
            <div className="waitlist-moments-skeleton__intro">
              <Skeleton style={{ width: 'min(100%, 280px)', height: 36 }} rounded="md" />
            </div>
            <div className="waitlist-moments-skeleton__list">
              {[0, 1, 2].map((index) => (
                <div className="waitlist-moments-skeleton__item" key={index}>
                  <Skeleton style={{ width: 'min(100%, 260px)', height: 28 }} delay={index as 0 | 1 | 2} />
                  <Skeleton
                    style={{ width: '100%', height: 16, marginTop: 12 }}
                    delay={index as 0 | 1 | 2}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section waitlist-scene waitlist-scene--join page-loading__section">
        <div className="container">
          <div className="waitlist-join-skeleton">
            <Skeleton style={{ width: 220, height: 32 }} rounded="md" />
            <Skeleton style={{ width: 260, height: 16 }} delay={1} />
            <Skeleton style={{ width: '100%', height: 48 }} delay={2} rounded="md" />
            <Skeleton style={{ width: '100%', height: 52 }} delay={3} rounded="md" />
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
