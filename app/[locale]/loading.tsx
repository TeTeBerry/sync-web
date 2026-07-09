import { Skeleton } from '../../components/states/Skeleton';
import { AiPlannerSkeleton } from '../../components/states/AiPlannerSkeleton';
import { getMessages, resolveLoadingLocale, type Locale } from '../../lib/i18n';

type HomeLoadingProps = {
  locale: Locale;
};

export function HomeLoading({ locale }: HomeLoadingProps) {
  const t = getMessages(locale);

  return (
    <main className="home" aria-busy="true" aria-label={t.states.loadingHome}>
      <section className="ai-hero ai-hero--statement home-hero page-loading__section" data-atmosphere="amber">
        <div className="home-hero__media" aria-hidden>
          <div className="home-hero__shade" />
        </div>
        <div className="ai-hero__atmosphere" aria-hidden="true">
          <div className="ai-hero__mesh" />
          <div className="ai-hero__glow ai-hero__glow--warm" />
          <div className="ai-hero__glow ai-hero__glow--cool" />
        </div>

        <div className="container ai-hero__grid">
          <div className="ai-hero__copy">
            <Skeleton style={{ width: 120, height: 28, margin: '0 auto' }} rounded="sm" />
            <div className="page-loading__hero-title">
              <Skeleton style={{ width: 'min(100%, 420px)', height: 52 }} rounded="md" />
              <Skeleton style={{ width: 'min(100%, 280px)', height: 52 }} delay={1} rounded="md" />
            </div>
            <Skeleton style={{ width: 'min(100%, 360px)', height: 18 }} delay={2} />
            <div className="page-loading__hero-ctas">
              <Skeleton style={{ width: 148, height: 50 }} delay={3} rounded="md" />
            </div>
          </div>
        </div>
      </section>

      <section
        className="section home-scene home-scene--promise page-loading__section"
        style={{ animationDelay: '0.06s' }}
      >
        <div className="container">
          <div className="discovery-promise">
            <div className="discovery-promise__intro">
              <Skeleton style={{ width: 'min(100%, 360px)', height: 40 }} delay={1} />
              <Skeleton style={{ width: 'min(100%, 280px)', height: 16, marginTop: 16 }} delay={2} />
            </div>
            <div className="discovery-promise__beats">
              {[0, 1, 2].map((index) => (
                <div className="discovery-promise__beat" key={index}>
                  <Skeleton style={{ width: '80%', height: 24 }} delay={index as 0 | 1 | 2} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="section home-scene home-scene--journey page-loading__section"
        style={{ animationDelay: '0.1s' }}
      >
        <div className="container">
          <div className="section__header section__header--editorial">
            <Skeleton style={{ width: 'min(100%, 280px)', height: 36 }} />
            <Skeleton style={{ width: 'min(100%, 380px)', height: 16, marginTop: 14 }} delay={1} />
          </div>
          <AiPlannerSkeleton />
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
