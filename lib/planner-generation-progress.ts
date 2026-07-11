import type { RavenPlanGenerationJob } from './api';

const STATUS_STEP_INDEX: Record<string, number> = {
  pending: 0,
  queued: 0,
  validating: 0,
  map_poi: 0,
  searching_hotels: 1,
  quotes_hotels: 1,
  searching_flights: 2,
  quotes_flights: 2,
  quotes: 1,
  building_itinerary: 3,
  ai_writing: 3,
  assembling: 3,
  finishing: 3,
  completed: 4,
};

function progressPercent(progress: RavenPlanGenerationJob['progress']): number | null {
  const value = typeof progress === 'number' ? progress : progress?.percent;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Maps backend pipeline states to the generation row currently in progress. */
export function resolveGenerationStep(
  job: RavenPlanGenerationJob,
  stepCount: number,
): number {
  const reportedStep =
    typeof job.progress === 'object' && job.progress?.step ? job.progress.step : job.status;
  const mappedStep = STATUS_STEP_INDEX[reportedStep];

  if (mappedStep !== undefined) return Math.min(stepCount, mappedStep);

  const percent = progressPercent(job.progress);
  if (percent === null) return 0;
  return Math.min(stepCount, Math.max(0, Math.floor((percent / 100) * stepCount)));
}
