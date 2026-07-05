import { Skeleton } from './Skeleton';

export function AiPlannerSkeleton() {
  return (
    <div className="ai-planner-skeleton" aria-hidden="true">
      <div className="ai-planner-skeleton__panel">
        <header className="ai-planner-skeleton__topbar">
          <div className="ai-planner-skeleton__topbar-copy">
            <Skeleton style={{ width: 88, height: 24 }} rounded="full" />
            <Skeleton style={{ width: 220, height: 22, marginTop: 10 }} rounded="sm" />
            <Skeleton style={{ width: 160, height: 12, marginTop: 8 }} delay={1} rounded="sm" />
          </div>
          <Skeleton style={{ width: 56, height: 28 }} rounded="full" />
        </header>

        <div className="ai-planner-skeleton__tabs">
          <Skeleton style={{ width: 88, height: 36 }} rounded="sm" />
          <Skeleton style={{ width: 72, height: 36 }} delay={1} rounded="sm" />
          <Skeleton style={{ width: 84, height: 36 }} delay={2} rounded="sm" />
          <Skeleton style={{ width: 76, height: 36 }} delay={3} rounded="sm" />
          <Skeleton style={{ width: 80, height: 36 }} delay={1} rounded="sm" />
        </div>

        <div className="ai-planner-skeleton__body">
          <div className="ai-planner-skeleton__cards">
            <Skeleton className="ai-planner-skeleton__card" rounded="lg" />
            <Skeleton className="ai-planner-skeleton__card" delay={1} rounded="lg" />
            <Skeleton className="ai-planner-skeleton__card" delay={2} rounded="lg" />
          </div>
          <Skeleton style={{ width: '100%', height: 52, marginTop: 12 }} delay={1} rounded="lg" />
          <Skeleton style={{ width: '100%', height: 52, marginTop: 8 }} delay={2} rounded="lg" />
        </div>

        <footer className="ai-planner-skeleton__footer">
          <Skeleton style={{ width: 220, height: 44 }} rounded="lg" />
        </footer>
      </div>
    </div>
  );
}
