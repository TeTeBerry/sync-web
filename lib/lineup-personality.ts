import type { FestivalAtmosphere } from './festival-atmosphere';
import type { Locale } from './i18n';
import { isGenrePlaceholder } from './lineup-display';

export const PERSONALITY_SESSION_KEY = 'raven-web-personality-result';

export type LineupRecommendation = {
  djId: string;
  djName: string;
  genreLabel: string;
  matchScore: number;
  highlight?: string;
  dimensionBreakdown: Record<'E' | 'M' | 'S' | 'C', number>;
};

export type LineupPersonalityMatch = {
  available: true;
  personality: {
    type?: string;
    label: string;
    labelEn: string;
    description: string;
    genreTags: string[];
    color: string;
  };
  recommendations: {
    soulMatch: LineupRecommendation;
    mustSee: LineupRecommendation[];
    recommended: LineupRecommendation[];
    challenge: LineupRecommendation[];
  };
};

export type LineupPersonalityResponse =
  | LineupPersonalityMatch
  | { available: false; reason: 'no_personality_result' | 'lineup_unavailable' };

type PersonalityTestHrefInput = {
  locale: Locale;
  returnTo: string;
  atmosphere?: FestivalAtmosphere;
  festival?: string;
};

const ATMOSPHERES = new Set<FestivalAtmosphere>([
  'violet',
  'amber',
  'electric',
  'neon',
  'ember',
  'steel',
  'lime',
]);

export function isFestivalAtmosphere(value: string | null | undefined): value is FestivalAtmosphere {
  return Boolean(value && ATMOSPHERES.has(value as FestivalAtmosphere));
}

export function buildPersonalityTestHref({
  locale,
  returnTo,
  atmosphere,
  festival,
}: PersonalityTestHrefInput): string {
  const params = new URLSearchParams();
  params.set('returnTo', returnTo);
  if (atmosphere) params.set('atmosphere', atmosphere);
  if (festival) params.set('festival', festival);
  return `/${locale}/personality-test?${params.toString()}`;
}

export function readPersonalitySessionResult(): unknown | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PERSONALITY_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function unwrapPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return null;
  return 'data' in payload ? (payload as { data: unknown }).data : payload;
}

export function parsePersonalityResponse(payload: unknown): LineupPersonalityResponse | null {
  const value = unwrapPayload(payload);
  if (!value || typeof value !== 'object' || !('available' in value)) return null;
  return value as LineupPersonalityResponse;
}

export async function fetchLineupPersonalityMatch(
  activityLegacyId: number,
  signedIn: boolean,
): Promise<LineupPersonalityResponse | null> {
  const sessionResult = readPersonalitySessionResult();
  const request = sessionResult
    ? fetch(`/api/personality-test/lineup/${activityLegacyId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ result: sessionResult }),
        cache: 'no-store',
      })
    : signedIn
      ? fetch(`/api/lineup-match/${activityLegacyId}`, { cache: 'no-store' })
      : null;

  if (!request) return null;

  const response = await request;
  if (!response.ok) return null;
  return parsePersonalityResponse(await response.json());
}

function topDimension(
  breakdown: LineupRecommendation['dimensionBreakdown'],
): keyof LineupRecommendation['dimensionBreakdown'] | null {
  const ranked = (Object.entries(breakdown) as Array<
    [keyof LineupRecommendation['dimensionBreakdown'], number]
  >).sort(([, a], [, b]) => b - a);
  return ranked[0]?.[0] ?? null;
}

/** Short Artist Spotlight reasons — specific, calm, not scorecard language. */
export function buildSpotlightReason(
  match: LineupRecommendation,
  locale: Locale,
  role: 'soul' | 'mustSee' | 'adjacent' | 'wildcard',
): string {
  if (match.highlight?.trim()) return match.highlight.trim();

  const genre = isGenrePlaceholder(match.genreLabel) ? null : match.genreLabel;
  const dim = topDimension(match.dimensionBreakdown);
  const zh = locale === 'zh';

  if (role === 'soul') {
    if (zh) {
      if (dim === 'E') return genre ? `${genre} 里，会把你拉到最前排的名字。` : '会把你拉到最前排的名字。';
      if (dim === 'M') return genre ? `${genre} 的细处，最值得你先听清。` : '细处最值得你先听清。';
      if (dim === 'S') return genre ? `${genre} 的气氛，会先接住你。` : '气氛会先接住你。';
      if (dim === 'C') return genre ? `${genre} 的冲击，会记住身体。` : '冲击会先记住身体。';
      return genre ? `这场里，与你最贴近的 ${genre}。` : '这场里，与你最贴近的声音。';
    }
    if (dim === 'E') return genre ? `The ${genre} name that pulls you to the front.` : 'The name that pulls you to the front.';
    if (dim === 'M') return genre ? `${genre} with the craft worth hearing first.` : 'The craft worth hearing first.';
    if (dim === 'S') return genre ? `${genre} atmosphere that meets you first.` : 'Atmosphere that meets you first.';
    if (dim === 'C') return genre ? `${genre} impact the body will remember.` : 'Impact the body will remember.';
    return genre ? `Closest ${genre} pull in this world.` : 'Closest pull in this world.';
  }

  if (role === 'mustSee') {
    if (zh) return genre ? `同频的 ${genre}——值得守住。` : '同频的声音——值得守住。';
    return genre ? `Same-frequency ${genre} — worth protecting.` : 'Same-frequency sound — worth protecting.';
  }

  if (role === 'adjacent') {
    if (zh) return genre ? `从你的偏好，自然走到 ${genre}。` : '从你的偏好，自然走到下一条声音。';
    return genre ? `A natural bridge into ${genre}.` : 'A natural bridge into the next sound.';
  }

  if (zh) return genre ? `${genre} 里，留一条意外的路。` : '留一条意外的路。';
  return genre ? `One unexpected path through ${genre}.` : 'One unexpected path through the night.';
}

export function personalityDisplayName(match: LineupPersonalityMatch, locale: Locale): string {
  return locale === 'zh' ? match.personality.label : match.personality.labelEn;
}
