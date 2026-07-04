import { Sparkles } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { ThinkingDots } from './ThinkingDots';

type AiPlannerSkeletonProps = {
  thinkingLabel: string;
};

export function AiPlannerSkeleton({ thinkingLabel }: AiPlannerSkeletonProps) {
  return (
    <div className="ai-planner-skeleton" aria-hidden="true">
      <div className="ai-planner-skeleton__panel">
        <header className="ai-planner-skeleton__header">
          <span className="ai-planner-skeleton__avatar">
            <Sparkles size={14} strokeWidth={2.25} />
          </span>
          <div className="ai-planner-skeleton__header-copy">
            <Skeleton style={{ width: 72, height: 12 }} rounded="sm" />
            <Skeleton style={{ width: 48, height: 10 }} delay={1} rounded="sm" />
          </div>
        </header>

        <div className="ai-planner-skeleton__thread">
          <div className="ai-planner-skeleton__message--user">
            <Skeleton style={{ width: 'min(72%, 320px)', height: 44 }} rounded="lg" />
          </div>

          <div className="ai-planner-skeleton__thinking">
            <span className="ai-planner-skeleton__thinking-avatar">
              <Sparkles size={11} strokeWidth={2.25} />
            </span>
            <div className="ai-planner-skeleton__thinking-body">
              <ThinkingDots size="sm" />
              <span className="ai-planner-skeleton__thinking-text">{thinkingLabel}</span>
            </div>
          </div>

          <div className="ai-planner-skeleton__cards">
            <Skeleton className="ai-planner-skeleton__card" delay={1} rounded="lg" />
            <Skeleton className="ai-planner-skeleton__card" delay={2} rounded="lg" />
            <Skeleton className="ai-planner-skeleton__card" delay={3} rounded="lg" />
          </div>
          <Skeleton className="ai-planner-skeleton__bar" delay={2} rounded="lg" />
        </div>

        <div className="ai-planner-skeleton__composer">
          <Skeleton style={{ width: '100%', height: 52 }} rounded="xl" />
        </div>
      </div>
    </div>
  );
}
