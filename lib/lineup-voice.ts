import type { FestivalAtmosphere } from './festival-atmosphere';
import type { Activity } from './types';
import type { Locale } from './i18n';

export type LineupChapterVoice = {
  spotlightTitle: string;
  spotlightLead: string;
  genreTitle: string;
  genreLead: string;
  flowTitle: string;
  flowLead: string;
  discoveryTitle: string;
  discoveryLead: string;
  routeIntelligence: string;
};

function identityOf(activity: Activity): string {
  return `${activity.name} ${activity.title ?? ''} ${(activity.alias ?? []).join(' ')}`.toLowerCase();
}

/**
 * Festival-shaped mid-page voice — keeps Raven recognizable while
 * letting Tomorrowland / Ultra / EDC / Awakenings feel different after the hero.
 */
export function buildLineupChapterVoice(
  activity: Activity,
  locale: Locale,
  atmosphere: FestivalAtmosphere,
  genres: string[],
): LineupChapterVoice {
  const identity = identityOf(activity);
  const sound = genres.slice(0, 2).join(locale === 'zh' ? ' / ' : ' / ');
  const zh = locale === 'zh';

  if (identity.includes('tomorrowland') || identity.includes('明日世界')) {
    return zh
      ? {
          spotlightTitle: '暖光里的名字',
          spotlightLead: '慢场与主舞台之间——先守住会发光的人。',
          genreTitle: '这座世界的声音走廊',
          genreLead: sound ? `从 ${sound} 走进去，像走进不同的国度。` : '每条走廊通向不同的夜晚。',
          flowTitle: '童话怎么展开',
          flowLead: '高点、转场、收束——把整晚写成一条可走的路。',
          discoveryTitle: '先听懂这座世界',
          discoveryLead: '名字连成地图。先跟感觉走，再展开全部。',
          routeIntelligence: 'Raven 按暖场 → 高点 → 收束排了这条路，避开同时间冲突。',
        }
      : {
          spotlightTitle: 'Names in the warm light',
          spotlightLead: 'Between the slow fields and the mainstage — protect who will glow.',
          genreTitle: 'Corridors of this world',
          genreLead: sound
            ? `Enter through ${sound} — each corridor a different kingdom.`
            : 'Each corridor opens a different night.',
          flowTitle: 'How the fairy tale unfolds',
          flowLead: 'Peaks, crossings, close — a path you can walk through the night.',
          discoveryTitle: 'Hear this world first',
          discoveryLead: 'Names become a map. Follow feeling, then open the rest.',
          routeIntelligence:
            'Raven shaped this path as warm-up → crest → close, clearing same-time conflicts.',
        };
  }

  if (identity.includes('edc') || identity.includes('electric daisy') || atmosphere === 'neon') {
    return zh
      ? {
          spotlightTitle: '霓虹里的名字',
          spotlightLead: '粉蓝紫的夜空下——先守住会把人群点亮的人。',
          genreTitle: '色彩从哪条线涌进来',
          genreLead: sound ? `${sound} 是入口。跟欢愉走。` : '跟欢愉走，别在分类里迷路。',
          flowTitle: '狂欢怎么流动',
          flowLead: '开场、升空、同频——一条能跟住的动线。',
          discoveryTitle: '先摸清这场的魔法',
          discoveryLead: '先听主导声音，再展开完整名单。',
          routeIntelligence: 'Raven 优先主舞台高光，并标出需要转场的窗口。',
        }
      : {
          spotlightTitle: 'Names in the neon',
          spotlightLead: 'Under pink-blue-purple night — protect who will light the crowd.',
          genreTitle: 'Where the color rushes in',
          genreLead: sound ? `${sound} is the door. Follow the euphoria.` : 'Follow the euphoria — not the folders.',
          flowTitle: 'How the carnival moves',
          flowLead: 'Open, lift, sync — a path that can keep up.',
          discoveryTitle: 'Feel the magic first',
          discoveryLead: 'Hear the dominant current, then open the full cast.',
          routeIntelligence:
            'Raven prioritizes mainstage highlights and marks the windows where you need to move.',
        };
  }

  if (identity.includes('ultra') || identity.includes('超世代') || atmosphere === 'electric') {
    return zh
      ? {
          spotlightTitle: '峰值上的名字',
          spotlightLead: '主舞台心跳——先锁定会把万人拉齐的人。',
          genreTitle: '电压从哪条线进来',
          genreLead: sound ? `${sound} 是入口。跟高能走。` : '跟高能走，别在分类里迷路。',
          flowTitle: '峰值怎么移动',
          flowLead: '开场、冲顶、余震——一条能跟住的动线。',
          discoveryTitle: '先摸清这场的电压',
          discoveryLead: '先听主导声音，再展开完整名单。',
          routeIntelligence: 'Raven 优先主舞台峰值，并标出需要转场的窗口。',
        }
      : {
          spotlightTitle: 'Names on the peak',
          spotlightLead: 'Mainstage heartbeat — lock who can pull the crowd into one pulse.',
          genreTitle: 'Where the voltage enters',
          genreLead: sound ? `${sound} is the door. Follow the energy.` : 'Follow the energy — not the folders.',
          flowTitle: 'How the peak moves',
          flowLead: 'Open, crest, aftershock — a path that can keep up.',
          discoveryTitle: 'Feel the voltage first',
          discoveryLead: 'Hear the dominant current, then open the full cast.',
          routeIntelligence:
            'Raven prioritizes mainstage crests and marks the windows where you need to move.',
        };
  }

  if (
    identity.includes('lost lands') ||
    identity.includes('失落之地') ||
    identity.includes('defqon') ||
    atmosphere === 'ember'
  ) {
    return zh
      ? {
          spotlightTitle: '地面会震的名字',
          spotlightLead: '低音先记住身体——守住会把场地压住的人。',
          genreTitle: '从重击走进去',
          genreLead: sound ? `${sound} 是今晚的地面。` : '跟重的走，轻的可以后遇。',
          flowTitle: '冲击怎么推进',
          flowLead: '升温、撞击、余震——一条不会散的路线。',
          discoveryTitle: '先听懂这场的重量',
          discoveryLead: '先抓住主导冲击，再展开其余名字。',
          routeIntelligence: 'Raven 沿冲击曲线排路，避开同分钟的硬冲突。',
        }
      : {
          spotlightTitle: 'Names the ground will feel',
          spotlightLead: 'Bass remembers the body first — protect who can hold the field.',
          genreTitle: 'Enter through the hit',
          genreLead: sound ? `${sound} is the floor tonight.` : 'Follow the weight. Lighter rooms can wait.',
          flowTitle: 'How the impact builds',
          flowLead: 'Heat, strike, aftershock — a route that stays together.',
          discoveryTitle: 'Hear the weight first',
          discoveryLead: 'Catch the dominant hit, then open the rest of the cast.',
          routeIntelligence:
            'Raven follows the impact curve and clears hard same-minute conflicts.',
        };
  }

  if (
    identity.includes('awakenings') ||
    identity.includes('觉醒') ||
    identity.includes('time warp') ||
    atmosphere === 'steel'
  ) {
    return zh
      ? {
          spotlightTitle: '长夜里的名字',
          spotlightLead: '少装饰、多呼吸——守住能把整晚撑住的人。',
          genreTitle: '冷静的入口',
          genreLead: sound ? `从 ${sound} 沉下去。` : '跟深的走，别急着扫完名单。',
          flowTitle: '长夜怎么呼吸',
          flowLead: '进入、沉浸、日出——一条不赶的动线。',
          discoveryTitle: '先听懂这场的冷静',
          discoveryLead: '先抓住主导气质，再慢慢展开。',
          routeIntelligence: 'Raven 按长夜节奏排路：进入 → 沉浸 → 收束，减少无谓转场。',
        }
      : {
          spotlightTitle: 'Names for the long night',
          spotlightLead: 'Less ornament, more breath — protect who can hold the hours.',
          genreTitle: 'A calm way in',
          genreLead: sound ? `Sink in through ${sound}.` : 'Follow depth. Don’t rush the roster.',
          flowTitle: 'How the long night breathes',
          flowLead: 'Enter, deepen, sunrise — a path that doesn’t hurry.',
          discoveryTitle: 'Hear the calm first',
          discoveryLead: 'Catch the dominant mood, then open slowly.',
          routeIntelligence:
            'Raven paces the night as enter → deepen → close, cutting needless stage hops.',
        };
  }

  if (atmosphere === 'lime') {
    return zh
      ? {
          spotlightTitle: '草地上的名字',
          spotlightLead: '开阔、明亮——先守住会把白天点亮的人。',
          genreTitle: '从开阔处走进去',
          genreLead: sound ? `${sound} 铺开整片场地。` : '跟亮的走，再找角落。',
          flowTitle: '白天怎么变成夜晚',
          flowLead: '午后、日落、主舞台——一条自然的推进。',
          discoveryTitle: '先听懂这场的开阔',
          discoveryLead: '先抓住主导声音，再展开全部。',
          routeIntelligence: 'Raven 按午后 → 日落 → 夜场排路，保留转场余量。',
        }
      : {
          spotlightTitle: 'Names on the grass',
          spotlightLead: 'Open and bright — protect who will light the day.',
          genreTitle: 'Enter through the open field',
          genreLead: sound ? `${sound} spreads across the site.` : 'Follow the bright rooms first.',
          flowTitle: 'How day becomes night',
          flowLead: 'Afternoon, sunset, mainstage — a natural push forward.',
          discoveryTitle: 'Hear the openness first',
          discoveryLead: 'Catch the dominant sound, then open the cast.',
          routeIntelligence:
            'Raven shapes afternoon → sunset → night, leaving room to move between stages.',
        };
  }

  // Default Raven voice — still festival-aware via sound
  return zh
    ? {
        spotlightTitle: '定义旅程的声音',
        spotlightLead: sound
          ? `在 ${sound} 里，先守住最该听清的名字。`
          : '更大的名字，更清楚的理由——先写入路线。',
        genreTitle: '从一条声音走进去',
        genreLead: '先跟主导气质走，其余慢慢遇。',
        flowTitle: '旅程如何流动',
        flowLead: '高点与路线先出现；全部舞台留给需要的人。',
        discoveryTitle: '听懂这场的声音',
        discoveryLead: '先抓住主导章节，再展开完整名单。',
        routeIntelligence: 'Raven 按开场 → 高点 → 收束排了这条路，并避开同时间冲突。',
      }
    : {
        spotlightTitle: 'The sound that defines the journey',
        spotlightLead: sound
          ? `Inside ${sound}, protect the names worth hearing clearly.`
          : 'Bigger names, clearer reasons — keep them on your route.',
        genreTitle: 'Enter through one sound',
        genreLead: 'Follow the dominant mood first. The rest can wait.',
        flowTitle: 'How the journey moves',
        flowLead: 'Peaks and a path first; full stages when you need them.',
        discoveryTitle: 'Understand this festival’s sound',
        discoveryLead: 'Catch the leading chapters, then open the full cast.',
        routeIntelligence:
          'Raven shaped this path as open → crest → close, clearing same-time conflicts.',
      };
}
