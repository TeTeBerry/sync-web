import type { Activity } from './types';
import type { Locale } from './i18n';
import { eventPath } from './event-slug';
import { formatDisplayMoneyRange } from './raven-currency';

export type TravelTier = 'budget' | 'mid' | 'premium';

export type TravelLabeledItem = {
  label: string;
  value: string;
};

export type TravelStayOption = {
  tier: TravelTier;
  label: string;
  description: string;
};

export type TravelBudgetTier = {
  tier: TravelTier;
  estimate: string;
  note: string;
};

export type TravelFaqItem = {
  question: string;
  answer: string;
};

export type TravelSeoLinks = {
  travelGuide: string;
  hotels: string;
  transportation: string;
  budget: string;
  packingList: string;
};

export type EventTravelSection<T> = {
  insight: string;
  items: T;
};

export type EventTravelData = {
  hasRichData: boolean;
  stay: EventTravelSection<{
    bestAreas: string[];
    official: TravelLabeledItem[];
    options: TravelStayOption[];
    groupNote: string;
  }>;
  flights: EventTravelSection<{
    nearestAirport: string;
    arrivalWindow: string;
    departureTips: string;
    airportTransfer: string;
  }>;
  transport: EventTravelSection<{
    shuttle: string;
    publicTransit: string;
    parking: string;
    lateNight: string;
  }>;
  tickets: EventTravelSection<{
    officialLink?: string;
    types: string[];
    resaleNote: string;
    soldOutRisk: string;
  }>;
  budget: EventTravelSection<{
    tiers: TravelBudgetTier[];
    included: string[];
  }>;
  essentials: EventTravelSection<{
    weather: string;
    packing: string[];
    payment: string;
    sim: string;
    safety: string;
  }>;
  faq: TravelFaqItem[];
  seoLinks: TravelSeoLinks;
};

function regionContext(activity: Activity, locale: Locale) {
  const city = activity.city ?? activity.area ?? activity.location ?? '';
  const isOverseas = activity.region === 'overseas';
  const isHmt = activity.region === 'hmt';
  const isDomestic = !isOverseas && !isHmt;
  return { city, isOverseas, isHmt, isDomestic };
}

function buildSeoLinks(locale: Locale, activity: Activity): TravelSeoLinks {
  const base = eventPath(locale, activity);
  return {
    travelGuide: `${base}/travel-guide`,
    hotels: `${base}/hotels`,
    transportation: `${base}/transportation`,
    budget: `${base}/budget`,
    packingList: `${base}/packing-list`,
  };
}

function buildStaySection(
  activity: Activity,
  locale: Locale,
): EventTravelData['stay'] {
  const { city, isOverseas, isHmt } = regionContext(activity, locale);

  if (locale === 'zh') {
    const bestAreas = city
      ? [`${city} 市中心`, `${city} 场馆周边`, isOverseas ? '机场快线沿线' : '地铁枢纽站附近']
      : ['场馆步行圈', '市中心交通枢纽', '官方推荐住宿区'];

    return {
      insight: city
        ? `Raven 建议：优先锁定 ${city} 场馆 3 km 内住宿，回程动线最短；若预算有限，选地铁末班前 20 分钟可达的区域。`
        : 'Raven 建议：优先选择官方合作或场馆步行圈内的住宿，减少深夜返程不确定性。',
      items: {
        bestAreas,
        official: activity.externalUrl
          ? [{ label: '官方信息', value: '主办方页面可能提供合作酒店或露营选项 — 以官网为准。' }]
          : [{ label: '官方信息', value: '暂未收录官方住宿公告，以下建议来自 Raven 出行模型。' }],
        options: [
          {
            tier: 'budget',
            label: '经济型',
            description: city
              ? `${city} 青年旅舍 / 合租公寓，地铁 + 步行组合。`
              : '青年旅舍、合住或远郊民宿，预留充足换乘时间。',
          },
          {
            tier: 'mid',
            label: '中档',
            description: city
              ? `${city} 地铁沿线商务酒店，平衡价格与回程便利。`
              : '地铁/轻轨沿线商务酒店，兼顾舒适与转场效率。',
          },
          {
            tier: 'premium',
            label: '品质型',
            description: city
              ? `${city} 场馆周边精品酒店或官方合作酒店，步行或短驳直达。`
              : '场馆步行圈精品酒店，减少排队与深夜打车等待。',
          },
        ],
        groupNote: isOverseas || isHmt
          ? '多人同行建议整租公寓或相邻房间，统一入住区域便于汇合与分摊成本。'
          : '组队出行优先同一地铁线 2–3 站范围内订房，方便分头看 Set 后汇合。',
      },
    };
  }

  const bestAreas = city
    ? [`${city} city center`, `Near the venue`, isOverseas ? 'Airport express corridor' : 'Metro hub districts']
    : ['Venue walking radius', 'Downtown transit hubs', 'Official partner zone'];

  return {
    insight: city
      ? `Raven recommends staying within 3 km of the ${city} venue for the shortest return route. On a budget, pick a district reachable before the last train.`
      : 'Raven recommends official partner stays or walking-distance hotels to minimize late-night uncertainty.',
    items: {
      bestAreas,
      official: activity.externalUrl
        ? [{ label: 'Official', value: 'The organizer may list partner hotels or camping — confirm on their site.' }]
        : [{ label: 'Official', value: 'No official stay listing yet. Suggestions below come from the Raven travel model.' }],
      options: [
        {
          tier: 'budget',
          label: 'Budget',
          description: city
            ? `Hostels or shared flats in ${city}, metro + walk combo.`
            : 'Hostels, shared stays, or outer-district rooms — buffer extra transfer time.',
        },
        {
          tier: 'mid',
          label: 'Mid-range',
          description: city
            ? `Business hotels on metro lines in ${city} — comfort without premium pricing.`
            : 'Metro-adjacent business hotels balancing price and return convenience.',
        },
        {
          tier: 'premium',
          label: 'Premium',
          description: city
            ? `Boutique or partner hotels near the ${city} venue — walk or short shuttle.`
            : 'Walking-distance boutique stays — skip queues and long ride waits.',
        },
      ],
      groupNote:
        isOverseas || isHmt
          ? 'Groups should book adjacent rooms or a full apartment — same block makes meetups and cost splits easier.'
          : 'Crews should cluster within 2–3 metro stops on one line so you can split sets and reconvene fast.',
    },
  };
}

function buildFlightsSection(
  activity: Activity,
  locale: Locale,
): EventTravelData['flights'] {
  const { city, isOverseas, isDomestic } = regionContext(activity, locale);

  if (locale === 'zh') {
    if (!isOverseas && isDomestic) {
      return {
        insight: '国内场次通常无需航班；若跨城参加，建议提前 4–6 周锁定高铁或机票，避开节假日溢价。',
        items: {
          nearestAirport: city ? `${city} 周边民航/高铁枢纽（视出发地而定）` : '按出发城市选择最近枢纽',
          arrivalWindow: '建议活动前一日中午前抵达，留出休整与取票时间。',
          departureTips: '最后一天预留 3 小时前往车站/机场；高峰日打车需额外缓冲。',
          airportTransfer: city
            ? `抵达 ${city} 后优先地铁/机场快线，高峰时段避免依赖单一打车渠道。`
            : '落地后优先轨道交通，深夜再考虑出租车或网约车。',
        },
      };
    }

    return {
      insight: city
        ? `Raven 建议：飞往 ${city} 主枢纽，活动前一日抵达；返程机票选活动结束后 +1 日中午，避免红眼赶场。`
        : 'Book inbound at least one day early and return the afternoon after the festival closes.',
      items: {
        nearestAirport: city ? `${city} 国际机场（IATA 以航司为准）` : '最近国际机场',
        arrivalWindow: '活动前一日 14:00 前落地最理想，留出入境、交通与入住缓冲。',
        departureTips: '返程尽量选活动结束后次日；若当日飞，预留至少 4 小时前往机场。',
        airportTransfer: city
          ? `${city} 机场快线 / 轨道交通 + 短途打车至住宿；提前下载当地乘车 App。`
          : '机场快线或官方大巴优先，深夜再切换出租车。',
      },
    };
  }

  if (!isOverseas && isDomestic) {
    return {
      insight:
        'No flight needed for local trips. If you are crossing cities, lock rail or air 4–6 weeks out to dodge holiday surges.',
      items: {
        nearestAirport: city ? `Nearest hub serving ${city}` : 'Pick the closest hub from your origin',
        arrivalWindow: 'Arrive by midday the day before — buffer for check-in and wristbands.',
        departureTips: 'Leave 3 hours for the station or airport on your last day; rides surge on peak nights.',
        airportTransfer: city
          ? `Metro or airport express into ${city}; avoid relying on rideshare alone at peak hours.`
          : 'Rail first on landing — switch to taxis after midnight if needed.',
      },
    };
  }

  return {
    insight: city
      ? `Raven recommends flying into the main ${city} hub a day early; return the afternoon after the festival ends.`
      : 'Arrive a day early and fly out the afternoon after close — skip the red-eye rush.',
    items: {
      nearestAirport: city ? `${city} international airport` : 'Nearest international airport',
      arrivalWindow: 'Ideal landing by 2 PM the day before — time for entry, transit, and check-in.',
      departureTips: 'Book return for the day after if possible; same-day flights need a 4-hour airport buffer.',
      airportTransfer: city
        ? `Airport express or rail into ${city}, then a short ride to your stay — save local ride apps offline.`
        : 'Official airport rail or shuttle first; taxis after midnight.',
    },
  };
}

function buildTransportSection(
  activity: Activity,
  locale: Locale,
): EventTravelData['transport'] {
  const { city } = regionContext(activity, locale);

  if (locale === 'zh') {
    return {
      insight: city
        ? `Raven 建议：优先查官方接驳；无班车则提前收藏 ${city} 地铁末班时刻，散场后 45 分钟内离场最省力。`
        : '查官方接驳时刻表；无班车时以末班公共交通反推离场时间。',
      items: {
        shuttle: activity.externalUrl
          ? '以官网公布的官方班车/摆渡车为准（如有）。'
          : '暂未收录官方班车信息 — 关注主办方后续公告。',
        publicTransit: city
          ? `${city} 地铁 / 公交为主；散场高峰站厅拥挤，备好步行至相邻站的备选方案。`
          : '轨道交通优先，高峰时段站厅限流常见。',
        parking: '自驾需提前确认停车预约与散场出口；热门场次车位紧张。',
        lateNight: '末班后优先预授权网约车；组队同行，避免深夜单独偏远路段。',
      },
    };
  }

  return {
    insight: city
      ? `Raven recommends official shuttles first; if none run, save ${city} last-train times and exit within 45 minutes of close.`
      : 'Check official shuttles first; without them, plan backward from the last public transit.',
    items: {
      shuttle: activity.externalUrl
        ? 'Confirm official shuttles on the organizer site if offered.'
        : 'No official shuttle on file yet — watch for organizer updates.',
      publicTransit: city
        ? `Metro or bus in ${city}; exits crowd after headliners — know a walkable backup stop.`
        : 'Rail-first routing; stations throttle crowds on peak nights.',
      parking: 'Driving requires advance parking passes — lots fill on marquee nights.',
      lateNight: 'Pre-authorize ride apps after last train; travel in groups past midnight.',
    },
  };
}

function buildTicketsSection(
  activity: Activity,
  locale: Locale,
): EventTravelData['tickets'] {
  if (locale === 'zh') {
    return {
      insight: activity.hot
        ? '热门场次售罄风险高 — Raven 建议仅通过官方渠道购票，二手票注意实名与入场规则。'
        : '优先官方购票；关注早鸟与分期放票节奏，设好提醒避免错过窗口。',
      items: {
        officialLink: activity.externalUrl,
        types: ['单日票', '通票 / 多日票', 'VIP / 露营套票（如适用）'],
        resaleNote: '二手/转让票务必核对实名政策；非官方渠道存在无法入场风险。',
        soldOutRisk: activity.hot
          ? '高 — 建议开售即时下单，并准备候补或官方 waitlist。'
          : '中 — 热门时段可能阶段性售罄，留意二次放票。',
      },
    };
  }

  return {
    insight: activity.hot
      ? 'High sell-out risk — Raven recommends official channels only; resale tickets may fail ID checks at the gate.'
      : 'Buy official first; track early-bird waves and set alerts so you do not miss a drop.',
    items: {
      officialLink: activity.externalUrl,
      types: ['Single-day', 'Multi-day / full festival', 'VIP / camping bundles (if offered)'],
      resaleNote: 'Resale tickets must match ID rules — unofficial sellers risk denied entry.',
      soldOutRisk: activity.hot
        ? 'High — buy at on-sale; watch for official waitlists or second waves.'
        : 'Medium — peak tiers may sell out in waves; monitor restocks.',
    },
  };
}

/** CNY-authored per-person bands (excl. tickets); EN display converts via raven-currency. */
const BUDGET_TIER_CNY = {
  domestic: {
    budget: { min: 1200, max: 2000 },
    mid: { min: 2200, max: 3500 },
    premium: { min: 4000, max: 4000, plus: true },
  },
  overseas: {
    budget: { min: 1800, max: 2800 },
    mid: { min: 3200, max: 4800 },
    premium: { min: 5500, max: 5500, plus: true },
  },
} as const;

function formatBudgetEstimate(
  band: { min: number; max: number; plus?: boolean },
  locale: Locale,
): string {
  const suffix = locale === 'zh' ? ' / 人' : ' / person';
  return formatDisplayMoneyRange(band.min, band.max, 'CNY', locale, {
    approx: false,
    suffix,
    plus: band.plus,
  });
}

function buildBudgetSection(
  activity: Activity,
  locale: Locale,
): EventTravelData['budget'] {
  const { isOverseas } = regionContext(activity, locale);
  const bands = isOverseas ? BUDGET_TIER_CNY.overseas : BUDGET_TIER_CNY.domestic;

  if (locale === 'zh') {
    const tiers: TravelBudgetTier[] = [
      {
        tier: 'budget',
        estimate: formatBudgetEstimate(bands.budget, locale),
        note: '经济交通 + 合住 + 基础餐饮',
      },
      {
        tier: 'mid',
        estimate: formatBudgetEstimate(bands.mid, locale),
        note: '舒适交通 + 中档酒店 + 日常餐饮',
      },
      {
        tier: 'premium',
        estimate: formatBudgetEstimate(bands.premium, locale),
        note: '优选航班 + 品质住宿 + 专车接驳',
      },
    ];

    return {
      insight: '以下为不含门票的参考人均花费 — 用 Raven 规划器可按你的出发地精确测算。',
      items: {
        tiers,
        included: ['往返大交通', '3–4 晚住宿', '场内场外餐饮', '本地交通', '应急杂费'],
      },
    };
  }

  const tiers: TravelBudgetTier[] = [
    {
      tier: 'budget',
      estimate: formatBudgetEstimate(bands.budget, locale),
      note: 'Economy transit + shared stay + basic meals',
    },
    {
      tier: 'mid',
      estimate: formatBudgetEstimate(bands.mid, locale),
      note: 'Comfortable transit + mid hotels + everyday dining',
    },
    {
      tier: 'premium',
      estimate: formatBudgetEstimate(bands.premium, locale),
      note: 'Preferred flights + boutique stay + private transfers',
    },
  ];

  return {
    insight: 'Estimates exclude tickets — open the Raven planner for a personalized total from your origin.',
    items: {
      tiers,
      included: ['Round-trip transit', '3–4 nights stay', 'On/off-site meals', 'Local transport', 'Buffer spend'],
    },
  };
}

function buildEssentialsSection(
  activity: Activity,
  locale: Locale,
): EventTravelData['essentials'] {
  const { city, isOverseas } = regionContext(activity, locale);

  if (locale === 'zh') {
    return {
      insight: '按户外/室内场次打包 — Raven 会在规划结果里生成完整清单。',
      items: {
        weather: city
          ? `${city} 场次建议关注活动周预报；户外备防晒与轻薄防雨层。`
          : '关注活动周天气预报；户外备防晒、防雨与保暖分层。',
        packing: ['合法证件 / 签注', '舒适步行鞋', '便携充电宝', '耳塞', '密封袋（防潮）', '少量现金'],
        payment: isOverseas
          ? '信用卡 + 少量当地现金；确认境外取现/刷卡手续费。'
          : '移动支付为主，偏远摊位备少量现金。',
        sim: isOverseas ? '落地 eSIM 或当地 SIM；提前下载离线地图。' : '确保数据流量充足；场内信号可能拥堵。',
        safety: '组队行动、设定汇合点；注意补水、防中暑/失温；遵守场馆安检与禁品规定。',
      },
    };
  }

  return {
    insight: 'Pack for open-air or indoor — Raven generates a full checklist in your plan.',
    items: {
      weather: city
        ? `Watch the ${city} forecast for festival week; open-air means sun protection and a light rain layer.`
        : 'Check the weekly forecast; bring sun, rain, and layering for temperature swings.',
      packing: ['Valid ID / visas', 'Broken-in shoes', 'Power bank', 'Earplugs', 'Zip bags', 'Small cash stash'],
      payment: isOverseas
        ? 'Card + some local cash; confirm foreign ATM and FX fees.'
        : 'Mobile pay works most places — keep cash for remote vendors.',
      sim: isOverseas ? 'eSIM or local SIM on arrival; download offline maps ahead.' : 'Load data before gates — cell networks congest.',
      safety: 'Set meetup points, hydrate, and respect security rules on banned items.',
    },
  };
}

function buildFaq(activity: Activity, locale: Locale): TravelFaqItem[] {
  const { city } = regionContext(activity, locale);
  const title = activity.title ?? activity.name;

  if (locale === 'zh') {
    return [
      {
        question: `${title} 最佳抵达时间？`,
        answer: '建议活动前一日中午前抵达，留出入住、取票与熟悉场馆动线的时间。',
      },
      {
        question: '住宿应该订在哪里？',
        answer: city
          ? `优先 ${city} 场馆 3 km 内或地铁末班可达区域；组队出行保持同一交通走廊。`
          : '优先场馆步行圈或官方合作酒店；远郊需核算深夜返程成本。',
      },
      {
        question: '官方班车值得等吗？',
        answer: '若有官方接驳，通常比散场打车更稳定；无班车则以末班公共交通反推离场时间。',
      },
      {
        question: '门票售罄怎么办？',
        answer: '关注官方二次放票或 waitlist；避免无保障的二手票，入场实名检查越来越严。',
      },
      {
        question: '需要带现金吗？',
        answer: activity.region === 'overseas'
          ? '建议信用卡为主、少量当地现金备用，小摊位可能只收现金。'
          : '移动支付覆盖率高，仍建议备少量现金应对信号差或临时摊位。',
      },
      {
        question: '散场后怎么回酒店最安全？',
        answer: '优先公共交通或官方班车；深夜打车请组队并分享行程，避免偏僻路段单独行动。',
      },
      {
        question: '大概预算要留多少？',
        answer: '不含门票，国内场次人均约 ¥1,200–3,500 视档次而定；海外场次通常更高，可用 Raven 规划器精确测算。',
      },
    ];
  }

  return [
    {
      question: `When should I arrive for ${title}?`,
      answer: 'Aim for midday the day before — time to check in, pick up wristbands, and learn the venue flow.',
    },
    {
      question: 'Where should I book a hotel?',
      answer: city
        ? `Within 3 km of the ${city} venue or along the last train line — crews should stay on one transit corridor.`
        : 'Walking distance or official partners first; outer districts need a late-night return plan.',
    },
    {
      question: 'Are official shuttles worth it?',
      answer: 'If the organizer runs them, they beat post-close rideshare surges; otherwise plan from last transit.',
    },
    {
      question: 'What if tickets sell out?',
      answer: 'Watch official restocks or waitlists — resale tickets increasingly fail ID checks at the gate.',
    },
    {
      question: 'Do I need cash on site?',
      answer:
        activity.region === 'overseas'
          ? 'Cards plus a little local cash — some vendors are cash-only.'
          : 'Mobile pay covers most stalls; keep small cash when signal drops.',
    },
    {
      question: 'Safest way back after close?',
      answer: 'Transit or official shuttles first; after midnight, rideshare in groups and share your route.',
    },
    {
      question: 'How much should I budget?',
      answer: `Excluding tickets, domestic trips often run ${formatDisplayMoneyRange(1200, 3500, 'CNY', 'en', { approx: false })} per person by tier; overseas costs more — use the Raven planner for your origin.`,
    },
  ];
}

export function buildEventTravelData(activity: Activity, locale: Locale): EventTravelData {
  return {
    hasRichData: Boolean(activity.city || activity.location || activity.externalUrl),
    stay: buildStaySection(activity, locale),
    flights: buildFlightsSection(activity, locale),
    transport: buildTransportSection(activity, locale),
    tickets: buildTicketsSection(activity, locale),
    budget: buildBudgetSection(activity, locale),
    essentials: buildEssentialsSection(activity, locale),
    faq: buildFaq(activity, locale),
    seoLinks: buildSeoLinks(locale, activity),
  };
}
