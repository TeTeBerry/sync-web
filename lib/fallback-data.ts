import type { Activity, RecruitPost } from './types';

export const fallbackActivities: Activity[] = [
  {
    legacyId: 16,
    code: 'tomorrowland-shanghai',
    name: 'The Magic Of Tomorrowland 上海 2026',
    date: '2026-10-17 - 2026-10-18',
    location: '上海 · 外滩大会新址科技展馆',
    city: '上海',
    image:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=80',
    description:
      'Tomorrowland 主题大型电音现场，适合提前关注阵容、交通住宿与公开组队招募。',
    lineup: ['Lineup TBA', 'Mainstage', 'Planaxis'],
  },
  {
    legacyId: 4,
    code: 'storm',
    name: 'STORM 风暴电音节',
    date: '2026 Q4',
    location: '中国 · 待公布',
    city: '上海',
    image:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1400&q=80',
    description: '国内电音节经典 IP，适合用来验证活动资讯与找同行需求。',
    lineup: ['EDM', 'Bass', 'Progressive'],
  },
  {
    legacyId: 5,
    code: 'edc-thailand',
    name: 'EDC Thailand',
    date: '2026-01',
    location: 'Thailand',
    city: '海外',
    image:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80',
    description: '面向海外观演用户的电音节资讯、攻略与组队验证样本。',
    lineup: ['Kinetic Field', 'Circuit Grounds', 'Basspod'],
  },
];

export const fallbackPosts: RecruitPost[] = [
  {
    id: 'seed-1',
    authorName: '杭州出发小队',
    body: '10.17-18 双日，杭州高铁到上海，主看 Progressive / Melodic，想找 1-2 位同行。',
    departureCity: '杭州',
    recruitStatus: 'recruiting',
    currentPeople: 1,
    targetPeople: 3,
    unityTags: ['双日', '高铁', 'Melodic'],
  },
  {
    id: 'seed-2',
    authorName: '上海本地组',
    body: '本地出发，想一起研究住宿和散场交通，偏 Mainstage 和 Planaxis。',
    departureCity: '上海',
    recruitStatus: 'recruiting',
    currentPeople: 2,
    targetPeople: 4,
    unityTags: ['本地', '交通', 'Mainstage'],
  },
];
