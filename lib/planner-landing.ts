import { getActivityTitle } from './api';
import type { ScheduleDj, SchedulePerformance } from './api';
import { buildEventAiSummary } from './event-ai-summary';
import { buildEventTravelData, type EventTravelData, type TravelFaqItem } from './event-travel';
import { getMessages, type Locale } from './i18n';
import { buildFeaturedArtists } from './lineup-preview';
import { buildPlannerPlan, type PlannerPlan } from './planner-plan';
import { formatDisplayMoneyRange } from './raven-currency';
import type { Activity } from './types';

export type PlannerExampleTrip = {
  origin: string;
  destination: string;
  airport: string;
  flightPrice: string;
  stayAreas: string;
  nightlyCost: string;
  airportToHotel: string;
  hotelToFestival: string;
  totalBudget: string;
  packing: string[];
};

export type PlannerMustSeeSet = {
  artist: string;
  time?: string;
  stage?: string;
  reason?: string;
  genre?: string;
};

export type PlannerTravelStep = {
  label: string;
  title: string;
  detail: string;
  feeling?: string;
};

export type PlannerLineupIntel = {
  recommendedArtists: string[];
  genres: string[];
  hiddenGems: string[];
  mustSeeSets: PlannerMustSeeSet[];
  artistCount: number;
};

export type PlannerStayStory = {
  primary: string;
  why: string;
  areas: string;
  nightlyCost: string;
};

export type PlannerLandingData = {
  travelData: EventTravelData;
  exampleTrip: PlannerExampleTrip;
  demoPlan: PlannerPlan;
  travelSteps: PlannerTravelStep[];
  lineupIntel: PlannerLineupIntel;
  stayStory: PlannerStayStory;
  journeyBridge: string;
  budgetTotal: string;
  budgetInsight: string;
  overview: string;
  faq: TravelFaqItem[];
  venue: string;
  country: string;
};

function demoOrigin(activity: Activity, locale: Locale): string {
  if (locale === 'zh') {
    if (activity.region === 'overseas') return '上海';
    if (activity.region === 'hmt') return '深圳';
    return '北京';
  }
  if (activity.region === 'overseas') {
    const area = (activity.area ?? '').toLowerCase();
    if (area.includes('belgium') || area.includes('netherlands') || area.includes('germany')) {
      return 'London';
    }
    if (area.includes('thailand') || area.includes('japan') || area.includes('singapore')) {
      return 'Singapore';
    }
    return 'London';
  }
  return 'Los Angeles';
}

function estimateFlightPrice(travelData: EventTravelData, locale: Locale): string {
  const mid = travelData.budget.items.tiers.find((tier) => tier.tier === 'mid');
  if (!mid) return locale === 'zh' ? '视出发地而定' : 'Varies by origin';
  const value = mid.estimate.replace(/\/\s*(人|person)/i, '').trim();
  if (locale === 'zh') {
    return `往返约 ${value} 起（不含门票）`;
  }
  return `From ${value} round-trip (excl. tickets)`;
}

function estimateNightlyCost(travelData: EventTravelData, locale: Locale): string {
  const mid = travelData.stay.items.options.find((option) => option.tier === 'mid');
  const fallback = formatDisplayMoneyRange(600, 1200, 'CNY', locale, {
    approx: false,
    suffix: locale === 'zh' ? ' / 晚' : ' / night',
  });
  if (locale === 'zh') {
    return mid ? `中档约 ${travelData.budget.items.tiers[1]?.estimate ?? fallback}` : fallback;
  }
  return mid ? `Mid-tier from ${travelData.budget.items.tiers[1]?.estimate ?? fallback}` : fallback;
}

export function buildPlannerExampleTrip(
  activity: Activity,
  travelData: EventTravelData,
  locale: Locale,
): PlannerExampleTrip {
  const destination = activity.city ?? activity.location ?? activity.area ?? '';
  const origin = demoOrigin(activity, locale);
  const stayAreas = travelData.stay.items.bestAreas.slice(0, 2).join(locale === 'zh' ? '、' : ', ');

  return {
    origin,
    destination,
    airport: travelData.flights.items.nearestAirport,
    flightPrice: estimateFlightPrice(travelData, locale),
    stayAreas,
    nightlyCost: estimateNightlyCost(travelData, locale),
    airportToHotel: travelData.flights.items.airportTransfer,
    hotelToFestival: travelData.transport.items.shuttle,
    totalBudget: travelData.budget.items.tiers.find((tier) => tier.tier === 'mid')?.estimate ?? '',
    packing: travelData.essentials.items.packing.slice(0, 5),
  };
}

function buildHiddenGems(djs: ScheduleDj[], locale: Locale, limit = 4): string[] {
  const unique = new Map<string, ScheduleDj>();
  for (const dj of djs) {
    const key = dj.name.trim().toLowerCase();
    if (!unique.has(key)) unique.set(key, dj);
  }

  return [...unique.values()]
    .filter((dj) => (dj.popularity ?? 0) < 70)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, limit)
    .map((dj) => dj.name);
}

export function buildPlannerLineupIntel(
  activity: Activity,
  djs: ScheduleDj[],
  performances: SchedulePerformance[],
  locale: Locale,
): PlannerLineupIntel {
  const summary = buildEventAiSummary(activity, djs, locale);
  const featured = buildFeaturedArtists(djs, locale, { limit: 4 }).map((artist) => artist.name);
  const hiddenGems = buildHiddenGems(djs, locale);
  const recommended = summary.mustSee.length
    ? summary.mustSee.map((artist) => artist.name)
    : featured;
  const reasonByArtist = new Map(
    summary.mustSee.map((artist) => [artist.name.trim().toLowerCase(), artist.reason]),
  );

  const timedSets = performances
    .filter((performance) => performance.startTime?.trim() && performance.artistName?.trim())
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 4)
    .map((performance) => {
      const artist = performance.artistName;
      return {
        artist,
        time: performance.startTime?.trim(),
        stage: performance.stageLabel?.trim() || performance.stage?.trim(),
        reason: reasonByArtist.get(artist.trim().toLowerCase()),
      };
    });

  const mustSeeSets: PlannerMustSeeSet[] = timedSets.length
    ? timedSets
    : summary.mustSee.map((artist) => ({
        artist: artist.name,
        reason: artist.reason,
      }));

  if (!mustSeeSets.length) {
    for (const artist of recommended.slice(0, 3)) {
      mustSeeSets.push({
        artist,
        reason: reasonByArtist.get(artist.trim().toLowerCase()),
      });
    }
  }

  return {
    recommendedArtists: recommended,
    genres: summary.genres,
    hiddenGems: hiddenGems.length ? hiddenGems : featured.slice(-2),
    mustSeeSets,
    artistCount: summary.artistCount,
  };
}

function buildStayStory(
  activity: Activity,
  travelData: EventTravelData,
  exampleTrip: PlannerExampleTrip,
  demoPlan: PlannerPlan,
  locale: Locale,
): PlannerStayStory {
  const midStay = travelData.stay.items.options.find((option) => option.tier === 'mid');
  const title = getActivityTitle(activity);
  const city = activity.city ?? activity.location ?? activity.area ?? '';
  const primary =
    midStay?.description ||
    demoPlan.travel.stay ||
    (locale === 'zh'
      ? city
        ? `以 ${city} 场馆周边为基地，走完 ${title}`
        : `以场馆周边为基地，走完 ${title}`
      : city
        ? `Base near the ${city} venue for ${title}`
        : `Base near the venue for ${title}`);

  return {
    primary,
    why: travelData.stay.insight,
    areas: exampleTrip.stayAreas,
    nightlyCost: exampleTrip.nightlyCost,
  };
}

function buildTravelSteps(
  activity: Activity,
  travelData: EventTravelData,
  demoPlan: PlannerPlan,
  locale: Locale,
): PlannerTravelStep[] {
  const title = getActivityTitle(activity);
  const city = activity.city ?? activity.location ?? activity.area ?? '';
  const arrival = travelData.flights.items.arrivalWindow;
  const transfer = travelData.transport.items.shuttle;
  const firstDaySets = demoPlan.artistTimeline.days[0]?.sets ?? [];
  const setSummary = firstDaySets
    .slice(0, 2)
    .map((set) => `${set.time} ${set.artist}`)
    .join(locale === 'zh' ? '、' : ', ');
  const settle = travelData.stay.items.bestAreas[0] ?? city;

  if (locale === 'zh') {
    return [
      {
        label: '落地',
        title: city ? `先到 ${city}` : '先落地',
        detail: arrival,
        feeling: '把路走稳，旅程才站得住。',
      },
      {
        label: '落脚',
        title: settle ? `安顿在 ${settle}` : '安顿下来',
        detail: demoPlan.travel.stay,
        feeling: '基地定了，散场后就不慌。',
      },
      {
        label: '入场',
        title: `走进 ${title}`,
        detail: setSummary || demoPlan.experiences[0] || '主舞台黄金时段',
        feeling: '这才是你来这一趟的理由。',
      },
      {
        label: '往返',
        title: '场馆与基地之间',
        detail: transfer,
        feeling: '转场清楚，才能追完想追的 Set。',
      },
      {
        label: '返程',
        title: '带着余韵离开',
        detail: travelData.flights.items.departureTips,
        feeling: '旅程收束，记忆留下。',
      },
    ];
  }

  return [
    {
      label: 'Land',
      title: city ? `Land in ${city}` : 'Land first',
      detail: arrival,
      feeling: 'Clear the path — then the journey can hold.',
    },
    {
      label: 'Settle',
      title: settle ? `Settle near ${settle}` : 'Settle in',
      detail: demoPlan.travel.stay,
      feeling: 'Lock the base so late nights stay easy.',
    },
    {
      label: 'Enter',
      title: `Step into ${title}`,
      detail: setSummary || demoPlan.experiences[0] || 'Peak-time main stage sets',
      feeling: 'This is why you came.',
    },
    {
      label: 'Move',
      title: 'Between base and gates',
      detail: transfer,
      feeling: 'Know the hops — protect the sets that matter.',
    },
    {
      label: 'Return',
      title: 'Leave with the afterglow',
      detail: travelData.flights.items.departureTips,
      feeling: 'The journey closes. The memory stays.',
    },
  ];
}

export function buildPlannerFaq(
  activity: Activity,
  travelData: EventTravelData,
  locale: Locale,
): TravelFaqItem[] {
  const title = getActivityTitle(activity);
  const city = activity.city ?? activity.location ?? '';
  const midBudget = travelData.budget.items.tiers.find((tier) => tier.tier === 'mid')?.estimate ?? '';
  const stayAreas = travelData.stay.items.bestAreas.slice(0, 2).join(locale === 'zh' ? '、' : ', ');

  if (locale === 'zh') {
    return [
      {
        question: `${title} 住哪里最合适？`,
        answer: city
          ? `Raven 建议优先 ${stayAreas || city}。靠近场馆或末班地铁可达的区域，散场后回程最省心。`
          : '优先场馆步行圈或官方合作酒店；远郊住宿需核算深夜返程成本。',
      },
      {
        question: `去 ${title} 大概要花多少钱？`,
        answer: midBudget
          ? `不含门票，中档行程人均约 ${midBudget}。用下方规划器可按你的出发地精确测算。`
          : '费用因出发地、住宿档次和出行人数而异 — 用 Raven 规划器生成你的专属预算。',
      },
      {
        question: `怎么去 ${title}？`,
        answer: travelData.flights.items.airportTransfer,
      },
      {
        question: `去 ${title} 应该带什么？`,
        answer: `建议携带：${travelData.essentials.items.packing.slice(0, 4).join('、')}。${travelData.essentials.items.weather}`,
      },
      {
        question: `${title} 适合新手吗？`,
        answer: activity.activityType === 'indoor'
          ? '室内场次动线集中、节奏紧凑，对首次参加电音节的新手相对友好。'
          : '户外多舞台体验丰富，建议提前标记必看艺人、规划转场路线，新手也能轻松上手。',
      },
    ];
  }

  return [
    {
      question: `Where should I stay for ${title}?`,
      answer: city
        ? `Raven recommends ${stayAreas || city} first — walking distance or along the last train line keeps late-night returns simple.`
        : 'Book walking distance or official partner hotels; outer districts need a late-night return plan.',
    },
    {
      question: `How much does ${title} cost?`,
      answer: midBudget
        ? `Excluding tickets, a mid-tier trip runs about ${midBudget} per person. Use the planner below for a total from your origin.`
        : 'Costs vary by origin, stay tier, and group size — generate your personalized budget with the Raven planner.',
    },
    {
      question: `How do I get to ${title}?`,
      answer: travelData.flights.items.airportTransfer,
    },
    {
      question: `What should I pack for ${title}?`,
      answer: `Bring ${travelData.essentials.items.packing.slice(0, 4).join(', ')}. ${travelData.essentials.items.weather}`,
    },
    {
      question: `Is ${title} beginner friendly?`,
      answer:
        activity.activityType === 'indoor'
          ? 'Indoor events keep stages compact and flow tight — a solid first festival if you plan your must-see sets.'
          : 'Open-air and multi-stage — mark your priorities, plan stage hops, and first-timers settle in fast.',
    },
  ];
}

export function buildPlannerLandingData(
  activity: Activity,
  djs: ScheduleDj[],
  performances: SchedulePerformance[],
  locale: Locale,
): PlannerLandingData {
  const travelData = buildEventTravelData(activity, locale);
  const summary = buildEventAiSummary(activity, djs, locale);
  const localized = activity;
  const exampleTrip = buildPlannerExampleTrip(activity, travelData, locale);
  const lineupIntel = buildPlannerLineupIntel(activity, djs, performances, locale);
  const t = getMessages(locale);

  const demoPlan = buildPlannerPlan(
    activity,
    djs,
    performances,
    lineupIntel.recommendedArtists.slice(0, 3),
    {
      origin: exampleTrip.origin,
      travelStyle: 'smart',
      stayPreference: 'festival',
      journeyType: 'friends',
      priorities: ['artists', 'discover'],
    },
    locale,
    t.aiPlanner.planLabels,
  );

  const stayStory = buildStayStory(activity, travelData, exampleTrip, demoPlan, locale);
  const budgetTotal =
    travelData.budget.items.tiers.find((tier) => tier.tier === 'mid')?.estimate || demoPlan.budget.total;
  const title = getActivityTitle(activity);
  const city = activity.city ?? activity.location ?? activity.area ?? '';
  const journeyBridge =
    locale === 'zh'
      ? city
        ? `${title} 在 ${city} 等你 — 路、基地、音乐与花费，已经能拼成一趟说得通的旅程。`
        : `${title} 等你 — 路、基地、音乐与花费，已经能拼成一趟说得通的旅程。`
      : city
        ? `${title} in ${city} is within reach — path, base, music, and spend already form a journey that holds.`
        : `${title} is within reach — path, base, music, and spend already form a journey that holds.`;

  return {
    travelData,
    exampleTrip,
    demoPlan,
    travelSteps: buildTravelSteps(activity, travelData, demoPlan, locale),
    lineupIntel,
    stayStory,
    journeyBridge,
    budgetTotal,
    budgetInsight: travelData.budget.insight,
    overview:
      localized.description?.trim() ||
      summary.vibe ||
      (locale === 'zh'
        ? `${title} 阵容与出行数据持续更新，Raven 可帮你一次规划航班、住宿、预算与观演路线。`
        : `${title} lineup and travel data stay current — Raven plans flights, stays, budgets, and your set route in one pass.`),
    faq: buildPlannerFaq(activity, travelData, locale),
    venue: localized.location ?? localized.city ?? '',
    country: localized.area ?? '',
  };
}
