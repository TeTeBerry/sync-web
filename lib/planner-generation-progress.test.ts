import { describe, expect, it } from 'vitest';
import { resolveGenerationStep } from './planner-generation-progress';

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
    ).toBe(2);
  });

  it('keeps the legacy quotes stage on the stay step', () => {
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
