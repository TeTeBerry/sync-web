import Link from 'next/link';
import { ArrowRight, Calendar, Share2, Sparkles } from 'lucide-react';
import type { Locale } from '../../lib/i18n';

type PlannerSuccessPanelProps = {
  locale: Locale;
  eventsPath: string;
  waitlistPath: string;
  onViewPlan: () => void;
  onShare: () => void;
  labels: {
    eyebrow: string;
    title: string;
    lead: string;
    nextLabel: string;
    nextSteps: readonly string[];
    viewPlan: string;
    exploreFestivals: string;
    share: string;
    waitlistCta: string;
  };
};

export function PlannerSuccessPanel({
  eventsPath,
  waitlistPath,
  onViewPlan,
  onShare,
  labels,
}: PlannerSuccessPanelProps) {
  return (
    <div className="planner-success state-enter" role="status" aria-live="polite">
      <div className="planner-success__glow" aria-hidden="true" />
      <div className="planner-success__header">
        <div className="planner-success__icon" aria-hidden="true">
          <Sparkles size={16} strokeWidth={2.25} />
        </div>
        <div className="planner-success__copy">
          <span className="planner-success__eyebrow">{labels.eyebrow}</span>
          <p className="planner-success__title">{labels.title}</p>
          <p className="planner-success__lead">{labels.lead}</p>
        </div>
      </div>

      <ul className="planner-success__next" aria-label={labels.nextLabel}>
        {labels.nextSteps.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className="planner-success__actions">
        <button className="planner-success__action planner-success__action--primary" type="button" onClick={onViewPlan}>
          <Calendar size={14} strokeWidth={2} aria-hidden />
          <span>{labels.viewPlan}</span>
        </button>
        <Link className="planner-success__action" href={eventsPath}>
          <span>{labels.exploreFestivals}</span>
          <ArrowRight size={13} strokeWidth={2.25} aria-hidden />
        </Link>
        <button className="planner-success__action planner-success__action--ghost" type="button" onClick={onShare}>
          <Share2 size={13} strokeWidth={2} aria-hidden />
          <span>{labels.share}</span>
        </button>
        <Link className="planner-success__waitlist" href={waitlistPath}>
          {labels.waitlistCta}
          <ArrowRight size={13} strokeWidth={2.25} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
