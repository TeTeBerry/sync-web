import { Breadcrumbs } from '../../../../../components/Breadcrumbs';
import { Skeleton } from '../../../../../components/states/Skeleton';
import { getMessages, localizedPath, resolveLoadingLocale } from '../../../../../lib/i18n';

type PlannerLoadingProps = {
  params?: Promise<{ locale?: string }>;
};

export default async function PlannerLoading({ params }: PlannerLoadingProps) {
  const locale = await resolveLoadingLocale(params);
  const t = getMessages(locale);

  return (
    <main className="plan-page">
      <section className="plan-page__intro">
        <div className="container container--plan">
          <Breadcrumbs
            ariaLabel={t.breadcrumbs.ariaLabel}
            items={[
              { label: t.breadcrumbs.home, href: localizedPath(locale) },
              { label: t.breadcrumbs.events, href: localizedPath(locale, '/events') },
              { label: '…' },
              { label: t.aiPlanner.breadcrumb },
            ]}
          />
        </div>
      </section>

      <section className="section section--plan" aria-hidden>
        <div className="container container--plan plan-page__skeleton">
          <Skeleton className="plan-page__skeleton-context" rounded="xl" />
          <Skeleton className="plan-page__skeleton-step" rounded="xl" delay={1} />
        </div>
      </section>
    </main>
  );
}
