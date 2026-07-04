import type { Metadata } from 'next';
import nextDynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { Suspense, type CSSProperties } from 'react';
import { ArrowRight, Calendar, MapPin, Sparkles, Users, Wallet } from 'lucide-react';
import { HeroPhonePreview } from '../../components/HeroPhonePreview';
import { HomePopularEvents } from '../../components/HomePopularEvents';
import { AiPlannerSkeleton } from '../../components/states/AiPlannerSkeleton';
import { PopularEventsSkeleton } from '../../components/states/PopularEventsSkeleton';
import { TrackedLink } from '../../components/TrackedLink';
import {
  getMessages,
  isLocale,
  localizedPath,
  type Locale,
} from '../../lib/i18n';
import {
  absoluteAlternateLanguages,
  absoluteLocalizedUrl,
  buildSocialMetadata,
} from '../../lib/seo';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

const featureIcons = [Calendar, MapPin, Users, Wallet];

const AiPlannerExperience = nextDynamic(
  () =>
    import('../../components/AiPlannerExperience').then((module) => ({
      default: module.AiPlannerExperience,
    })),
  {
    loading: () => <AiPlannerSkeleton thinkingLabel="…" />,
  },
);

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : 'zh';
  const t = getMessages(locale);
  const url = absoluteLocalizedUrl(locale);

  return {
    title: {
      absolute: t.siteTitle,
    },
    description: t.siteDescription,
    alternates: {
      canonical: url,
      languages: absoluteAlternateLanguages(),
    },
    ...buildSocialMetadata({
      title: t.siteTitle,
      description: t.ogDescription,
      url,
      locale,
    }),
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);

  return (
    <main className="home">
      <section className="ai-hero ai-hero--split" aria-labelledby="home-hero-title">
        <div className="ai-hero__atmosphere" aria-hidden="true">
          <div className="ai-hero__mesh" />
          <div className="ai-hero__glow ai-hero__glow--warm" />
          <div className="ai-hero__glow ai-hero__glow--cool" />
          <div className="ai-hero__spotlight" />
          <div className="ai-hero__grain" />
        </div>

        <div className="container ai-hero__grid">
          <div className="ai-hero__copy">
            <div className="ai-hero__head">
              <div className="ai-badge">
                <Sparkles size={13} strokeWidth={2.25} aria-hidden />
                <span>{t.home.badge}</span>
              </div>

              <h1 className="ai-hero__title" id="home-hero-title">
                <span className="visually-hidden">{t.home.seoHeading}</span>
                <span className="ai-hero__headline" aria-hidden="true">
                  {t.home.titleLine1}
                </span>
                <span className="ai-hero__headline ai-hero__headline--accent" aria-hidden="true">
                  {t.home.titleLine2}
                </span>
              </h1>

              <p className="lead ai-hero__lead">{t.home.lead}</p>
            </div>

            <div className="ai-hero__ctas">
              <TrackedLink
                className="button button--glow ai-hero__cta-primary"
                href={localizedPath(locale, '/waitlist')}
                eventName="home_plan_click"
                eventProperties={{ locale, source: 'hero-primary' }}
              >
                {t.home.primaryCta}
              </TrackedLink>
              <TrackedLink
                className="button secondary ai-hero__cta-secondary"
                href={localizedPath(locale, '/events')}
                eventName="home_events_click"
                eventProperties={{ locale, source: 'hero-secondary' }}
              >
                {t.home.exploreCta}
                <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
              </TrackedLink>
            </div>
          </div>

          <HeroPhonePreview locale={locale} preview={t.home.preview} ariaLabel={t.home.preview.ariaLabel} />
        </div>
      </section>

      <section className="section how-section" id="how-it-works" aria-labelledby="how-it-works-title" data-reveal>
        <div className="container">
          <div className="section__header section__header--center">
            <div>
              <p className="eyebrow">{t.home.howEyebrow}</p>
              <h2 id="how-it-works-title">{t.home.howTitle}</h2>
              <p className="section__note">{t.home.howLead}</p>
            </div>
          </div>

          <ol className="how-steps" data-reveal-stagger>
            {t.home.steps.map((step, index) => (
              <li className="how-step" key={step.title} style={{ '--card-index': index } as CSSProperties}>
                <span className="how-step__number">{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section ai-planner-section" id="ai-planner" aria-labelledby="ai-planner-title" data-reveal>
        <div className="container">
          <div className="section__header section__header--center">
            <div>
              <h2 id="ai-planner-title">{t.home.plannerTitle}</h2>
              <p className="section__note">{t.home.plannerLead}</p>
            </div>
          </div>

          <AiPlannerExperience
              locale={locale}
              placeholder={t.home.promptPlaceholder}
              enterHint={t.home.enterHint}
              submitLabel={t.home.promptSubmit}
              suggestions={t.home.suggestions}
              suggestionsLabel={t.home.suggestionsLabel}
              placeholderVariants={t.home.placeholderVariants}
              tryCta={t.home.tryCta}
              followUpLabel={t.home.followUpLabel}
              followUps={t.home.followUps}
              preview={t.home.preview}
              successLabels={{
                eyebrow: t.states.plannerSuccessEyebrow,
                title: t.states.plannerSuccessTitle,
                lead: t.states.plannerSuccessLead,
                nextLabel: t.states.plannerSuccessNextLabel,
                nextSteps: t.states.plannerSuccessNext,
                viewPlan: t.states.plannerSuccessViewPlan,
                exploreFestivals: t.states.plannerSuccessExplore,
                share: t.states.plannerSuccessShare,
                waitlistCta: t.states.plannerSuccessWaitlist,
                shareCopied: t.states.plannerSuccessShareCopied,
                shareFailed: t.states.plannerSuccessShareFailed,
              }}
              errorLabels={{
                title: t.states.plannerErrorTitle,
                lead: t.states.plannerErrorLead,
                retry: t.states.plannerErrorRetry,
                waitlist: t.states.plannerErrorWaitlist,
                browse: t.states.plannerErrorBrowse,
            }}
          />
        </div>
      </section>

      <section className="section capabilities-section" aria-labelledby="capabilities-title" data-reveal>
        <div className="container capabilities-layout">
          <div className="capabilities-layout__intro">
            <h2 id="capabilities-title">{t.home.featuresTitle}</h2>
            <p className="section__note">{t.home.featuresLead}</p>
            <TrackedLink
              className="capabilities-layout__nudge"
              href={localizedPath(locale, '/waitlist')}
              eventName="home_plan_click"
              eventProperties={{ locale, source: 'capabilities-nudge' }}
            >
              <span>{t.home.featuresWaitlistNudge}</span>
              <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
            </TrackedLink>
          </div>

          <ul className="capability-rail" data-reveal-stagger>
            {t.home.features.map((feature, index) => {
              const Icon = featureIcons[index];
              return (
                <li
                  className={`capability-rail__item${index === 0 ? ' capability-rail__item--lead' : ''}`}
                  key={feature.title}
                  style={{ '--card-index': index } as CSSProperties}
                >
                  <div className="capability-rail__icon" aria-hidden>
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <div className="capability-rail__content">
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="section popular-events" aria-labelledby="popular-events-title" data-reveal>
        <div className="container">
          <div className="section__header section__header--split">
            <div>
              <h2 id="popular-events-title">{t.home.popularTitle}</h2>
              <p className="section__note">{t.home.popularLead}</p>
            </div>
            <TrackedLink
              className="section__header-action"
              href={localizedPath(locale, '/events')}
              eventName="home_events_click"
              eventProperties={{ locale, source: 'popular-events-header' }}
            >
              <span>{t.home.popularLink}</span>
              <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
            </TrackedLink>
          </div>

          <Suspense fallback={<PopularEventsSkeleton />}>
            <HomePopularEvents locale={locale} />
          </Suspense>

          <div className="popular-events__bridge">
            <p>{t.home.popularBridge}</p>
            <TrackedLink
              className="popular-events__bridge-link"
              href={localizedPath(locale, '/waitlist')}
              eventName="home_plan_click"
              eventProperties={{ locale, source: 'popular-events-bridge' }}
            >
              <span>{t.home.popularBridgeLink}</span>
              <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
            </TrackedLink>
          </div>
        </div>
      </section>

      <section className="section cta-band" aria-labelledby="cta-title" data-reveal>
        <div className="container">
          <div className="cta-band__panel">
            <div className="cta-band__atmosphere" aria-hidden>
              <div className="cta-band__glow cta-band__glow--primary" />
              <div className="cta-band__glow cta-band__glow--accent" />
              <div className="cta-band__grid" />
            </div>

            <div className="cta-band__content">
              <h2 id="cta-title">{t.home.ctaTitle}</h2>
              <p className="lead">{t.home.ctaLead}</p>
              <ul className="cta-band__proof" aria-label={t.home.badge}>
                {t.home.ctaProof.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>

            <div className="cta-band__actions">
              <TrackedLink
                className="button button--glow cta-band__primary"
                href={localizedPath(locale, '/waitlist')}
                eventName="home_plan_click"
                eventProperties={{ locale, source: 'footer-cta' }}
              >
                {t.home.ctaButton}
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
              </TrackedLink>
              <TrackedLink
                className="cta-band__secondary"
                href={localizedPath(locale, '/events')}
                eventName="home_events_click"
                eventProperties={{ locale, source: 'footer-cta-secondary' }}
              >
                {t.home.ctaSecondary}
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
