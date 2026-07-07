import type { ScheduleDj } from './api';
import type { Activity } from './types';
import type { Locale } from './i18n';
import { resolveGenreBroadToken } from './lineup-genre';

export type EventAiSummary = {
  vibe: string;
  genres: string[];
  mustSee: string[];
  travel: string;
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

function mustSeeArtists(djs: ScheduleDj[], locale: Locale, limit = 4): string[] {
  return uniqueArtists(djs)
    .sort((a, b) => {
      const byPopularity = (b.popularity ?? 0) - (a.popularity ?? 0);
      if (byPopularity !== 0) return byPopularity;
      return a.name.localeCompare(b.name, locale === 'zh' ? 'zh-CN' : 'en');
    })
    .slice(0, limit)
    .map((dj) => dj.name);
}

function buildVibe(
  locale: Locale,
  activity: Activity,
  genres: string[],
  artistCount: number,
): string {
  if (artistCount === 0) {
    if (activity.description) {
      const sentence = activity.description.split(/[.!?。！？]/)[0]?.trim();
      if (sentence) return sentence;
    }
    return locale === 'zh'
      ? '阵容还没出。标记一下，出来就能开始规划。'
      : 'Lineup not out yet. Save this festival — planning opens when artists drop.';
  }

  const dominant = genres[0];
  const isIndoor = activity.activityType === 'indoor';

  if (locale === 'zh') {
    if (dominant === 'Techno') {
      return isIndoor
        ? '工业质感，长时段沉浸——适合从头到尾待在舞池。'
        : '硬核律动，多舞台从黄昏到日出。';
    }
    if (dominant === 'House') {
      return '旋律与律动并重，从日落 Groove 到深夜峰值。';
    }
    if (dominant === 'Hardstyle' || dominant === 'Hardcore' || dominant === 'Hard') {
      return '高能密集，冲击感与集体高潮贯穿全场。';
    }
    if (dominant === 'Trance') {
      return '情绪递进鲜明，长 Set 与旋律爆发是主旋律。';
    }
    if (dominant === 'Drum & Bass' || dominant === 'Dubstep' || dominant === 'Bass') {
      return '低音主导，核心时段舞池强度最高。';
    }
    if (genres.length >= 3) {
      return '多风格并行，按心情切换舞台。';
    }
    return isIndoor ? '俱乐部氛围，节奏紧凑、动线集中。' : '户外多舞台，适合分组打卡再汇合。';
  }

  if (dominant === 'Techno') {
    return isIndoor
      ? 'Industrial and immersive — built for long nights on the floor.'
      : 'Driving techno across multiple stages, sunset to sunrise.';
  }
  if (dominant === 'House') {
    return 'Groove-forward and melodic — golden hour to peak time.';
  }
  if (dominant === 'Hardstyle' || dominant === 'Hardcore' || dominant === 'Hard') {
    return 'Peak-time intensity — maximum impact from open to close.';
  }
  if (dominant === 'Trance') {
    return 'Emotional builds and extended sets for melodic peaks.';
  }
  if (dominant === 'Drum & Bass' || dominant === 'Dubstep' || dominant === 'Bass') {
    return 'Bass-heavy and rhythm-led — strongest during core floor hours.';
  }
  if (genres.length >= 3) {
    return 'Multi-genre programming — hop stages by mood.';
  }
  return isIndoor
    ? 'Compact club flow — focused stages, tight set changes.'
    : 'Open-air, multi-stage — split up and reconvene with your crew.';
}

function buildTravelTip(locale: Locale, activity: Activity): string {
  const city = activity.city ?? activity.area;
  const location = activity.location;
  const region = activity.region;

  if (locale === 'zh') {
    if (region === 'overseas') {
      if (city) {
        return `海外行程建议提前锁定机票与住宿；抵达 ${city} 后预留转机缓冲，并确认签证材料。`;
      }
      return '海外行程建议提前订机票与住宿，并预留签证办理时间。';
    }
    if (region === 'hmt') {
      return city
        ? `前往 ${city} 请提前办理签注/通行证，并关注口岸通关与末班交通。`
        : '港澳台行程请提前办理签注/通行证，并关注口岸通关时间。';
    }
    if (city && location) {
      return `${city} 场次建议提前规划交通与场馆接驳；高峰日打车紧张，预留 30–45 分钟换乘缓冲。`;
    }
    if (city) {
      return `前往 ${city} 建议提前锁定交通与住宿，热门档期价格浮动快。`;
    }
    return '热门档期建议提前锁定交通与住宿，并关注官方公布的入场时间。';
  }

  if (region === 'overseas') {
    if (city) {
      return `Book flights and stays early for ${city}; buffer time for transfers, visas, and entry.`;
    }
    return 'Book flights and accommodation early, and allow lead time for visas and border entry.';
  }
  if (region === 'hmt') {
    return city
      ? `For ${city}, secure travel permits ahead of time and plan for border crossing and late-night transit.`
      : 'Secure travel permits early and plan for border crossing and late-night transit.';
  }
  if (city && location) {
    return `For ${city}, lock in transport and venue transfers early — rides surge on peak nights, so buffer 30–45 minutes.`;
  }
  if (city) {
    return `Book transport and hotels for ${city} early — prices move fast on popular weekends.`;
  }
  return 'Lock in transport and accommodation early, and watch the official site for gate timing.';
}

export function buildEventAiSummary(
  activity: Activity,
  djs: ScheduleDj[],
  locale: Locale,
): EventAiSummary {
  const artists = uniqueArtists(djs);
  const genres = topGenres(djs);
  const genreKeys = new Set(artists.map(broadGenre));

  return {
    vibe: buildVibe(locale, activity, genres, artists.length),
    genres: genres.length ? genres : locale === 'zh' ? ['待公布'] : ['TBA'],
    mustSee: mustSeeArtists(djs, locale),
    travel: buildTravelTip(locale, activity),
    artistCount: artists.length,
    genreCount: genreKeys.has('Other') ? genreKeys.size - 1 : genreKeys.size,
  };
}
