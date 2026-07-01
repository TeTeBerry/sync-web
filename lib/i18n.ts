import type { Activity, ActivityCatalogType, ActivityRegion, RecruitPost } from './types';
import { compactMeta } from './format';

export const LOCALES = ['zh', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'zh';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value?: string): Locale {
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
}

export function localizedPath(locale: Locale, path = ''): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${cleanPath === '/' ? '' : cleanPath}`;
}

export function alternateLanguages(path = ''): Record<string, string> {
  return {
    'zh-CN': localizedPath('zh', path),
    en: localizedPath('en', path),
  };
}

export const messages = {
  zh: {
    htmlLang: 'zh-CN',
    siteTitle: 'SYNC | 电音节资讯与公开组队招募',
    siteDescription: '发现电音节、查看阵容与公开组队招募，先用 Web MVP 加入 SYNC 内测。',
    ogDescription: '查活动、看阵容、找公开组队招募。',
    nav: {
      events: '活动',
      waitlist: '加入内测',
      language: 'EN',
    },
    footer: 'SYNC 提供免费的活动资讯与公开招募发现工具，不售票，不收取服务费。',
    home: {
      eyebrow: 'SYNC',
      title: '电音节资讯\n与公开组队招募',
      lead: '先在 Web 上发现活动、查看阵容和公开组队需求。小程序审核期间，这里就是 SYNC 的第一版内测入口。',
      eventsCta: '查活动',
      waitlistCta: '加入内测',
      mediaPills: ['活动详情', '阵容更新', '公开招募'],
      featuredFallback: '精选活动',
      eventsEyebrow: 'Events',
      eventsTitle: '先从热门活动开始',
      viewAll: '查看全部',
      crewEyebrow: 'Crew',
      crewTitle: '公开组队需求',
    },
    events: {
      title: '活动列表',
      description: '浏览 SYNC Web MVP 收录的电音节活动、城市与阵容信息。',
      eyebrow: 'Event Catalog',
      heading: '查活动',
      searchPlaceholder: '搜索活动、国家、阵容关键词',
      allCountries: '全部国家',
      search: '搜索',
    },
    waitlist: {
      title: '加入内测',
      description: '加入 SYNC Web MVP 内测，订阅电音节活动、阵容与公开组队更新。',
      eyebrow: 'Waitlist',
      heading: '加入 SYNC 内测',
      lead: '留下联系方式，我们优先通知你关注活动的阵容、组队和上线进展。',
      emailCta: '邮件加入',
      eventsCta: '继续看活动',
      formEyebrow: 'Join',
      contactPlaceholder: '微信 / 邮箱',
      eventPlaceholder: '关注的活动名称',
      notePlaceholder: '想看的活动、阵容或组队需求',
      submit: '发送',
      sending: '发送中...',
      doneEyebrow: 'Done',
      doneTitle: '已收到，感谢加入内测',
      doneLead: '我们会通过你留下的联系方式通知你。',
      errorFallback: '发送失败，请稍后重试',
    },
    eventDetail: {
      fallbackDescription: '查看阵容与公开组队招募。',
      eyebrow: 'Event Detail',
      subscribe: '订阅更新',
      crewCta: '查看组队招募',
      aboutEyebrow: 'About',
      aboutTitle: '活动信息',
      type: '类型',
      region: '区域',
      attendees: '关注人数',
      recruitPosts: '公开招募',
      recruitPostsUnit: '条',
      externalUrl: '购票 / 官网',
      infoSource: '信息来源',
      lineupEyebrow: 'Lineup',
      lineupTitle: '阵容',
      lineupEmpty: '阵容尚未公布，敬请期待。',
      crewEyebrow: 'Crew',
      crewTitle: '公开组队招募',
      crewEmpty: '这场活动还没有公开招募，先订阅更新或加入内测。',
      signalEyebrow: 'MVP Signal',
      signalTitle: '下一步想验证',
      signalCopy: '用户是否愿意订阅这场活动、浏览组队需求，并在小程序上线前留下联系方式。',
      join: '加入内测',
      moreEyebrow: 'More',
      moreTitle: '继续看看其他活动',
    },
    eventCard: {
      hot: '热门',
      locationFallback: '地点待定',
      cityFallback: '活动',
      action: '查看详情',
      activityTypes: {
        festival: '户外电音节',
        indoor: '室内电音',
      },
      regions: {
        domestic: '国内',
        overseas: '海外',
        hmt: '港澳台',
      },
    },
    recruitCard: {
      fallbackBody: '这条公开招募还在整理中。',
      publicUser: '公开用户',
      full: '已满',
      open: '招募中',
      fallbackPeople: '公开招募',
      targetPeople: (count: number) => `目标 ${count} 人`,
    },
  },
  en: {
    htmlLang: 'en',
    siteTitle: 'SYNC | Electronic festival discovery and rave squad matching',
    siteDescription: 'Discover electronic festivals, lineups, and open rave squads with the SYNC Web MVP.',
    ogDescription: 'Find events, lineups, and rave squads.',
    nav: {
      events: 'Events',
      waitlist: 'Join Waitlist',
      language: '中文',
    },
    footer: 'SYNC is a free discovery tool for festival information and open rave squads. We do not sell tickets or charge service fees.',
    home: {
      eyebrow: 'SYNC',
      title: 'Festival discovery\nand rave squad matching',
      lead: 'Use the web MVP to discover events, check lineups, and browse open rave squads while the mini program is under review.',
      eventsCta: 'Browse Events',
      waitlistCta: 'Join Waitlist',
      mediaPills: ['Event details', 'Lineup updates', 'Rave squads'],
      featuredFallback: 'Featured event',
      eventsEyebrow: 'Events',
      eventsTitle: 'Start with featured festivals',
      viewAll: 'View all',
      crewEyebrow: 'Rave Squads',
      crewTitle: 'Open Rave Squads',
    },
    events: {
      title: 'Events',
      description: 'Browse electronic festival events, cities, venues, and lineup information collected by SYNC.',
      eyebrow: 'Event Catalog',
      heading: 'Events',
      searchPlaceholder: 'Search events, countries, venues, or lineup keywords',
      allCountries: 'All countries',
      search: 'Search',
    },
    waitlist: {
      title: 'Join Waitlist',
      description: 'Join the SYNC Web MVP waitlist for festival, lineup, and rave squad updates.',
      eyebrow: 'Waitlist',
      heading: 'Join the SYNC waitlist',
      lead: 'Leave a contact and we will prioritize updates for the events, lineups, and rave squads you care about.',
      emailCta: 'Join by email',
      eventsCta: 'Keep browsing',
      formEyebrow: 'Join',
      contactPlaceholder: 'WeChat / email',
      eventPlaceholder: 'Event name',
      notePlaceholder: 'Events, lineups, or rave squads you care about',
      submit: 'Send',
      sending: 'Sending...',
      doneEyebrow: 'Done',
      doneTitle: 'Thanks, you are on the waitlist',
      doneLead: 'We will reach you through the contact you provided.',
      errorFallback: 'Unable to send. Please try again later.',
    },
    eventDetail: {
      fallbackDescription: 'View lineup details and open rave squads.',
      eyebrow: 'Event Detail',
      subscribe: 'Subscribe',
      crewCta: 'Find a squad',
      aboutEyebrow: 'About',
      aboutTitle: 'Event info',
      type: 'Type',
      region: 'Region',
      attendees: 'Followers',
      recruitPosts: 'Open squads',
      recruitPostsUnit: 'listed',
      externalUrl: 'Tickets / official site',
      infoSource: 'Source',
      lineupEyebrow: 'Lineup',
      lineupTitle: 'Lineup',
      lineupEmpty: 'Lineup has not been announced yet.',
      crewEyebrow: 'Rave Squads',
      crewTitle: 'Open Rave Squads',
      crewEmpty: 'No open rave squads yet. Subscribe for updates or join the waitlist.',
      signalEyebrow: 'MVP Signal',
      signalTitle: 'What we are validating next',
      signalCopy: 'Whether users subscribe to events, browse open rave squads, and leave a contact before the mini program launches.',
      join: 'Join Waitlist',
      moreEyebrow: 'More',
      moreTitle: 'Explore more events',
    },
    eventCard: {
      hot: 'Hot',
      locationFallback: 'Venue TBD',
      cityFallback: 'Event',
      action: 'Details',
      activityTypes: {
        festival: 'Outdoor festival',
        indoor: 'Indoor electronic',
      },
      regions: {
        domestic: 'Mainland China',
        overseas: 'Overseas',
        hmt: 'HK/MO/TW',
      },
    },
    recruitCard: {
      fallbackBody: 'This rave squad post is still being prepared.',
      publicUser: 'Public user',
      full: 'Full',
      open: 'Open',
      fallbackPeople: 'Open squad',
      targetPeople: (count: number) => `Target ${count}`,
    },
  },
} as const;

export type Messages = (typeof messages)[Locale];

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}

export function getActivityTypeLabel(locale: Locale, value?: ActivityCatalogType): string | undefined {
  if (!value) return undefined;
  return messages[locale].eventCard.activityTypes[value] ?? value;
}

export function getRegionLabel(locale: Locale, value?: ActivityRegion): string | undefined {
  if (!value) return undefined;
  return messages[locale].eventCard.regions[value] ?? value;
}

type ActivityLocaleContent = Partial<
  Pick<Activity, 'name' | 'title' | 'location' | 'city' | 'area' | 'description' | 'infoSource'>
>;

const EN_ACTIVITY_CONTENT: Record<number, ActivityLocaleContent> = {
  1: {
    location: 'Pattaya, Wisdom Valley',
    city: 'Pattaya',
    area: 'Thailand',
    description: 'Tomorrowland lands in Thailand with a multi-day outdoor festival experience.',
    infoSource: 'Tomorrowland official website',
  },
  2: {
    location: 'Biddinghuizen, Walibi Holland',
    city: 'Biddinghuizen',
    area: 'Netherlands',
    infoSource: 'Defqon.1 official website',
  },
  3: {
    location: 'Seoul Land, Seoul',
    city: 'Seoul',
    area: 'South Korea',
    infoSource: 'S2O Korea official website',
  },
  4: {
    name: 'STORM Festival Shenzhen 2026',
    title: 'STORM Festival Shenzhen 2026',
    location: 'Shenzhen World Exhibition & Convention Center',
    city: 'Shenzhen',
    area: 'China',
    description: 'A large-scale electronic music festival in Shenzhen.',
    infoSource: 'STORM Festival official announcement',
  },
  5: {
    location: 'Phuket, Rhythm Park',
    city: 'Phuket',
    area: 'Thailand',
    infoSource: 'EDC Thailand official website',
  },
  6: {
    location: 'Tokyo, Sea Forest Waterway',
    city: 'Tokyo',
    area: 'Japan',
    infoSource: 'World DJ Festival Japan official website',
  },
  7: {
    location: 'Boom, De Schorre',
    city: 'Boom',
    area: 'Belgium',
    infoSource: 'Tomorrowland Belgium official website',
  },
  8: {
    location: 'Incheon, Inspire Entertainment Resort',
    city: 'Incheon',
    area: 'South Korea',
    infoSource: 'EDC Korea official website',
  },
  9: {
    location: 'Cluj-Napoca, Cluj Arena',
    city: 'Cluj-Napoca',
    area: 'Romania',
    infoSource: 'UNTOLD official website',
  },
  10: {
    location: 'Daresbury Estate, Warrington',
    city: 'Warrington',
    area: 'United Kingdom',
    infoSource: 'Creamfields official website',
  },
  11: {
    location: 'Odaiba, Tokyo',
    city: 'Tokyo',
    area: 'Japan',
    infoSource: 'Ultra Japan official website',
  },
  12: {
    location: 'Dubai Parks and Resorts, Dubai',
    city: 'Dubai',
    area: 'United Arab Emirates',
    infoSource: 'UNTOLD Dubai official website',
  },
  13: {
    location: 'Orlando, Tinker Field',
    city: 'Orlando',
    area: 'United States',
    infoSource: 'EDC Orlando official website',
  },
  14: {
    location: 'Riyadh, Boulevard Riyadh',
    city: 'Riyadh',
    area: 'Saudi Arabia',
    infoSource: 'MDLBEAST Soundstorm official website',
  },
  15: {
    location: 'Split, Poljud Stadium',
    city: 'Split',
    area: 'Croatia',
    infoSource: 'Ultra Europe official website',
  },
  16: {
    name: 'The Magic of Tomorrowland Shanghai 2026',
    title: 'The Magic of Tomorrowland Shanghai 2026',
    location: 'Shanghai, The Bund Conference site tech pavilion',
    city: 'Shanghai',
    area: 'China',
    description: 'The Magic of Tomorrowland brings the Planaxis-themed experience to Shanghai.',
    infoSource: 'Tomorrowland / organizer announcement',
  },
  17: {
    name: '808 Festival Bangkok 2026',
    title: '808 Festival Bangkok 2026',
    location: 'BITEC Bangna, Bangkok, Thailand',
    city: 'Bangkok',
    area: 'Thailand',
    description: "Thailand's #1 EDM festival returns to Bangkok for a two-day event.",
    infoSource: '808 Festival official website',
  },
  18: {
    name: 'VAC Zhuhai 2026',
    title: 'VAC Zhuhai 2026',
    location: 'Zhuhai Hengqin Chimelong Resort, Parking Lot #5',
    city: 'Zhuhai',
    description: 'VAC electronic music festival in Zhuhai Hengqin.',
    area: 'China',
    infoSource: 'VAC official',
  },
  19: {
    name: 'Lost Lands 2026',
    title: 'Lost Lands 2026',
    location: 'Legend Valley, Thornville, Ohio',
    city: 'Thornville',
    area: 'United States',
    description: "Excision's premier bass and dubstep festival returns to Legend Valley with 100+ artists across 5 stages.",
    infoSource: 'Lost Lands official website',
  },
  20: {
    name: 'Sunburn Mumbai 2026',
    title: 'Sunburn Mumbai 2026',
    location: 'Mahalaxmi Racecourse, Mumbai, India',
    city: 'Mumbai',
    area: 'India',
    description: "India's biggest electronic music festival returns to Mumbai.",
    infoSource: 'Sunburn Festival official website',
  },
};

const EN_CITY_NAMES: Record<string, string> = {
  上海: 'Shanghai',
  上海出发: 'Departing from Shanghai',
  北京: 'Beijing',
  广州: 'Guangzhou',
  深圳: 'Shenzhen',
  成都: 'Chengdu',
  武汉: 'Wuhan',
  西安: "Xi'an",
  南京: 'Nanjing',
  杭州: 'Hangzhou',
  普吉岛: 'Phuket',
  '普吉岛 Rhythm Park': 'Phuket, Rhythm Park',
  '会展中心(地铁站)': 'Exhibition Center metro station',
};

const EN_TAGS: Record<string, string> = {
  '#组队': '#RaveSquad',
  welcome_newbie: '#Newbie-friendly',
  women_friendly: '#Women-friendly',
  pure_rave: '#Pure rave',
};

const EN_RECRUIT_BODIES: Record<string, string> = {
  '6a3a6a78cfdac4222cc9d3d6':
    'Rave squad for Dec 12 from Nanjing, 2 ravers. Day-pass Pattaya squad is full; round-trip charter is booked.',
  '6a3a6a78cfdac4222cc9d3d4':
    "Rave squad for Dec 11-12 from Xi'an, 4 ravers. Melodic-leaning squad is full; side-stage and fireworks plan is set.",
  '6a3a6a78cfdac4222cc9d3d2':
    'Rave squad for Dec 11-13 from Wuhan, 3 ravers. Techno squad is full; Bangkok pickup and hotel are arranged.',
  '6a3a6a78cfdac4222cc9d3d0':
    'Rave squad for Dec 12-13 from Chengdu, 2 ravers. Deep House side-stage plan; squad is full.',
  '6a3a6a78cfdac4222cc9d3cd':
    'Rave squad for Dec 11-13 from Beijing, 4 ravers. Main-stage front row and fireworks spot are coordinated; squad is full.',
  '6a3a6a78cfdac4222cc9d3ca':
    'Rave squad for Dec 11-12 from Guangzhou, 2 ravers. House squad is full.',
  '6a3a5ceccfdac4222cc9b9a6':
    'Looking for one more raver for Jun 13-14 from Guangzhou. Mainly watching the Headliner stage; bringing a camera.',
  '6a3a5ceccfdac4222cc9b9a4':
    'Looking for ravers for Jun 13-14 from Shanghai. Progressive / Trance leaning; high-speed rail to Shenzhen North and hotel sharing near the venue.',
  '6a3a5ceccfdac4222cc9b9a8':
    'Local Shenzhen rave squad for Jun 13-14 is full. Baoan shuttle and hotel are arranged.',
  '6a39ae6282603b6534eb06b7':
    'Looking for a rave buddy for Dec 18-20 from Shanghai. Techno / Trance / Progressive leaning; favorite artist: ALEX WANN.',
  '6a3a5ceccfdac4222cc9b9ac':
    'First time at EDC Thailand, Dec 18-20 from Chengdu. Looking for one more easygoing rave buddy.',
  '6a3a5ceccfdac4222cc9b9aa':
    'Rave squad for Dec 18-20 from Shanghai. Bass / House leaning; open to sharing a Phuket room and meeting in Bangkok first.',
  '6a35a027c20362eba1c9c3d0':
    'Looking for a rave buddy at Phuket Rhythm Park, Dec 18-20. Techno / Trance / Progressive leaning; favorite artist: MARSHMELLO.',
  '6a41cfe37bcf88201b18bfdb':
    'Departing from Shanghai for Jul 4-5. Looking for one more rave buddy.',
  '6a3644ea4c804faa37213de6':
    'Open rave squad near Exhibition Center metro station for Nov 9. Mainly watching the main stage; open to sharing meals with easygoing teammates.',
  '6a3a5ceccfdac4222cc9b9b0':
    'Looking for one more raver from Hangzhou for Oct 17-18. High-speed rail to Shanghai; mainly watching the Planaxis stage.',
  '6a3a5ceccfdac4222cc9b9ae':
    'Open Shanghai rave squad for Oct 17-18. Melodic / Progressive leaning; local squad can plan transport and lodging together.',
};

function translateKnownText(value?: string): string | undefined {
  if (!value) return value;
  return EN_CITY_NAMES[value] ?? value;
}

function translateRecruitBody(body?: string): string | undefined {
  if (!body) return body;
  const normalized = body.replace(/\n+#组队\s*$/, '').trim();
  const match = normalized.match(/^组队，([^，]+)，([^，]+)，([^，]+)，(.+)$/);
  if (!match) return normalized;

  const [, date, place, people, note] = match;
  const translatedPlace = translateKnownText(place) ?? place;
  const peopleText = people.replace('人', ' people');
  const noteText = note
    .replace(/偏 /g, '')
    .replace(/本命 /g, 'favorite artist: ')
    .replace(/向/g, 'leaning')
    .replace(/主看/g, 'mainly watching')
    .replace(/欢迎同好/g, 'welcoming like-minded teammates')
    .replace(/可一起研究交通和住宿方案/g, 'can plan transport and lodging together')
    .replace(/一起冲/g, 'join together');

  return `Open rave squad for ${date} from ${translatedPlace}, ${peopleText.replace(' people', ' ravers')}. ${noteText}`;
}

export function localizeActivity(activity: Activity, locale: Locale): Activity {
  if (locale === 'zh') return activity;
  const content = EN_ACTIVITY_CONTENT[activity.legacyId];
  return content ? { ...activity, ...content } : activity;
}

export function localizeActivities(activities: Activity[], locale: Locale): Activity[] {
  return activities.map((activity) => localizeActivity(activity, locale));
}

export function localizeRecruitPost(post: RecruitPost, locale: Locale): RecruitPost {
  if (locale === 'zh') return post;
  const body = EN_RECRUIT_BODIES[post.id] ?? translateRecruitBody(post.body ?? post.bodyPreview ?? post.content);
  return {
    ...post,
    authorName: post.authorName === '微信用户' || post.name === '微信用户'
      ? 'WeChat user'
      : post.authorName,
    name: post.name === '微信用户' ? 'WeChat user' : post.name,
    body,
    bodyPreview: body,
    content: body,
    location: translateKnownText(post.location),
    departureCity: translateKnownText(post.departureCity),
    unityTags: (post.unityTags ?? post.tags ?? post.recruitUnityTags)?.map((tag) => EN_TAGS[tag] ?? tag),
    tags: post.tags?.map((tag) => EN_TAGS[tag] ?? tag),
    recruitUnityTags: post.recruitUnityTags?.map((tag) => EN_TAGS[tag] ?? tag),
  };
}

export function localizeRecruitPosts(posts: RecruitPost[], locale: Locale): RecruitPost[] {
  return posts.map((post) => localizeRecruitPost(post, locale));
}

export function getLocalizedActivityTitle(activity: Activity, locale: Locale = DEFAULT_LOCALE): string {
  return localizeActivity(activity, locale).title ?? localizeActivity(activity, locale).name;
}

export function activityMetaForLocale(activity: Activity, locale: Locale = DEFAULT_LOCALE): string {
  const localized = localizeActivity(activity, locale);
  return compactMeta([localized.date, localized.location ?? localized.city]);
}
