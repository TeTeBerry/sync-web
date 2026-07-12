import type { FestivalAtmosphere } from '../festival-atmosphere';
import { getFestivalAtmosphere } from '../festival-atmosphere';
import type { Activity } from '../types';
import type { FestivalGenerationTheme } from './types';

type ThemeProfile = Omit<FestivalGenerationTheme, 'id' | 'displayName' | 'festivalSlug' | 'ravenAtmosphere'>;

const DEFAULT_THEME: ThemeProfile = {
  atmosphere: 'cosmic',
  primaryColor: '#7c6cff',
  secondaryColor: '#2a1f5c',
  accentColor: '#a78bfa',
  backgroundColor: '#07070b',
  glowColor: 'rgba(124, 108, 255, 0.28)',
  routeStyle: 'arc',
  motif: 'mist',
  copyTone: 'minimal',
};

const ATMOSPHERE_THEMES: Record<FestivalAtmosphere, ThemeProfile> = {
  amber: {
    atmosphere: 'enchanted',
    primaryColor: '#f1b44a',
    secondaryColor: '#3d2a12',
    accentColor: '#c084fc',
    backgroundColor: '#060402',
    glowColor: 'rgba(241, 180, 74, 0.26)',
    routeStyle: 'arc',
    motif: 'portal',
    copyTone: 'dreamlike',
  },
  neon: {
    atmosphere: 'neon',
    primaryColor: '#ff2d95',
    secondaryColor: '#1a0730',
    accentColor: '#22d3ee',
    backgroundColor: '#06030c',
    glowColor: 'rgba(255, 45, 149, 0.28)',
    routeStyle: 'pulse',
    motif: 'rings',
    copyTone: 'energetic',
  },
  electric: {
    atmosphere: 'coastal',
    primaryColor: '#32caff',
    secondaryColor: '#071018',
    accentColor: '#e8f7ff',
    backgroundColor: '#04050c',
    glowColor: 'rgba(50, 202, 255, 0.24)',
    routeStyle: 'wave',
    motif: 'horizon',
    copyTone: 'energetic',
  },
  ember: {
    atmosphere: 'industrial',
    primaryColor: '#ed6729',
    secondaryColor: '#1a0804',
    accentColor: '#fbbf24',
    backgroundColor: '#060302',
    glowColor: 'rgba(237, 103, 41, 0.26)',
    routeStyle: 'beam',
    motif: 'pulse',
    copyTone: 'intense',
  },
  steel: {
    atmosphere: 'urban',
    primaryColor: '#acb3bc',
    secondaryColor: '#101114',
    accentColor: '#e5e7eb',
    backgroundColor: '#040404',
    glowColor: 'rgba(172, 179, 188, 0.2)',
    routeStyle: 'beam',
    motif: 'tower',
    copyTone: 'minimal',
  },
  lime: {
    atmosphere: 'forest',
    primaryColor: '#bcef42',
    secondaryColor: '#101504',
    accentColor: '#f59e0b',
    backgroundColor: '#050504',
    glowColor: 'rgba(188, 239, 66, 0.22)',
    routeStyle: 'wave',
    motif: 'field',
    copyTone: 'energetic',
  },
  violet: DEFAULT_THEME,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

/**
 * Resolves cinematic generation theme from the existing festival atmosphere engine.
 * Keeps one source of truth for festival identity (getFestivalAtmosphere).
 */
export function resolveFestivalGenerationTheme(
  activity: Activity,
  displayName: string,
  dominantGenre?: string,
): FestivalGenerationTheme {
  const ravenAtmosphere = getFestivalAtmosphere(activity, dominantGenre);
  const profile = ATMOSPHERE_THEMES[ravenAtmosphere] ?? DEFAULT_THEME;
  const slug = slugify(displayName || activity.name || 'festival');

  return {
    id: slug || 'raven-default',
    festivalSlug: slug || undefined,
    displayName: displayName || activity.name || 'Festival',
    ravenAtmosphere,
    ...profile,
  };
}

export function festivalThemeCssVars(theme: FestivalGenerationTheme): Record<string, string> {
  return {
    '--gen-primary': theme.primaryColor,
    '--gen-secondary': theme.secondaryColor,
    '--gen-accent': theme.accentColor,
    '--gen-bg': theme.backgroundColor,
    '--gen-glow': theme.glowColor,
  };
}
