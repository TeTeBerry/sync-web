import { describe, expect, it } from 'vitest';
import {
  advanceNarrativeStage,
  resolveGenerationStep,
  resolvePlanGenerationStage,
} from './planner-generation-progress';

describe('resolveGenerationStep', () => {
  it('uses a legacy status before numeric progress', () => {
    expect(
      resolveGenerationStep(
        { jobId: 'job-1', status: 'searching_hotels', progress: 45 },
        4,
      ),
    ).toBe(1);
  });

  it('uses the structured progress step from the current backend contract', () => {
    expect(
      resolveGenerationStep(
        { jobId: 'job-2', status: 'running', progress: { step: 'quotes_flights', percent: 50 } },
        4,
      ),
    ).toBe(1);
  });

  it('keeps the legacy quotes stage on the journey-shaping step', () => {
    expect(
      resolveGenerationStep(
        { jobId: 'job-legacy', status: 'running', progress: { step: 'quotes', percent: 36 } },
        4,
      ),
    ).toBe(1);
  });

  it('uses numeric progress only when no known backend stage is available', () => {
    expect(resolveGenerationStep({ jobId: 'job-3', status: 'running', progress: 45 }, 4)).toBe(1);
  });
});

describe('resolvePlanGenerationStage', () => {
  it('maps early pipeline work to the festival world scene', () => {
    expect(
      resolvePlanGenerationStage({
        status: 'running',
        progress: { step: 'map_poi', percent: 22 },
      }),
    ).toBe('festival');
  });

  it('maps hotel quotes to assembly and flights to route', () => {
    expect(
      resolvePlanGenerationStage({
        status: 'running',
        progress: { step: 'quotes_hotels', percent: 36 },
      }),
    ).toBe('route');
    expect(
      resolvePlanGenerationStage({
        status: 'running',
        progress: { step: 'quotes_flights', percent: 50 },
      }),
    ).toBe('route');
  });

  it('holds AI synthesis on the guide scene until completion', () => {
    expect(
      resolvePlanGenerationStage({
        status: 'running',
        progress: { step: 'ai_writing', percent: 66 },
      }),
    ).toBe('guide');
    expect(
      resolvePlanGenerationStage({
        status: 'completed',
        progress: { step: 'completed', percent: 100 },
      }),
    ).toBe('completed');
  });
});

describe('advanceNarrativeStage', () => {
  it('never claims completion before the backend does', () => {
    expect(
      advanceNarrativeStage({
        backendStage: 'guide',
        narrativeStage: 'guide',
        elapsedMs: 60_000,
        hasArtists: true,
      }),
    ).toBe('guide');
  });

  it('lets the real backend stage jump ahead of narrative beats', () => {
    expect(
      advanceNarrativeStage({
        backendStage: 'route',
        narrativeStage: 'festival',
        elapsedMs: 500,
        hasArtists: true,
      }),
    ).toBe('route');
  });

  it('keeps the route scene until its dwell completes even if total elapsed is already high', () => {
    expect(
      advanceNarrativeStage({
        backendStage: 'route',
        narrativeStage: 'route',
        elapsedMs: 12_000,
        msInNarrativeStage: 800,
        hasArtists: true,
      }),
    ).toBe('route');
  });

  it('opens a narrative assembly beat after the route dwell', () => {
    expect(
      advanceNarrativeStage({
        backendStage: 'route',
        narrativeStage: 'route',
        elapsedMs: 12_000,
        msInNarrativeStage: 2300,
        hasArtists: true,
      }),
    ).toBe('assembly');
  });

  it('plays a brief mission beat before entering the festival world', () => {
    expect(
      advanceNarrativeStage({
        backendStage: 'festival',
        narrativeStage: 'mission',
        elapsedMs: 400,
        hasArtists: false,
      }),
    ).toBe('mission');
    expect(
      advanceNarrativeStage({
        backendStage: 'festival',
        narrativeStage: 'mission',
        elapsedMs: 1200,
        hasArtists: false,
      }),
    ).toBe('festival');
  });
});
