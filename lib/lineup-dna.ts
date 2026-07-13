import type { ScheduleDj } from './api';
import { resolveGenreBroadToken } from './lineup-genre';
import { isGenrePlaceholder } from './lineup-display';
import type { Locale } from './i18n';

export type DnaTraitId =
  | 'melodic'
  | 'euphoric'
  | 'high_energy'
  | 'underground'
  | 'hard'
  | 'groovy'
  | 'emotional'
  | 'experimental'
  | 'mainstage';

export type DnaIntensity = 'soft' | 'strong' | 'dominant';

export type FestivalDnaTrait = {
  id: DnaTraitId;
  label: string;
  intensity: DnaIntensity;
  copy: string;
  color: string;
  weight: number;
};

const TRAIT_RULES: Array<{ id: DnaTraitId; pattern: RegExp; color: string }> = [
  { id: 'melodic', pattern: /melodic|progressive|cinematic/i, color: '#7c6cff' },
  { id: 'euphoric', pattern: /trance|uplifting|big room|festival/i, color: '#4cc9f0' },
  { id: 'high_energy', pattern: /hardstyle|hardcore|bass|peak|festival|big room/i, color: '#ff4f7c' },
  { id: 'underground', pattern: /techno|minimal|industrial|acid|warehouse/i, color: '#94a3b8' },
  { id: 'hard', pattern: /hard|hardstyle|hardcore|hard techno/i, color: '#f97316' },
  { id: 'groovy', pattern: /house|disco|garage|funk|afro/i, color: '#22c55e' },
  { id: 'emotional', pattern: /melodic|progressive|ambient|cinematic/i, color: '#c084fc' },
  { id: 'experimental', pattern: /experimental|break|idm|leftfield|avant/i, color: '#14b8a6' },
  { id: 'mainstage', pattern: /big room|festival|mainstage|trance|hardstyle/i, color: '#fbbf24' },
];

function traitLabel(id: DnaTraitId, locale: Locale): string {
  const zh: Record<DnaTraitId, string> = {
    melodic: 'Melodic',
    euphoric: 'Euphoric',
    high_energy: 'High Energy',
    underground: 'Underground',
    hard: 'Hard',
    groovy: 'Groovy',
    emotional: 'Emotional',
    experimental: 'Experimental',
    mainstage: 'Mainstage',
  };
  const en: Record<DnaTraitId, string> = {
    melodic: 'Melodic',
    euphoric: 'Euphoric',
    high_energy: 'High Energy',
    underground: 'Underground',
    hard: 'Hard',
    groovy: 'Groovy',
    emotional: 'Emotional',
    experimental: 'Experimental',
    mainstage: 'Mainstage',
  };
  // Keep English trait names in both locales for Raven DNA visual language,
  // with localized qualitative copy below.
  void zh;
  return en[id];
}

function traitCopy(id: DnaTraitId, intensity: DnaIntensity, locale: Locale): string {
  const zhStrong: Record<DnaTraitId, string> = {
    melodic: '旋律感很强',
    euphoric: '欢愉能量充沛',
    high_energy: '高能阵容',
    underground: '地下气质清晰',
    hard: '重击感突出',
    groovy: '律动贯穿全场',
    emotional: '情感层次分明',
    experimental: '实验边缘活跃',
    mainstage: '主舞台电流明显',
  };
  const zhSoft: Record<DnaTraitId, string> = {
    melodic: '带一点旋律气质',
    euphoric: '带着欢愉的边缘',
    high_energy: '高能时有出现',
    underground: '地下气息穿插其中',
    hard: '偶尔走向更重',
    groovy: '律动作为支流存在',
    emotional: '情感线索隐约可见',
    experimental: '实验声音点缀其中',
    mainstage: '主舞台气息若隐若现',
  };
  const enStrong: Record<DnaTraitId, string> = {
    melodic: 'Strong melodic presence',
    euphoric: 'High euphoric energy',
    high_energy: 'High-energy lineup',
    underground: 'Clear underground current',
    hard: 'Heavy impact throughout',
    groovy: 'Groovy pulse across the night',
    emotional: 'Emotional depth in the cast',
    experimental: 'Experimental edges alive',
    mainstage: 'Mainstage voltage present',
  };
  const enSoft: Record<DnaTraitId, string> = {
    melodic: 'A soft melodic undercurrent',
    euphoric: 'Euphoria at the edges',
    high_energy: 'High energy in places',
    underground: 'Underground air between rooms',
    hard: 'Harder hits appear in pockets',
    groovy: 'Groove as a side current',
    emotional: 'Emotional traces in the mix',
    experimental: 'Experimental sparks appear',
    mainstage: 'Mainstage air at the margins',
  };

  if (locale === 'zh') {
    if (intensity === 'dominant') return zhStrong[id];
    if (intensity === 'strong') return zhStrong[id];
    return zhSoft[id];
  }
  if (intensity === 'dominant' || intensity === 'strong') return enStrong[id];
  return enSoft[id];
}

/**
 * Festival DNA from lineup genre distribution only — no personality data.
 * Qualitative intensities; never exact percentages.
 */
export function buildFestivalDna(djs: ScheduleDj[], locale: Locale): FestivalDnaTrait[] {
  const weights = new Map<DnaTraitId, number>();
  let total = 0;

  for (const dj of djs) {
    const genre = dj.genreLabel || dj.genre || '';
    if (!genre || isGenrePlaceholder(genre)) continue;
    total += 1;
    const broad = resolveGenreBroadToken(genre);
    for (const rule of TRAIT_RULES) {
      if (rule.pattern.test(genre) || (broad && rule.pattern.test(broad))) {
        weights.set(rule.id, (weights.get(rule.id) ?? 0) + 1);
      }
    }
  }

  if (total === 0) return [];

  const traits: FestivalDnaTrait[] = [];
  for (const rule of TRAIT_RULES) {
    const weight = weights.get(rule.id) ?? 0;
    if (weight <= 0) continue;
    const ratio = weight / total;
    const intensity: DnaIntensity =
      ratio >= 0.45 ? 'dominant' : ratio >= 0.22 ? 'strong' : 'soft';
    if (intensity === 'soft' && weight < 2) continue;
    traits.push({
      id: rule.id,
      label: traitLabel(rule.id, locale),
      intensity,
      copy: traitCopy(rule.id, intensity, locale),
      color: rule.color,
      weight,
    });
  }

  return traits
    .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label))
    .slice(0, 5);
}

export function festivalDnaLead(traits: FestivalDnaTrait[], locale: Locale): string {
  if (!traits.length) {
    return locale === 'zh'
      ? '这场的声音还在聚集——先跟感觉走。'
      : 'This festival’s sound is still gathering — follow feeling first.';
  }
  const top = traits.filter((t) => t.intensity !== 'soft').slice(0, 2);
  if (locale === 'zh') {
    if (top.length >= 2) return `${top[0]!.copy}，同时${top[1]!.copy.replace(/^[^\u4e00-\u9fff]*/, '') || top[1]!.copy}。`.replace('，同时。', '。');
    return `${traits[0]!.copy}。`;
  }
  if (traits.some((t) => t.id === 'underground') && traits.some((t) => t.id === 'mainstage')) {
    return 'Balanced underground and mainstage sound.';
  }
  if (top.length >= 2) return `${top[0]!.copy}. ${top[1]!.copy}.`;
  return `${traits[0]!.copy}.`;
}
