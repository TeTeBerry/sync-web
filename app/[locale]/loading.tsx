import { Skeleton } from '../../components/states/Skeleton';
import { AiPlannerSkeleton } from '../../components/states/AiPlannerSkeleton';
import { PopularEventsSkeleton } from '../../components/states/PopularEventsSkeleton';
import { getMessages, resolveLoadingLocale, type Locale } from '../../lib/i18n';

type HomeLoadingProps = {
  locale: Locale;
};

export function HomeLoading({ locale }: HomeLoadingProps) {
  const t = getMessages(locale);

  return (
    <main className="home" aria-busy="true" aria-label={t.states.loadingHome}>
      <section className="ai-hero ai-hero--split page-loading__section">
        <div className="ai-hero__atmosphere" aria-hidden="true">
          <div className="ai-hero__mesh" />
          <div className="ai-hero__glow ai-hero__glow--warm" />
          <div className="ai-hero__glow ai-hero__glow--cool" />
        </div>

        <div className="container ai-hero__grid">
          <div className="ai-hero__copy">
            <Skeleton style={{ width: 96, height: 28 }} rounded="full" />
            <div className="page-loading__hero-title">
              <Skeleton style={{ width: 'min(100%, 280px)', height: 42 }} rounded="md" />
              <Skeleton style={{ width: 'min(100%, 220px)', height: 42 }} delay={1} rounded="md" />
            </div>
            <Skeleton style={{ width: 'min(100%, 420px)', height: 18 }} delay={2} />
            <Skeleton style={{ width: 'min(100%, 360px)', height: 18 }} delay={2} />
            <div className="page-loading__hero-ctas">
              <Skeleton style={{ width: 132, height: 44 }} delay={3} rounded="md" />
              <Skeleton style={{ width: 124, height: 44 }} delay={3} rounded="md" />
            </div>
          </div>

          <div className="page-loading__phone">
            <Skeleton style={{ width: 'min(100%, 280px)', height: 520 }} delay={2} rounded="xl" />
          </div>
        </div>
      </section>

      <section className="section how-section page-loading__section" style={{ animationDelay: '0.06s' }}>
        <div className="container">
          <div className="section__header section__header--center">
            <Skeleton style={{ width: 120, height: 12, margin: '0 auto' }} rounded="sm" />
            <Skeleton style={{ width: 'min(100%, 240px)', height: 32, margin: '12px auto 0' }} delay={1} />
            <Skeleton style={{ width: 'min(100%, 360px)', height: 16, margin: '12px auto 0' }} delay={2} />
          </div>
          <ol className="how-steps">
            {[0, 1, 2].map((index) => (
              <li className="how-step page-loading__step" key={index}>
                <Skeleton style={{ width: 28, height: 14 }} delay={index as 0 | 1 | 2} />
                <Skeleton style={{ width: '72%', height: 18 }} delay={index as 0 | 1 | 2} />
                <Skeleton style={{ width: '100%', height: 14 }} delay={index as 0 | 1 | 2} />
                <Skeleton style={{ width: '88%', height: 14 }} delay={index as 0 | 1 | 2} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section ai-planner-section page-loading__section" style={{ animationDelay: '0.1s' }}>
        <div className="container">
          <div className="section__header section__header--center">
            <Skeleton style={{ width: 'min(100%, 220px)', height: 32, margin: '0 auto' }} />
            <Skeleton style={{ width: 'min(100%, 320px)', height: 16, margin: '12px auto 0' }} delay={1} />
          </div>
          <AiPlannerSkeleton thinkingLabel={t.states.aiThinking} />
        </div>
      </section>

      <section className="section capabilities-section page-loading__section" style={{ animationDelay: '0.14s' }}>
        <div className="container capabilities-layout">
          <div className="capabilities-layout__intro">
            <Skeleton style={{ width: 'min(100%, 240px)', height: 32 }} />
            <Skeleton style={{ width: 'min(100%, 320px)', height: 16, marginTop: 12 }} delay={1} />
          </div>
          <div className="capability-rail">
            {[0, 1, 2, 3].map((index) => (
              <article className="capability-rail__item page-loading__step" key={index}>
                <Skeleton style={{ width: 36, height: 36 }} delay={index as 0 | 1 | 2 | 3} rounded="md" />
                <Skeleton style={{ width: '70%', height: 16 }} delay={index as 0 | 1 | 2 | 3} />
                <Skeleton style={{ width: '100%', height: 14 }} delay={index as 0 | 1 | 2 | 3} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section popular-events page-loading__section" style={{ animationDelay: '0.18s' }}>
        <div className="container">
          <div className="section__header section__header--split">
            <div>
              <Skeleton style={{ width: 180, height: 32 }} />
              <Skeleton style={{ width: 280, height: 16, marginTop: 12 }} delay={1} />
            </div>
            <Skeleton style={{ width: 96, height: 16 }} delay={2} />
          </div>
          <PopularEventsSkeleton />
        </div>
      </section>
    </main>
  );
}

export default async function LocaleHomeLoading({
  params,
}: {
  params?: Promise<{ locale: string }>;
}) {
  const locale = await resolveLoadingLocale(params);
  return <HomeLoading locale={locale} />;
}
