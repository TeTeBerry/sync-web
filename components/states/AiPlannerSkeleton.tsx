import { Skeleton } from './Skeleton';

export function AiPlannerSkeleton() {
  return (
    <div className="journey-scene-skeleton" aria-hidden="true">
      <div className="journey-scene-skeleton__header">
        <Skeleton style={{ width: 260, height: 32 }} rounded="sm" />
        <Skeleton style={{ width: 180, height: 14, marginTop: 12 }} delay={1} rounded="sm" />
        <Skeleton style={{ width: 'min(100%, 420px)', height: 16, marginTop: 18 }} delay={2} />
      </div>
      <div className="journey-scene-skeleton__thread">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton
            key={index}
            style={{ width: '100%', height: 28 }}
            delay={(index % 4) as 0 | 1 | 2 | 3}
            rounded="sm"
          />
        ))}
      </div>
      <div className="journey-scene-skeleton__footer">
        <Skeleton style={{ width: 'min(100%, 320px)', height: 14 }} delay={2} />
        <Skeleton style={{ width: 200, height: 44, marginTop: 18 }} delay={3} rounded="lg" />
      </div>
    </div>
  );
}
