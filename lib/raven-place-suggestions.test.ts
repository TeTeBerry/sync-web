import { afterEach, describe, expect, it, vi } from 'vitest';

describe('fetchRavenPlaceSuggestions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('unwraps nested { data: [...] } envelopes from the Raven proxy', async () => {
    const rows = [
      {
        kind: 'city' as const,
        title: 'London',
        city: 'London',
        country: 'United Kingdom',
      },
      {
        kind: 'city' as const,
        title: 'Shanghai',
        city: 'Shanghai',
        country: 'China',
      },
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 200,
          message: 'success',
          data: { data: rows },
        }),
      }),
    );

    const { fetchRavenPlaceSuggestions } = await import('./api');
    const result = await fetchRavenPlaceSuggestions({ keyword: 'Lon' });
    expect(result).toEqual(rows);
    expect(fetch).toHaveBeenCalled();
    const calledUrl = String(vi.mocked(fetch).mock.calls[0]?.[0] ?? '');
    expect(calledUrl).toContain('/raven/place-suggestions?');
    expect(calledUrl).toContain('keyword=Lon');
  });
});
