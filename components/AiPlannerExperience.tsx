import { TrackedLink } from './TrackedLink';
import { ArrowRight } from 'lucide-react';
import { localizedPath, type Locale } from '../lib/i18n';

type JourneyMoment = {
  time: string;
  label: string;
  kind: 'logistics' | 'artist' | 'day';
};

type JourneyPreviewContent = {
  festival: string;
  meta: string;
  story: string;
  cta: string;
  arrival: string;
  stay: string;
  budgetLabel: string;
  budgetValue: string;
  moments: readonly JourneyMoment[];
};

type AiPlannerExperienceProps = {
  locale: Locale;
  journey: JourneyPreviewContent;
};

export function AiPlannerExperience({ locale, journey }: AiPlannerExperienceProps) {
  return (
    <article className="journey-scene">
      <header className="journey-scene__header">
        <p className="journey-scene__festival">{journey.festival}</p>
        <p className="journey-scene__meta">{journey.meta}</p>
        <p className="journey-scene__story">{journey.story}</p>
      </header>

      <ol className="journey-scene__thread">
        {journey.moments.map((moment, index) => (
          <li
            className={`journey-scene__moment journey-scene__moment--${moment.kind}`}
            key={`${moment.time}-${moment.label}-${index}`}
          >
            <span className="journey-scene__time">{moment.time}</span>
            <span className="journey-scene__label">{moment.label}</span>
          </li>
        ))}
      </ol>

      <footer className="journey-scene__footer">
        <p className="journey-scene__confidence">
          <span>{journey.arrival}</span>
          <span aria-hidden>·</span>
          <span>{journey.stay}</span>
          <span aria-hidden>·</span>
          <span>
            {journey.budgetLabel} {journey.budgetValue}
          </span>
        </p>
        <TrackedLink
          className="journey-scene__cta"
          href={localizedPath(locale, '/waitlist')}
          eventName="home_plan_click"
          eventProperties={{ locale, source: 'ai-journey-preview' }}
        >
          {journey.cta}
          <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
        </TrackedLink>
      </footer>
    </article>
  );
}
