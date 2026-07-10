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
        title: 'London, United Kingdom',
        city: 'London',
        country: 'United Kingdom',
      },
      {
        kind: 'airport' as const,
        title: 'London Heathrow Airport · LHR',
        city: 'London',
        country: 'United Kingdom',
        iata: 'LHR',
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

  it('requests city airports with city + country params', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 200,
          message: 'success',
          data: { data: [] },
        }),
      }),
    );

    const { fetchRavenPlaceSuggestions } = await import('./api');
    await fetchRavenPlaceSuggestions({
      city: 'London',
      country: 'United Kingdom',
    });
    const calledUrl = String(vi.mocked(fetch).mock.calls[0]?.[0] ?? '');
    expect(calledUrl).toContain('city=London');
    expect(calledUrl).toContain('country=United+Kingdom');
  });
});
