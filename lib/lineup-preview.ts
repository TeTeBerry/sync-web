import type { ScheduleDj } from './api';
import { resolveCatalogGenreDisplay } from './lineup-genre';
import { resolveLineupStageLabel } from './lineup-display';
import type { Locale } from './i18n';

export type FeaturedArtist = {
  id: string;
  name: string;
  genre?: string;
  stage?: string;
  accent: string;
};

function uniqueArtists(djs: ScheduleDj[]): ScheduleDj[] {
  const byName = new Map<string, ScheduleDj>();
  for (const dj of djs) {
    const key = dj.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    const existing = byName.get(key);
    if (!existing || (dj.popularity ?? 0) > (existing.popularity ?? 0)) {
      byName.set(key, dj);
    }
  }
  return [...byName.values()];
}

export function buildFeaturedArtists(
  djs: ScheduleDj[],
  locale: Locale,
  options?: { stagesPublished?: boolean },
  limit = 6,
): FeaturedArtist[] {
  return uniqueArtists(djs)
    .sort((a, b) => {
      const byPopularity = (b.popularity ?? 0) - (a.popularity ?? 0);
      if (byPopularity !== 0) return byPopularity;
      return a.name.localeCompare(b.name, locale === 'zh' ? 'zh-CN' : 'en');
    })
    .slice(0, limit)
    .map((dj) => ({
      id: dj.id,
      name: dj.name,
      genre: resolveCatalogGenreDisplay(
        { genre: dj.genre, genreLabel: dj.genreLabel },
        locale,
      ),
      stage: resolveLineupStageLabel(
        locale,
        { stage: dj.stage, stageLabel: dj.stageLabel },
        options,
      ),
      accent: dj.genreColor ?? '#8b7cf8',
    }));
}

export function buildStageLabels(
  djs: ScheduleDj[],
  locale: Locale,
  options?: { stagesPublished?: boolean },
  limit = 5,
): string[] {
  if (options?.stagesPublished === false) {
    return [];
  }

  const stages = new Set<string>();
  for (const dj of djs) {
    const stage = resolveLineupStageLabel(
      locale,
      { stage: dj.stage, stageLabel: dj.stageLabel },
      options,
    );
    if (stage) stages.add(stage);
  }
  return [...stages].slice(0, limit);
}
