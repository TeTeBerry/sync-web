import type { ScheduleDj } from './api';
import type { Activity } from './types';
import type { Locale } from './i18n';
import { getFestivalAtmosphere, type FestivalAtmosphere } from './festival-atmosphere';
import { resolveLineupStageLabel } from './lineup-display';
import { resolveGenreBroadToken } from './lineup-genre';

export type MustSeeArtist = {
  name: string;
  reason: string;
};

export type TravelArrival = {
  land: string;
  settle: string;
  gate: string;
};

export type EventAiSummary = {
  vibe: string;
  story: string;
  awaiting: string;
  genres: string[];
  mustSee: MustSeeArtist[];
  travel: string;
  arrival: TravelArrival;
  artistCount: number;
  genreCount: number;
};

function broadGenre(dj: ScheduleDj): string {
  const primary = dj.genre?.trim();
  if (primary) {
    const mapped = resolveGenreBroadToken(primary);
    if (mapped) return mapped;
  }
  const first = dj.genreLabel?.split('·')[0]?.trim();
  if (first) {
    const mapped = resolveGenreBroadToken(first);
    if (mapped) return mapped;
  }
  return 'Other';
}

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

function topGenres(djs: ScheduleDj[], limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const dj of uniqueArtists(djs)) {
    const genre = broadGenre(dj);
    counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre)
    .filter((genre) => genre !== 'Other')
    .slice(0, limit);
}

function placeLabel(activity: Activity): string | undefined {
  return activity.city ?? activity.area ?? activity.location;
}

function festivalIdentity(activity: Activity): string {
  return `${activity.name} ${activity.title ?? ''} ${(activity.alias ?? []).join(' ')}`.toLowerCase();
}

function festivalNameOf(activity: Activity): string {
  return activity.title?.trim() || activity.name.trim();
}

/** Hero invite: short sensory hook — place + sound, no story restatement. */
function buildVibe(
  locale: Locale,
  activity: Activity,
  genres: string[],
  artistCount: number,
  atmosphere: FestivalAtmosphere,
): string {
  const place = placeLabel(activity);
  const sound = genres[0];
  const identity = festivalIdentity(activity);
  const isIndoor = activity.activityType === 'indoor';

  if (artistCount === 0 && activity.description) {
    const sentence = activity.description.split(/[.!?。！？]/)[0]?.trim();
    if (sentence && sentence.length <= 90) return sentence;
  }

  if (locale === 'zh') {
    if (identity.includes('tomorrowland') || identity.includes('明日世界')) {
      return place ? `${place} · 暖金与慢场` : '暖金与慢场';
    }
    if (identity.includes('ultra') || identity.includes('超世代')) {
      return place ? `${place} · 霓虹主舞台` : '霓虹主舞台';
    }
    if (identity.includes('edc') || identity.includes('electric daisy')) {
      return place ? `${place} · 霓虹狂欢` : '霓虹狂欢';
    }
    if (identity.includes('lost lands') || identity.includes('失落之地')) {
      return place ? `${place} · 恐龙与低音` : '恐龙与低音';
    }
    if (identity.includes('defqon')) {
      return place ? `${place} · Hardstyle 圣地` : 'Hardstyle 圣地';
    }
    if (identity.includes('awakenings') || identity.includes('觉醒')) {
      return place ? `${place} · 冷静 Techno` : '冷静 Techno';
    }
    if (identity.includes('time warp')) {
      return place ? `${place} · 工业长夜` : '工业长夜';
    }
    if (identity.includes('creamfields') || identity.includes('奶油田')) {
      return place ? `${place} · 草地大音响` : '草地大音响';
    }
    if (identity.includes('sonar')) {
      return place ? `${place} · 实验与城市` : '实验与城市';
    }
    if (identity.includes('coachella')) {
      return place ? `${place} · 沙漠日落` : '沙漠日落';
    }

    if (place && sound) return `${place} · ${sound}`;
    if (place && isIndoor) return `${place} · 室内长夜`;
    if (place) return `${place} · 一段旅程`;
    if (sound) return sound;
    if (atmosphere === 'steel') return '冷静、精准的舞池';
    if (atmosphere === 'ember') return '厚重低音';
    if (atmosphere === 'neon') return '霓虹狂欢';
    if (atmosphere === 'electric') return '霓虹峰值';
    if (atmosphere === 'amber') return '暖光长夜';
    if (atmosphere === 'lime') return '开阔户外';
    return '夜色与音乐';
  }

  if (identity.includes('tomorrowland') || identity.includes('明日世界')) {
    return place ? `${place} · warm gold, slow wonder` : 'Warm gold, slow wonder';
  }
  if (identity.includes('ultra') || identity.includes('超世代')) {
    return place ? `${place} · neon mainstage` : 'Neon mainstage';
  }
  if (identity.includes('edc') || identity.includes('electric daisy')) {
    return place ? `${place} · neon carnival` : 'Neon carnival';
  }
  if (identity.includes('lost lands') || identity.includes('失落之地')) {
    return place ? `${place} · dinosaurs and bass` : 'Dinosaurs and bass';
  }
  if (identity.includes('defqon')) {
    return place ? `${place} · hardstyle ground zero` : 'Hardstyle ground zero';
  }
  if (identity.includes('awakenings') || identity.includes('觉醒')) {
    return place ? `${place} · cold techno` : 'Cold techno';
  }
  if (identity.includes('time warp')) {
    return place ? `${place} · industrial long night` : 'Industrial long night';
  }
  if (identity.includes('creamfields') || identity.includes('奶油田')) {
    return place ? `${place} · fields and big sound` : 'Fields and big sound';
  }
  if (identity.includes('sonar')) {
    return place ? `${place} · city and experiment` : 'City and experiment';
  }
  if (identity.includes('coachella')) {
    return place ? `${place} · desert sunset` : 'Desert sunset';
  }

  if (place && sound) return `${place} · ${sound}`;
  if (place && isIndoor) return `${place} · indoor long night`;
  if (place) return `${place} · one journey`;
  if (sound) return sound;
  if (atmosphere === 'steel') return 'Cold, exact floor energy';
  if (atmosphere === 'ember') return 'Heavy low-end';
  if (atmosphere === 'neon') return 'Neon carnival';
  if (atmosphere === 'electric') return 'Neon peak hours';
  if (atmosphere === 'amber') return 'Warm light, long night';
  if (atmosphere === 'lime') return 'Open-air roar';
  return 'Night and music';
}

/** Story: why this journey is worth arriving — progresses beyond the hero hook. */
function buildStory(
  locale: Locale,
  activity: Activity,
  genres: string[],
  artistCount: number,
  atmosphere: FestivalAtmosphere,
): string {
  const place = placeLabel(activity);
  const identity = festivalIdentity(activity);
  const sound = genres.slice(0, 2).join(locale === 'zh' ? ' / ' : ' / ');
  const name = festivalNameOf(activity);
  const isIndoor = activity.activityType === 'indoor';

  if (activity.description) {
    const sentence = activity.description.split(/[.!?。！？]/)[0]?.trim();
    if (sentence && sentence.length >= 24 && sentence.length <= 160) {
      return sentence;
    }
  }

  if (locale === 'zh') {
    if (identity.includes('tomorrowland') || identity.includes('明日世界')) {
      return place
        ? `在 ${place}，${name} 不只是场地——是一座为音乐搭起的世界。值得专程飞过去，把整晚交给慢场与暖光。`
        : `${name} 不只是场地——是一座为音乐搭起的世界。值得专程飞过去。`;
    }
    if (identity.includes('ultra') || identity.includes('超世代')) {
      return place
        ? `${name} 把 ${place} 的主舞台变成城市心跳：峰值、万人同频。这段旅程为高能而存在。`
        : `${name} 的主舞台像城市心跳：峰值、万人同频。这段旅程为高能而存在。`;
    }
    if (identity.includes('edc') || identity.includes('electric daisy')) {
      return place
        ? `${name} 在 ${place} 铺开粉蓝紫的夜空——电光、欢愉、万人同频，身体会先记住。`
        : `${name} 铺开粉蓝紫的夜空——电光、欢愉、万人同频。`;
    }
    if (identity.includes('lost lands') || identity.includes('失落之地')) {
      return place
        ? `在 ${place}，${name} 让地面跟着低音震。恐龙、火焰、厚重 drop——这是身体先记住的旅程。`
        : `${name} 让地面跟着低音震。恐龙、火焰、厚重 drop。`;
    }
    if (identity.includes('defqon')) {
      return place
        ? `${name} 在 ${place} 是 Hardstyle 的朝圣——冲击、合唱、整片场地一起跳。`
        : `${name} 是 Hardstyle 的朝圣——冲击、合唱、整片场地一起跳。`;
    }
    if (identity.includes('awakenings') || identity.includes('觉醒')) {
      return place
        ? `${name} 把 ${place} 收成冷静的 Techno 夜。少装饰、多呼吸，适合把整晚交给舞池。`
        : `${name} 是冷静的 Techno 夜。少装饰、多呼吸，适合把整晚交给舞池。`;
    }
    if (identity.includes('time warp')) {
      return place
        ? `在 ${place}，${name} 是工业长夜——精准、厚重，从黄昏推到日出。`
        : `${name} 是工业长夜——精准、厚重，从黄昏推到日出。`;
    }
    if (identity.includes('creamfields') || identity.includes('奶油田')) {
      return place
        ? `${name} 在 ${place} 打开草地与大音响——开阔、明亮，英式户外的集体狂欢。`
        : `${name} 打开草地与大音响——开阔、明亮，英式户外的集体狂欢。`;
    }
    if (identity.includes('sonar')) {
      return place
        ? `${name} 让 ${place} 同时成为实验与城市夜——白天听讲座，夜里进舞池。`
        : `${name} 同时是实验与城市夜——白天听讲座，夜里进舞池。`;
    }
    if (identity.includes('coachella')) {
      return place
        ? `在 ${place}，${name} 是沙漠日落与跨界阵容——白天的热浪，夜里的主舞台。`
        : `${name} 是沙漠日落与跨界阵容——白天的热浪，夜里的主舞台。`;
    }

    if (artistCount === 0) {
      return place
        ? `${name} 在 ${place} 还在成形。先记住想去的理由——阵容一出，旅程就能落地。`
        : `${name} 还在成形。先记住想去的理由——阵容一出，旅程就能落地。`;
    }

    if (place && sound && isIndoor) {
      return `${name} 把 ${place} 收成室内长夜。${sound} 主导——动线集中，适合从头跟到尾。`;
    }
    if (place && sound) {
      return `${name} 在 ${place} 展开 ${sound}。这不是行程表，是值得专程抵达的旅程。`;
    }
    if (place) {
      return `${name} 属于 ${place}。信息可以后补，想去的感觉先留下。`;
    }
    if (sound) {
      return `${name} 以 ${sound} 定义这段旅程——先确认你想去，再把路走顺。`;
    }
    return `${name}。先确认你想去，再把路走顺。`;
  }

  if (identity.includes('tomorrowland') || identity.includes('明日世界')) {
    return place
      ? `In ${place}, ${name} is more than a venue — a world built for music. Worth the flight for warm light and a long, slow night.`
      : `${name} is more than a venue — a world built for music. Worth the flight.`;
  }
  if (identity.includes('ultra') || identity.includes('超世代')) {
    return place
      ? `${name} turns the ${place} mainstage into a city heartbeat — peak hours, a crowd moving as one.`
      : `${name} turns the mainstage into a city heartbeat — peak hours, a crowd moving as one.`;
  }
  if (identity.includes('edc') || identity.includes('electric daisy')) {
    return place
      ? `${name} paints ${place} in neon pink and electric blue — euphoria, color, a crowd moving as one.`
      : `${name} paints the night in neon pink and electric blue — euphoria, color, a crowd moving as one.`;
  }
  if (identity.includes('lost lands') || identity.includes('失落之地')) {
    return place
      ? `In ${place}, ${name} shakes the ground — dinosaurs, fire, and drops your body remembers first.`
      : `${name} shakes the ground — dinosaurs, fire, and drops your body remembers first.`;
  }
  if (identity.includes('defqon')) {
    return place
      ? `${name} in ${place} is hardstyle pilgrimage — impact, choruses, a field jumping as one.`
      : `${name} is hardstyle pilgrimage — impact, choruses, a field jumping as one.`;
  }
  if (identity.includes('awakenings') || identity.includes('觉醒')) {
    return place
      ? `${name} cools ${place} into exact techno — less decoration, more breath, a night for the floor.`
      : `${name} is exact techno — less decoration, more breath, a night for the floor.`;
  }
  if (identity.includes('time warp')) {
    return place
      ? `In ${place}, ${name} is an industrial long night — precise, heavy, dusk to sunrise.`
      : `${name} is an industrial long night — precise, heavy, dusk to sunrise.`;
  }
  if (identity.includes('creamfields') || identity.includes('奶油田')) {
    return place
      ? `${name} opens ${place} into fields and big sound — bold, bright, a UK outdoor roar.`
      : `${name} opens into fields and big sound — bold, bright, a UK outdoor roar.`;
  }
  if (identity.includes('sonar')) {
    return place
      ? `${name} makes ${place} both experiment and city night — talks by day, floors by night.`
      : `${name} is both experiment and city night — talks by day, floors by night.`;
  }
  if (identity.includes('coachella')) {
    return place
      ? `In ${place}, ${name} is desert sunset and a cross-genre bill — heat by day, mainstage by night.`
      : `${name} is desert sunset and a cross-genre bill — heat by day, mainstage by night.`;
  }

  if (artistCount === 0) {
    return place
      ? `${name} in ${place} is still forming. Keep the reason you want to go — the journey lands when artists drop.`
      : `${name} is still forming. Keep the reason you want to go — the journey lands when artists drop.`;
  }

  if (place && sound && isIndoor) {
    return `${name} folds ${place} into an indoor long night. ${sound} leads — tight paths, stay for the arc.`;
  }
  if (place && sound) {
    return `${name} unfolds ${sound} in ${place}. Not an itinerary — a journey worth arriving for.`;
  }
  if (place) {
    return `${name} belongs to ${place}. Details can wait; the desire comes first.`;
  }
  if (sound) {
    return `${name} is defined by ${sound} — decide you want to go, then clear the path.`;
  }
  return `${name}. Decide you want to go — then clear the path.`;
}

function buildAwaiting(locale: Locale, activity: Activity): string {
  const place = placeLabel(activity);
  const name = festivalNameOf(activity);

  if (locale === 'zh') {
    return place
      ? `${name} 在 ${place} 的阵容还在确认——先把这段旅程放进心里，名字一出，路线就能成形。`
      : `${name} 的阵容还在确认——先留下感觉，名字一出，路线就能成形。`;
  }

  return place
    ? `${name} in ${place} is still confirming artists — hold the journey; when names drop, the path can take shape.`
    : `${name} is still confirming artists — hold the feeling; when names drop, the path can take shape.`;
}

/** Festival-owned, short — taste personalization happens client-side when signals exist. */
function reasonForArtist(
  locale: Locale,
  dj: ScheduleDj,
  index: number,
  dominantGenre: string | undefined,
  stagesPublished: boolean,
): string {
  const genre = broadGenre(dj);
  const stage = resolveLineupStageLabel(
    locale,
    { stage: dj.stage, stageLabel: dj.stageLabel },
    { stagesPublished },
  );
  const sound = genre !== 'Other' ? genre : dominantGenre;

  if (locale === 'zh') {
    if (index === 0) {
      if (sound && stage) return `${sound} 的高点 · ${stage}`;
      if (sound) return `${sound} 的高点——先守住`;
      return '这场的焦点——先写入路线';
    }
    if (index === 1) {
      if (stage && sound) return `${stage} 上的 ${sound}`;
      if (stage) return `转去 ${stage} 也值得`;
      if (sound) return `${sound} 的另一面`;
      return '第二条该守的线';
    }
    if (stage) return `${stage} · 别错过`;
    if (sound) return `${sound} 里的惊喜`;
    return '值得写入路线';
  }

  if (index === 0) {
    if (sound && stage) return `${sound} crest · ${stage}`;
    if (sound) return `${sound} crest — protect first`;
    return 'The journey’s focus — keep on your route';
  }
  if (index === 1) {
    if (stage && sound) return `${sound} at ${stage}`;
    if (stage) return `Worth the move to ${stage}`;
    if (sound) return `The other face of ${sound}`;
    return 'The second line to protect';
  }
  if (stage) return `${stage} · don’t miss`;
  if (sound) return `A surprise inside ${sound}`;
  return 'Worth the route';
}

function mustSeeArtists(
  djs: ScheduleDj[],
  locale: Locale,
  dominantGenre: string | undefined,
  stagesPublished: boolean,
  limit = 3,
): MustSeeArtist[] {
  return uniqueArtists(djs)
    .sort((a, b) => {
      const byPopularity = (b.popularity ?? 0) - (a.popularity ?? 0);
      if (byPopularity !== 0) return byPopularity;
      return a.name.localeCompare(b.name, locale === 'zh' ? 'zh-CN' : 'en');
    })
    .slice(0, limit)
    .map((dj, index) => ({
      name: dj.name,
      reason: reasonForArtist(locale, dj, index, dominantGenre, stagesPublished),
    }));
}

function buildTravelTip(locale: Locale, activity: Activity): string {
  const city = activity.city ?? activity.area;
  if (locale === 'zh') {
    return city
      ? `先把飞往 ${city} 的路想清楚——落地、落脚、入场，三步顺了，旅程就稳了。`
      : '先把路想清楚——落地、落脚、入场，三步顺了，旅程就稳了。';
  }
  return city
    ? `Clear the path to ${city} — land, settle, gate. When those three hold, the journey holds.`
    : 'Clear the path — land, settle, gate. When those three hold, the journey holds.';
}

function buildArrival(
  locale: Locale,
  activity: Activity,
  travel: {
    nearestAirport: string;
    arrivalWindow: string;
    bestArea?: string;
    stayInsight?: string;
    shuttle?: string;
  },
): TravelArrival {
  const city = activity.city ?? activity.area;

  if (locale === 'zh') {
    return {
      land: travel.nearestAirport
        ? `${travel.nearestAirport}${travel.arrivalWindow ? ` · ${travel.arrivalWindow}` : ''}`
        : city
          ? `飞往 ${city}，预留入境与转机缓冲`
          : '先锁定抵达枢纽，预留缓冲',
      settle: travel.bestArea
        ? `住进 ${travel.bestArea}${travel.stayInsight ? `——${travel.stayInsight}` : ''}`
        : city
          ? `在 ${city} 落脚，靠近场馆或接驳`
          : '先定一晚落脚，靠近场馆或接驳',
      gate: travel.shuttle
        ? travel.shuttle
        : '入场前确认交通末班与取票时间——到了闸口，只剩音乐',
    };
  }

  return {
    land: travel.nearestAirport
      ? `${travel.nearestAirport}${travel.arrivalWindow ? ` · ${travel.arrivalWindow}` : ''}`
      : city
        ? `Fly into ${city} — buffer entry and transfers`
        : 'Lock your arrival hub and leave buffer',
    settle: travel.bestArea
      ? `Stay in ${travel.bestArea}${travel.stayInsight ? ` — ${travel.stayInsight}` : ''}`
      : city
        ? `Settle in ${city}, close to the venue or shuttle`
        : 'Settle one night close to the venue or shuttle',
    gate: travel.shuttle
      ? travel.shuttle
      : 'Confirm last transit and wristbands before gates — then it’s only the music',
  };
}

export function buildEventAiSummary(
  activity: Activity,
  djs: ScheduleDj[],
  locale: Locale,
  travelHints?: {
    nearestAirport?: string;
    arrivalWindow?: string;
    bestArea?: string;
    stayInsight?: string;
    shuttle?: string;
    stagesPublished?: boolean;
  },
): EventAiSummary {
  const artists = uniqueArtists(djs);
  const genres = topGenres(djs);
  const genreKeys = new Set(artists.map(broadGenre));
  const atmosphere = getFestivalAtmosphere(activity, genres[0]);
  const vibe = buildVibe(locale, activity, genres, artists.length, atmosphere);
  const stagesPublished = travelHints?.stagesPublished ?? false;

  return {
    vibe,
    story: buildStory(locale, activity, genres, artists.length, atmosphere),
    awaiting: buildAwaiting(locale, activity),
    genres: genres.length ? genres : locale === 'zh' ? ['待公布'] : ['TBA'],
    mustSee: mustSeeArtists(djs, locale, genres[0], stagesPublished),
    travel: buildTravelTip(locale, activity),
    arrival: buildArrival(locale, activity, {
      nearestAirport: travelHints?.nearestAirport ?? '',
      arrivalWindow: travelHints?.arrivalWindow ?? '',
      bestArea: travelHints?.bestArea,
      stayInsight: travelHints?.stayInsight,
      shuttle: travelHints?.shuttle,
    }),
    artistCount: artists.length,
    genreCount: genreKeys.has('Other') ? genreKeys.size - 1 : genreKeys.size,
  };
}
