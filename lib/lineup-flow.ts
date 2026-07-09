import type { LineupTimetableDay, LineupTimetableSlot } from './lineup-timetable';
import { formatLineupTimeRange } from './lineup-timetable';
import type { Locale } from './i18n';

export type FlowArcRole = 'open' | 'rise' | 'crest' | 'cross' | 'close';

export type FestivalFlowStop = {
  artistId: string;
  artistName: string;
  stageLabel: string;
  genreLabel: string;
  genreColor?: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  timeLabel: string;
  role: FlowArcRole;
  /** Why this stop matters on the path — Raven intelligence, not UI chrome. */
  why: string;
  /** Optional: what you leave behind by choosing this. */
  tradeoff?: string;
};

export type FestivalFlowDay = {
  dateKey: string;
  label: string;
  bannerDateLabel: string;
  arcLead: string;
  peaks: FestivalFlowStop[];
  route: FestivalFlowStop[];
  stages: LineupTimetableDay['stages'];
};

function toBaseStop(slot: LineupTimetableSlot, stageLabel: string) {
  return {
    artistId: slot.artistId,
    artistName: slot.artistName,
    stageLabel,
    genreLabel: slot.genreLabel,
    genreColor: slot.genreColor,
    startTime: slot.startTime,
    endTime: slot.endTime,
    startMinutes: slot.startMinutes,
    timeLabel: formatLineupTimeRange(slot.startTime, slot.endTime),
  };
}

function flattenDay(day: LineupTimetableDay) {
  return day.stages.flatMap((stage) =>
    stage.slots.map((slot) => toBaseStop(slot, stage.stageLabel)),
  );
}

function scorePeak(
  stop: ReturnType<typeof toBaseStop>,
  stageIndex: number,
): number {
  const hour = Math.floor(stop.startMinutes / 60) % 24;
  let score = 0;
  if (hour >= 21 || hour < 2) score += 4;
  else if (hour >= 18) score += 2;
  if (stageIndex === 0) score += 2;
  score += stop.startMinutes / 10000;
  return score;
}

function roleForIndex(index: number, total: number): FlowArcRole {
  if (total <= 1) return 'crest';
  if (index === 0) return 'open';
  if (index === total - 1) return 'close';
  if (index === Math.floor((total - 1) / 2)) return 'crest';
  return index < total / 2 ? 'rise' : 'cross';
}

function whyForRole(
  locale: Locale,
  role: FlowArcRole,
  stop: ReturnType<typeof toBaseStop>,
  prevStage?: string,
): { why: string; tradeoff?: string } {
  const stage = stop.stageLabel;
  const zh = locale === 'zh';

  switch (role) {
    case 'open':
      return {
        why: zh
          ? `从 ${stage} 进入——把身体先交给今晚。`
          : `Enter at ${stage} — let the night take the body first.`,
      };
    case 'rise':
      return {
        why: zh
          ? `升温。${stage} 把能量往上推。`
          : `The rise. ${stage} pushes the energy up.`,
        tradeoff:
          prevStage && prevStage !== stage
            ? zh
              ? `离开 ${prevStage} 的余温。`
              : `Leave the afterglow of ${prevStage}.`
            : undefined,
      };
    case 'crest':
      return {
        why: zh
          ? `今夜高点——${stage} 值得守住。`
          : `Night crest — ${stage} is worth protecting.`,
        tradeoff:
          prevStage && prevStage !== stage
            ? zh
              ? `同时间别处也在响，你选这里。`
              : `Elsewhere is loud too — you choose here.`
            : undefined,
      };
    case 'cross':
      return {
        why: zh
          ? `转场到 ${stage}——换一条呼吸。`
          : `Cross to ${stage} — change the breath.`,
        tradeoff: prevStage
          ? zh
            ? `放弃 ${prevStage} 的连续场。`
            : `Give up staying put at ${prevStage}.`
          : undefined,
      };
    case 'close':
      return {
        why: zh
          ? `收束在 ${stage}——让最后一声留下。`
          : `Close at ${stage} — let the last hit stay.`,
      };
  }
}

function withNarrative(
  locale: Locale,
  stops: ReturnType<typeof toBaseStop>[],
  roles?: FlowArcRole[],
): FestivalFlowStop[] {
  return stops.map((stop, index) => {
    const role = roles?.[index] ?? roleForIndex(index, stops.length);
    const prev = index > 0 ? stops[index - 1]?.stageLabel : undefined;
    const { why, tradeoff } = whyForRole(locale, role, stop, prev);
    return { ...stop, role, why, tradeoff };
  });
}

function pickPeaks(day: LineupTimetableDay, locale: Locale, limit = 3): FestivalFlowStop[] {
  const scored = day.stages.flatMap((stage, stageIndex) =>
    stage.slots.map((slot) => {
      const stop = toBaseStop(slot, stage.stageLabel);
      return { stop, score: scorePeak(stop, stageIndex) };
    }),
  );

  scored.sort((a, b) => b.score - a.score);

  const picked: ReturnType<typeof toBaseStop>[] = [];
  const seenArtists = new Set<string>();
  const seenStages = new Set<string>();

  for (const { stop } of scored) {
    if (picked.length >= limit) break;
    if (seenArtists.has(stop.artistId)) continue;
    if (seenStages.has(stop.stageLabel) && seenStages.size < day.stages.length) continue;
    picked.push(stop);
    seenArtists.add(stop.artistId);
    seenStages.add(stop.stageLabel);
  }

  if (picked.length < Math.min(limit, scored.length)) {
    for (const { stop } of scored) {
      if (picked.length >= limit) break;
      if (seenArtists.has(stop.artistId)) continue;
      picked.push(stop);
      seenArtists.add(stop.artistId);
    }
  }

  const ordered = picked.sort((a, b) => a.startMinutes - b.startMinutes);
  return withNarrative(
    locale,
    ordered,
    ordered.map((_, i) => (i === ordered.length - 1 ? 'crest' : i === 0 ? 'rise' : 'crest')),
  );
}

function pickRoute(day: LineupTimetableDay, locale: Locale, limit = 4): FestivalFlowStop[] {
  const all = flattenDay(day).sort((a, b) => a.startMinutes - b.startMinutes);
  if (!all.length) return [];

  const BUFFER = 45;
  const route: ReturnType<typeof toBaseStop>[] = [];
  const usedStages = new Set<string>();

  const firstStage = day.stages[0];
  const opener = firstStage?.slots[0]
    ? toBaseStop(firstStage.slots[0], firstStage.stageLabel)
    : all[0]!;
  route.push(opener);
  usedStages.add(opener.stageLabel);

  let cursor = opener.startMinutes + BUFFER;

  while (route.length < limit) {
    const candidates = all.filter(
      (stop) =>
        stop.startMinutes >= cursor &&
        !route.some((r) => r.artistId === stop.artistId && r.startMinutes === stop.startMinutes),
    );
    if (!candidates.length) break;

    candidates.sort((a, b) => {
      const stageBonusA = usedStages.has(a.stageLabel) ? 0 : 3;
      const stageBonusB = usedStages.has(b.stageLabel) ? 0 : 3;
      return scorePeak(b, 0) + stageBonusB - (scorePeak(a, 0) + stageBonusA);
    });

    const next = candidates[0]!;
    route.push(next);
    usedStages.add(next.stageLabel);
    cursor = next.startMinutes + BUFFER;
  }

  const ordered = route.sort((a, b) => a.startMinutes - b.startMinutes);
  return withNarrative(locale, ordered);
}

function arcLeadFor(locale: Locale, route: FestivalFlowStop[]): string {
  if (!route.length) return '';
  const stages = [...new Set(route.map((s) => s.stageLabel))];
  if (locale === 'zh') {
    if (stages.length <= 1) return `整晚守在 ${stages[0]} ——少转场，深呼吸。`;
    return `从 ${stages[0]} 走到 ${stages[stages.length - 1]} ——${stages.length} 个舞台，一条弧线。`;
  }
  if (stages.length <= 1) return `Hold ${stages[0]} for the night — fewer hops, deeper breath.`;
  return `From ${stages[0]} to ${stages[stages.length - 1]} — ${stages.length} stages, one arc.`;
}

export function buildFestivalFlow(
  days: LineupTimetableDay[],
  locale: Locale = 'en',
): FestivalFlowDay[] {
  return days.map((day) => {
    const route = pickRoute(
      day,
      locale,
      Math.min(4, Math.max(3, day.stages.length + 1)),
    );
    return {
      dateKey: day.dateKey,
      label: day.label,
      bannerDateLabel: day.bannerDateLabel,
      arcLead: arcLeadFor(locale, route),
      peaks: pickPeaks(day, locale, 3),
      route,
      stages: day.stages,
    };
  });
}
