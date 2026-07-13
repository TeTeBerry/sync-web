import type { ScheduleDj } from './api';
import { areRelatedGenres } from './lineup-constellation';
import { GENRE_BROAD_COLORS, resolveGenreBroadToken } from './lineup-genre';
import { isGenrePlaceholder } from './lineup-display';
import {
  LINEUP_SELECTION_STORAGE_PREFIX,
  readLineupSelection,
} from './lineup-selection';
import type { Locale } from './i18n';

export type DiscoveryMood =
  | 'euphoric'
  | 'dreamy'
  | 'heavy'
  | 'dark'
  | 'groovy'
  | 'emotional'
  | 'peak'
  | 'underground';

export type DiscoveryCategory = 'picked' | 'discovery' | 'wildcard';

export type DiscoveryLabel =
  | 'picked'
  | 'strong'
  | 'related'
  | 'similar_saved'
  | 'discovery'
  | 'wildcard'
  | 'mood';

export type DiscoveryArtist = {
  id: string;
  name: string;
  genre: string;
  color: string;
  category: DiscoveryCategory;
  label: DiscoveryLabel;
  editorial: string;
  reasons: string[];
  score: number;
};

export type DiscoveryBundle = {
  hasSignals: boolean;
  savedIds: string[];
  savedGenres: string[];
  picked: DiscoveryArtist[];
  discoveries: DiscoveryArtist[];
  wildcard: DiscoveryArtist | null;
  /** Only set when hasSignals — never invent personalized counts. */
  counts: { picked: number; discoveries: number; wildcard: number } | null;
};

export const DISCOVERY_MOODS: DiscoveryMood[] = [
  'euphoric',
  'dreamy',
  'heavy',
  'dark',
  'groovy',
  'emotional',
  'peak',
  'underground',
];

const MOOD_PATTERNS: Record<DiscoveryMood, RegExp> = {
  euphoric: /trance|big room|progressive|festival|euphor|uplifting|house/i,
  dreamy: /melodic|ambient|progressive|organic|chill|indie/i,
  heavy: /hard|bass|dubstep|riddim|hardstyle|hardcore|drum/i,
  dark: /techno|industrial|minimal|dark|acid/i,
  groovy: /house|disco|garage|funk|jackin|afro/i,
  emotional: /melodic|progressive|trance|cinematic|emotional/i,
  peak: /big room|mainstage|festival|trance|hardstyle|peak/i,
  underground: /techno|minimal|warehouse|underground|acid|industrial/i,
};

function artistIdFromSelection(raw: string): string {
  return raw.includes('@') ? raw.slice(0, raw.indexOf('@')) : raw;
}

/** Collect My Lineup artist ids across festivals (anonymous-friendly). */
export function collectSavedArtistIds(activityLegacyId: number): string[] {
  if (typeof window === 'undefined') return [];
  const ids = new Set<string>();
  for (const raw of readLineupSelection(activityLegacyId)) {
    const id = artistIdFromSelection(raw);
    if (id) ids.add(id);
  }
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(`${LINEUP_SELECTION_STORAGE_PREFIX}:`)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (typeof item !== 'string' || !item) continue;
        const id = artistIdFromSelection(item);
        if (id) ids.add(id);
      }
    }
  } catch {
    // ignore
  }
  return [...ids];
}

function genreOf(dj: ScheduleDj): string {
  const label = dj.genreLabel || dj.genre || '';
  return isGenrePlaceholder(label) ? '' : label;
}

function colorOf(dj: ScheduleDj, genre: string): string {
  if (dj.genreColor) return dj.genreColor;
  const broad = resolveGenreBroadToken(genre);
  return (broad && GENRE_BROAD_COLORS[broad]) || '#7c6cff';
}

function fitsMood(genre: string, mood: DiscoveryMood | null): boolean {
  if (!mood) return true;
  if (!genre) return mood === 'euphoric';
  return MOOD_PATTERNS[mood].test(genre);
}

function moodBoost(genre: string, mood: DiscoveryMood | null): number {
  if (!mood) return 0;
  return fitsMood(genre, mood) ? 0.35 : -0.15;
}

type CopyBag = {
  similarSaved: string;
  sharedGenre: (genre: string) => string;
  adjacentBridge: (from: string, to: string) => string;
  festivalHighlight: string;
  highEnergy: string;
  moodFit: string;
  wildcardBridge: string;
  editorialPicked: (genre: string) => string;
  editorialDiscovery: (from: string, to: string) => string;
  editorialWildcard: string;
  editorialFestival: (genre: string) => string;
};

function copyFor(locale: Locale): CopyBag {
  if (locale === 'zh') {
    return {
      similarSaved: '与你已标记的艺人相近。',
      sharedGenre: (genre) => `同属 ${genre} 气质。`,
      adjacentBridge: (from, to) => `从 ${from} 自然延伸到 ${to}。`,
      festivalHighlight: '这场阵容里的高光名字。',
      highEnergy: '与这场高能动线相连。',
      moodFit: '贴合你此刻追的气氛。',
      wildcardBridge: '不在你最近的习惯里，却与你标记过的高能声音相连。',
      editorialPicked: (genre) => (genre ? `守住这场里最贴近你的 ${genre}。` : '守住这场里最贴近你的声音。'),
      editorialDiscovery: (from, to) =>
        from && to ? `从 ${from} 走向 ${to} 的自然桥梁。` : '邻近声音里的新发现。',
      editorialWildcard: '留一条意外、却说得通的路。',
      editorialFestival: (genre) => (genre ? `${genre} 是这场世界的一条主线。` : '先听懂这场的主导声音。'),
    };
  }
  return {
    similarSaved: 'Similar to artists already in My Lineup.',
    sharedGenre: (genre) => `Shared ${genre} style.`,
    adjacentBridge: (from, to) => `A natural bridge from ${from} into ${to}.`,
    festivalHighlight: 'A highlight sound in this festival’s cast.',
    highEnergy: 'Connected through this festival’s high-energy path.',
    moodFit: 'Fits the mood you are chasing today.',
    wildcardBridge: 'Outside your usual recent choices, but connected through the high-energy artists you saved.',
    editorialPicked: (genre) =>
      genre ? `Protect the ${genre} pull already closest to you.` : 'Protect the sound already closest to you.',
    editorialDiscovery: (from, to) =>
      from && to ? `A natural bridge from ${from} into ${to}.` : 'An adjacent sound worth hearing next.',
    editorialWildcard: 'One defensible surprise on the edge of your path.',
    editorialFestival: (genre) =>
      genre ? `${genre} carries one of this festival’s main currents.` : 'One of this festival’s leading currents.',
  };
}

function scoreAgainstSaved(
  dj: ScheduleDj,
  savedGenres: string[],
  savedIds: Set<string>,
  mood: DiscoveryMood | null,
): { score: number; reasons: string[]; label: DiscoveryLabel } {
  const genre = genreOf(dj);
  const copy = { similarSaved: true }; // placeholder
  void copy;
  if (savedIds.has(dj.id)) {
    return { score: 0, reasons: [], label: 'picked' };
  }

  let score = (dj.popularity ?? 0) * 0.0008 + moodBoost(genre, mood);
  const reasons: string[] = [];
  let label: DiscoveryLabel = 'related';

  const exact = savedGenres.some((g) => g && genre && g.toLowerCase() === genre.toLowerCase());
  const related = savedGenres.some((g) => g && genre && areRelatedGenres(g, genre));

  if (exact) {
    score += 1.2;
    label = 'similar_saved';
    reasons.push('shared');
  } else if (related) {
    score += 0.85;
    label = 'related';
    reasons.push('adjacent');
  }

  if (fitsMood(genre, mood) && mood) {
    score += 0.2;
    reasons.push('mood');
  }

  if (score >= 1.3) label = 'strong';
  if (score >= 1.5 && exact) label = 'picked';

  return { score, reasons, label };
}

/**
 * Behavior-driven discovery from My Lineup + genre relationships + mood.
 * No personality data. Pure frontend.
 */
export function buildDiscoveryBundle(input: {
  djs: ScheduleDj[];
  activityLegacyId: number;
  locale: Locale;
  mood: DiscoveryMood | null;
  savedIds?: string[];
}): DiscoveryBundle {
  const copy = copyFor(input.locale);
  const savedIds = input.savedIds ?? collectSavedArtistIds(input.activityLegacyId);
  const savedSet = new Set(savedIds);
  const roster = input.djs.filter((dj) => dj.id && dj.name);
  const savedInRoster = roster.filter((dj) => savedSet.has(dj.id));
  const savedGenres = [
    ...new Set(
      savedInRoster
        .map(genreOf)
        .filter(Boolean)
        .concat(
          // When saves are from other festivals, infer from overlapping names only —
          // we only have genres for artists on this roster.
        ),
    ),
  ];

  // If saved ids aren't on this roster, treat hasSignals from any save presence
  // and use festival genre distribution for soft discovery.
  const hasSignals = savedIds.length > 0;
  const candidates = roster.filter((dj) => !savedSet.has(dj.id));

  const ranked = candidates
    .map((dj) => {
      const genre = genreOf(dj);
      const { score, reasons, label } = hasSignals
        ? scoreAgainstSaved(
            dj,
            savedGenres.length ? savedGenres : inferGenresFromRoster(roster),
            savedSet,
            input.mood,
          )
        : {
            score: (dj.popularity ?? 0) * 0.001 + moodBoost(genre, input.mood) + 0.2,
            reasons: ['festival'] as string[],
            label: 'related' as DiscoveryLabel,
          };
      return { dj, genre, score, reasons, label };
    })
    .sort((a, b) => b.score - a.score || a.dj.name.localeCompare(b.dj.name));

  const pickedRaw = hasSignals
    ? ranked.filter((item) => item.score >= 0.25).slice(0, 4)
    : ranked.filter((item) => fitsMood(item.genre, input.mood)).slice(0, 3);

  const pickedIds = new Set(pickedRaw.map((item) => item.dj.id));
  const discoveryRaw = ranked
    .filter((item) => !pickedIds.has(item.dj.id))
    .filter((item) => {
      if (!hasSignals) return true;
      const from = savedGenres[0] || '';
      return !from || !item.genre || areRelatedGenres(from, item.genre) || item.score >= 0.45;
    })
    .slice(0, 3);

  const discoveryIds = new Set(discoveryRaw.map((item) => item.dj.id));
  const wildcardCandidate =
    ranked.find((item) => {
      if (pickedIds.has(item.dj.id) || discoveryIds.has(item.dj.id)) return false;
      const genre = item.genre;
      const energetic = /hard|bass|trance|techno|big room|festival|peak/i.test(genre);
      if (hasSignals) return energetic || item.score >= 0.35;
      return energetic || (item.dj.popularity ?? 0) > 0;
    }) ?? null;

  function toArtist(
    item: (typeof ranked)[number],
    category: DiscoveryCategory,
  ): DiscoveryArtist {
    const fromGenre = savedGenres[0] || '';
    const reasons: string[] = [];
    let label = item.label;
    let editorial = copy.editorialFestival(item.genre);

    if (category === 'picked') {
      label = hasSignals ? (item.label === 'related' ? 'similar_saved' : item.label) : 'related';
      if (hasSignals) {
        reasons.push(copy.similarSaved);
        if (item.genre) reasons.push(copy.sharedGenre(item.genre));
        editorial = copy.editorialPicked(item.genre);
      } else {
        reasons.push(copy.festivalHighlight);
        if (item.genre) reasons.push(copy.sharedGenre(item.genre));
        editorial = copy.editorialFestival(item.genre);
      }
    } else if (category === 'discovery') {
      label = 'discovery';
      if (fromGenre && item.genre) {
        reasons.push(copy.adjacentBridge(fromGenre, item.genre));
        editorial = copy.editorialDiscovery(fromGenre, item.genre);
      } else {
        reasons.push(copy.festivalHighlight);
        editorial = copy.editorialDiscovery(fromGenre, item.genre);
      }
    } else {
      label = 'wildcard';
      reasons.push(hasSignals ? copy.wildcardBridge : copy.highEnergy);
      if (item.genre) reasons.push(copy.sharedGenre(item.genre));
      editorial = copy.editorialWildcard;
    }

    if (input.mood && fitsMood(item.genre, input.mood)) {
      reasons.push(copy.moodFit);
      if (category !== 'wildcard') label = label === 'discovery' ? 'discovery' : 'mood';
    }

    return {
      id: item.dj.id,
      name: item.dj.name,
      genre: item.genre,
      color: colorOf(item.dj, item.genre),
      category,
      label: category === 'picked' && hasSignals && label === 'mood' ? 'strong' : label,
      editorial,
      reasons: [...new Set(reasons)].slice(0, 3),
      score: item.score,
    };
  }

  const picked = pickedRaw.map((item) => toArtist(item, 'picked'));
  const discoveries = discoveryRaw.map((item) => toArtist(item, 'discovery'));
  const wildcard = wildcardCandidate ? toArtist(wildcardCandidate, 'wildcard') : null;

  return {
    hasSignals,
    savedIds,
    savedGenres,
    picked,
    discoveries,
    wildcard,
    counts: hasSignals
      ? {
          picked: picked.length,
          discoveries: discoveries.length,
          wildcard: wildcard ? 1 : 0,
        }
      : null,
  };
}

function inferGenresFromRoster(roster: ScheduleDj[]): string[] {
  const counts = new Map<string, number>();
  for (const dj of roster) {
    const genre = genreOf(dj);
    if (!genre) continue;
    counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => genre);
}

export function discoveryLabelText(label: DiscoveryLabel, locale: Locale): string {
  const zh: Record<DiscoveryLabel, string> = {
    picked: '为你挑选',
    strong: '强匹配',
    related: '紧密相关',
    similar_saved: '接近已标记艺人',
    discovery: '新发现',
    wildcard: 'Raven 惊喜',
    mood: '贴合此刻心情',
  };
  const en: Record<DiscoveryLabel, string> = {
    picked: 'Picked for You',
    strong: 'Strong Match',
    related: 'Closely Related',
    similar_saved: 'Similar to Saved Artists',
    discovery: 'New Discovery',
    wildcard: 'Raven Wildcard',
    mood: 'Fits Your Current Mood',
  };
  return locale === 'zh' ? zh[label] : en[label];
}

export function artistDiscoveryLabel(
  artistId: string,
  bundle: DiscoveryBundle,
): DiscoveryLabel | null {
  if (bundle.picked.some((a) => a.id === artistId)) {
    return bundle.picked.find((a) => a.id === artistId)?.label ?? 'picked';
  }
  if (bundle.discoveries.some((a) => a.id === artistId)) return 'discovery';
  if (bundle.wildcard?.id === artistId) return 'wildcard';
  return null;
}

export function moodExplorationCopy(mood: DiscoveryMood, locale: Locale): string {
  const zh: Record<DiscoveryMood, string> = {
    euphoric: '正在探索这场更欢愉的一面。',
    dreamy: 'Raven 找到几条更梦幻的路径。',
    heavy: '正在探索这场更重的一面。',
    dark: 'Raven 找到几条更暗的路径。',
    groovy: '正在探索这场更有律动的一面。',
    emotional: '正在探索这场更情感的一面。',
    peak: '正在追这场的高光峰值。',
    underground: 'Raven 找到几条更地下的路径。',
  };
  const en: Record<DiscoveryMood, string> = {
    euphoric: 'Exploring a more euphoric side of the lineup.',
    dreamy: 'Raven found a few dreamier paths through this festival.',
    heavy: 'Exploring a harder side of the lineup.',
    dark: 'Raven found a few darker paths through this festival.',
    groovy: 'Exploring a groovier side of the lineup.',
    emotional: 'Exploring a more emotional side of the lineup.',
    peak: 'Chasing the peak-energy current in this festival.',
    underground: 'Raven found a few more underground paths.',
  };
  return locale === 'zh' ? zh[mood] : en[mood];
}
