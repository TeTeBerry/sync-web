import { Skeleton } from '../../../../../components/states/Skeleton';
import { getMessages, resolveLoadingLocale } from '../../../../../lib/i18n';

type PlannerLoadingProps = {
  params?: Promise<{ locale?: string }>;
};

export default async function PlannerLoading({ params }: PlannerLoadingProps) {
  const locale = await resolveLoadingLocale(params);
  const t = getMessages(locale);

  return (
    <main className="plan-page plan-page--journey">
      <section className="plan-journey__hero" aria-hidden>
        <div className="plan-journey__hero-stage plan-journey__hero-stage--loading">
          <div className="container container--plan plan-journey__hero-frame">
            <Skeleton className="plan-page__skeleton-hero" rounded="xl" />
          </div>
        </div>
      </section>

      <div className="container container--plan plan-page__skeleton">
        <Skeleton className="plan-page__skeleton-block" rounded="xl" delay={1} />
        <Skeleton className="plan-page__skeleton-block" rounded="xl" delay={2} />
      </div>

      <section className="section section--plan" aria-hidden aria-label={t.aiPlanner.landing.plannerSection}>
        <div className="container container--plan">
          <div className="plan-page__composer plan-page__skeleton">
            <Skeleton className="plan-page__skeleton-step" rounded="xl" />
          </div>
        </div>
      </section>
    </main>
  );
}
