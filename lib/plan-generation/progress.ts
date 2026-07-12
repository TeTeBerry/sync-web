import type { RavenPlanGenerationJob } from '../api';
import type { PlanGenerationStage } from './types';

const BACKEND_STAGE_MAP: Record<string, PlanGenerationStage> = {
  pending: 'festival',
  queued: 'festival',
  validating: 'festival',
  map_poi: 'festival',
  // Hotel + flight quote gathering both feed the journey-shaping chapter.
  // Assembly is a narrative beat inside this band so markers never move backward.
  searching_hotels: 'route',
  quotes_hotels: 'route',
  quotes: 'route',
  searching_flights: 'route',
  quotes_flights: 'route',
  building_itinerary: 'guide',
  ai_writing: 'guide',
  assembling: 'guide',
  finishing: 'guide',
  completed: 'completed',
  failed: 'failed',
};

/** Visual scene order used for progress markers and conservative narrative advance. */
export const PLAN_GENERATION_SCENE_ORDER: PlanGenerationStage[] = [
  'mission',
  'festival',
  'lineup',
  'route',
  'assembly',
  'guide',
  'completed',
];

function progressPercent(progress: RavenPlanGenerationJob['progress']): number | null {
  const value = typeof progress === 'number' ? progress : progress?.percent;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function reportedBackendStep(
  job: Pick<RavenPlanGenerationJob, 'status' | 'progress'>,
): string {
  if (typeof job.progress === 'object' && job.progress?.step) {
    return job.progress.step;
  }
  return job.status;
}

/**
 * Maps a live generation job onto the closest cinematic scene.
 * Lineup and mission are narrative-only and are never returned from the backend alone.
 */
export function resolvePlanGenerationStage(
  job: Pick<RavenPlanGenerationJob, 'status' | 'progress'>,
): PlanGenerationStage {
  if (job.status === 'failed') return 'failed';
  if (job.status === 'completed') return 'completed';

  const reported = reportedBackendStep(job);
  const mapped = BACKEND_STAGE_MAP[reported];
  if (mapped) return mapped;

  const percent = progressPercent(job.progress);
  if (percent === null) return 'festival';
  if (percent >= 66) return 'guide';
  if (percent >= 36) return 'route';
  return 'festival';
}

export function stageIndex(stage: PlanGenerationStage): number {
  const index = PLAN_GENERATION_SCENE_ORDER.indexOf(stage);
  return index < 0 ? 0 : index;
}

/**
 * Legacy 0..N checklist index used by older UI / tests.
 * Kept for compatibility with resolveGenerationStep callers.
 */
export function resolveGenerationStep(
  job: RavenPlanGenerationJob,
  stepCount: number,
): number {
  const stage = resolvePlanGenerationStage(job);
  if (stage === 'completed') return stepCount;
  if (stage === 'failed') return 0;

  const legacyIndex: Record<string, number> = {
    mission: 0,
    festival: 0,
    lineup: 0,
    route: 1,
    assembly: 2,
    guide: 3,
  };

  return Math.min(stepCount, legacyIndex[stage] ?? 0);
}

/** Minimum time the route scene stays visible before the assembly narrative beat. */
export const ROUTE_TO_ASSEMBLY_DWELL_MS = 2200;

/**
 * Conservative frontend narrative stage while waiting on a real backend stage.
 * Never advances past `guide`, and never claims `completed`.
 *
 * `msInNarrativeStage` is dwell time on the current narrative scene (not total
 * generation elapsed) so late route arrival still gets a readable route beat.
 */
export function advanceNarrativeStage(params: {
  backendStage: PlanGenerationStage;
  narrativeStage: PlanGenerationStage;
  elapsedMs: number;
  msInNarrativeStage?: number;
  hasArtists: boolean;
}): PlanGenerationStage {
  const {
    backendStage,
    narrativeStage,
    elapsedMs,
    msInNarrativeStage = elapsedMs,
    hasArtists,
  } = params;

  if (backendStage === 'failed') return 'failed';
  if (backendStage === 'completed') return 'completed';

  // Hold on the real long stage once the backend reaches guide work.
  if (backendStage === 'guide') return 'guide';

  // Brief mission beat always plays first, even if the backend is already preparing.
  if (narrativeStage === 'mission') {
    if (elapsedMs < 1100) return 'mission';
    if (backendStage === 'mission' || backendStage === 'festival') return 'festival';
    return backendStage;
  }

  const backendIndex = stageIndex(backendStage === 'mission' ? 'festival' : backendStage);
  const narrativeIndex = stageIndex(narrativeStage);

  // Real pipeline always wins when it is ahead of the narrative.
  if (backendIndex > narrativeIndex && backendStage !== 'route') {
    return backendStage;
  }

  // Soft narrative lineup beat while still in early festival prep.
  if (
    narrativeStage === 'festival' &&
    backendStage === 'festival' &&
    elapsedMs >= 2600 &&
    hasArtists
  ) {
    return 'lineup';
  }

  // Stay on lineup until the backend leaves festival prep.
  if (narrativeStage === 'lineup') {
    if (backendStage === 'route') return 'route';
    if (backendStage === 'festival') return 'lineup';
  }

  // When quote gathering begins, enter the route scene.
  if (backendStage === 'route' && narrativeIndex < stageIndex('route')) {
    return 'route';
  }

  // Assembly only after a dwell on route — never based on total generation time alone.
  if (
    narrativeStage === 'route' &&
    backendStage === 'route' &&
    msInNarrativeStage >= ROUTE_TO_ASSEMBLY_DWELL_MS
  ) {
    return 'assembly';
  }

  if (narrativeStage === 'assembly' && backendStage === 'route') {
    return 'assembly';
  }

  return narrativeStage;
}
