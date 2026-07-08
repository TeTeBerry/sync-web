import type { ScheduleDj, SchedulePerformance } from './api';
import { getMessages, type Locale } from './i18n';
import { genrePendingLabel, isGenrePlaceholder } from './lineup-display';

export const GENRE_BROAD: Record<string, string> = {
  House: 'House',
  house: 'House',
  'Chicago house': 'House',
  'Deep House': 'House',
  'deep house': 'House',
  'Progressive House': 'House',
  'Progressive house': 'House',
  'Tech House': 'House',
  'tech house': 'House',
  'Funky House': 'House',
  'funky house': 'House',
  'Jackin House': 'House',
  'jackin house': 'House',
  'Soulful House': 'House',
  'soulful house': 'House',
  'Nu Disco': 'House',
  'nu disco': 'House',
  'Euro House': 'House',
  'Tropical House': 'House',
  'piano house': 'House',
  'Big Room': 'House',
  'Hard House': 'House',
  Electro: 'House',
  Euro: 'House',
  Disco: 'House',
  Techno: 'Techno',
  'Dub Techno': 'Techno',
  'Minimal Techno': 'Techno',
  'Melodic and cinematic techno': 'Techno',
  Minimal: 'Techno',
  Industrial: 'Techno',
  'Hard Techno': 'Hard',
  'Hard techno': 'Hard',
  Hardstyle: 'Hardstyle',
  hardstyle: 'Hardstyle',
  'Dutch hardstyle': 'Hardstyle',
  rawstyle: 'Hardstyle',
  Hardcore: 'Hardcore',
  'Hardcore box set': 'Hardcore',
  'early hardcore': 'Hardcore',
  'Happy Hardcore': 'Hardcore',
  frenchcore: 'Hardcore',
  Frenchcore: 'Hardcore',
  Gabber: 'Hardcore',
  'Industrial Techno & Hardcore': 'Hardcore',
  Hard: 'Hard',
  Trance: 'Trance',
  'Progressive Trance': 'Trance',
  Psytrance: 'Trance',
  psytrance: 'Trance',
  'Psy-Trance': 'Trance',
  'Tech Trance': 'Trance',
  'Hard Trance': 'Trance',
  'uplifting electronic': 'Trance',
  'Drum n Bass': 'Drum & Bass',
  'Drum & Bass': 'Drum & Bass',
  'DnB mixes': 'Drum & Bass',
  Dubstep: 'Dubstep',
  dubstep: 'Dubstep',
  'Dubstep producer': 'Dubstep',
  Bass: 'Bass',
  'Future Bass': 'Bass',
  'UK Bass': 'Bass',
  'including bass and trap': 'Bass',
  'EDM base with Trap': 'Bass',
  'EDM blended with Cantopop': 'Bass',
  Trap: 'Bass',
  riddim: 'Bass',
  Ambient: 'Ambient',
  ambient: 'Ambient',
  'Dark Ambient': 'Ambient',
  'dark ambient': 'Ambient',
  Breakbeat: 'Breaks',
  'UK Garage': 'UK Garage',
  Acid: 'Acid',
  'Acid Jazz': 'Acid',
  'hip hop': 'Hip Hop',
  'hip-hop': 'Hip Hop',
  Reggae: 'Reggae',
  'Reggae Artist': 'Reggae',
  latin: 'Latin',
  merengue: 'Latin',
};

export const GENRE_BROAD_COLORS: Record<string, string> = {
  House: '#4cc9f0',
  Techno: '#a855f7',
  Hard: '#ff0066',
  Hardstyle: '#f97316',
  Hardcore: '#dc2626',
  Trance: '#22c55e',
  'Drum & Bass': '#eab308',
  Dubstep: '#8b5cf6',
  Bass: '#f59e0b',
  Ambient: '#06b6d4',
  Breaks: '#84cc16',
  'UK Garage': '#ec4899',
  Acid: '#14b8a6',
  'Hip Hop': '#6366f1',
  Reggae: '#fbbf24',
  Latin: '#ef4444',
};

const GENRE_LEXICON_HINTS: Array<{ pattern: RegExp; broad: string }> = [
  { pattern: /\bhardstyle\b/i, broad: 'Hardstyle' },
  { pattern: /\bhardcore\b/i, broad: 'Hardcore' },
  { pattern: /\btechno\b/i, broad: 'Techno' },
  { pattern: /\btrance\b/i, broad: 'Trance' },
  { pattern: /\bhouse\b/i, broad: 'House' },
  { pattern: /\bdisco\b/i, broad: 'House' },
  { pattern: /\bdubstep\b/i, broad: 'Dubstep' },
  { pattern: /\b(drum\s*(n|&)\s*bass|dnb)\b/i, broad: 'Drum & Bass' },
  { pattern: /\bbass\b/i, broad: 'Bass' },
];

const NAME_GENRE_HINTS = GENRE_LEXICON_HINTS;

export const MISSING_GENRE_LABEL = '—';
const GENRE_PLACEHOLDER = '风格待补充';

function splitGenreLabelTokens(genreLabel?: string): string[] {
  if (!genreLabel?.trim()) return [];
  return genreLabel
    .split(/\s*[·/|]\s*/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function inferBroadGenreFromText(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  for (const hint of GENRE_LEXICON_HINTS) {
    if (hint.pattern.test(trimmed)) return hint.broad;
  }
  return undefined;
}

function mapGenreToken(token: string): string | undefined {
  const trimmed = token.trim();
  if (!trimmed) return undefined;
  if (GENRE_BROAD[trimmed]) return GENRE_BROAD[trimmed];
  if (GENRE_BROAD[trimmed.toLowerCase()]) return GENRE_BROAD[trimmed.toLowerCase()];
  return undefined;
}

export function resolveGenreBroadToken(token: string): string | undefined {
  return mapGenreToken(token);
}

function resolveBroadGenreFromFields(input: {
  genre?: string;
  genreLabel?: string;
  artistName?: string;
}): string | undefined {
  const primary = input.genre?.trim();
  if (primary && !isGenrePlaceholder(primary)) {
    const mappedPrimary = mapGenreToken(primary) ?? inferBroadGenreFromText(primary);
    if (mappedPrimary) return mappedPrimary;
  }

  for (const token of splitGenreLabelTokens(input.genreLabel)) {
    if (isGenrePlaceholder(token)) continue;
    const mapped = mapGenreToken(token) ?? inferBroadGenreFromText(token);
    if (mapped) return mapped;
  }

  const artistName = input.artistName?.trim() ?? '';
  for (const hint of NAME_GENRE_HINTS) {
    if (hint.pattern.test(artistName)) return hint.broad;
  }

  return undefined;
}

/** Primary catalog genre for card / timetable display (e.g. Funky House). */
export function resolveCatalogGenreDisplay(
  input: {
    genre?: string;
    genreLabel?: string;
  },
  locale?: Locale,
): string {
  const genre = input.genre?.trim();
  if (genre && !isGenrePlaceholder(genre)) return genre;

  for (const token of splitGenreLabelTokens(input.genreLabel)) {
    if (!isGenrePlaceholder(token)) return token;
  }

  return '';
}

export function otherGenreLabel(locale: Locale): string {
  return getMessages(locale).eventDetail.lineupOtherGenre;
}

export function genreBroadKey(dj: ScheduleDj, locale: Locale): string {
  return resolveBroadGenreFromFields({
    genre: dj.genre,
    genreLabel: dj.genreLabel,
    artistName: dj.name,
  }) ?? otherGenreLabel(locale);
}

export function resolveTimetableBroadGenre(performance: SchedulePerformance): string {
  return (
    resolveBroadGenreFromFields({
      genre: performance.genre,
      genreLabel: performance.genreLabel,
      artistName: performance.artistName,
    }) ?? ''
  );
}

export function formatTimetableGenreLabel(broadGenre: string): string {
  return broadGenre.trim() || MISSING_GENRE_LABEL;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Strip stage references from lineup names when the stage column already provides context. */
export function sanitizeTimetableArtistName(
  artistName: string,
  stageLabel?: string,
): string {
  let name = artistName.trim();

  name = name.replace(/\s*\([^)]*\bstage\b[^)]*\)/gi, '').trim();

  const stage = stageLabel?.trim();
  if (stage) {
    const stagePattern = new RegExp(`\\s+${escapeRegExp(stage)}$`, 'i');
    name = name.replace(stagePattern, '').trim();
  }

  return name || artistName.trim();
}

/** Normalize diacritics: HALŌ → HALO, ÉTÉ → ETE, etc. */
export function normalizeArtistName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function genreColorForBroad(broadGenre: string, fallback?: string): string {
  return GENRE_BROAD_COLORS[broadGenre] || fallback || 'var(--primary)';
}

export function groupByBroadGenre(
  djs: ScheduleDj[],
  locale: Locale,
): Map<string, { color: string; djs: ScheduleDj[] }> {
  const seen = new Set<string>();
  const groups = new Map<string, { color: string; djs: ScheduleDj[] }>();

  for (const dj of djs) {
    const key = normalizeArtistName(dj.name);
    if (seen.has(key)) continue;
    seen.add(key);

    const broad = genreBroadKey(dj, locale);
    const entry = groups.get(broad);
    if (entry) {
      entry.djs.push(dj);
    } else {
      groups.set(broad, {
        color: genreColorForBroad(broad, dj.genreColor),
        djs: [dj],
      });
    }
  }

  return groups;
}
