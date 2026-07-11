import type { RavenTravelGuidePlan } from './api';
import type { Locale } from './i18n';
import type { PlannerPlan, PlannerTimelineDay } from './planner-plan';
import { looksLikeChineseCopy } from './planner-result';
import {
  formatDisplayMoney,
  localizeMoneyText,
  type DisplayCurrency,
} from './raven-currency';

export type PriceSource = 'live' | 'estimated' | 'unavailable' | 'user';

export type RavenJourneyStayOption = {
  badge: string;
  name: string;
  note: string;
  reason?: string;
  bookingHint?: string;
  source: PriceSource;
};

export type RavenJourneyFlightOption = {
  badge: string;
  route: string;
  detail: string;
  price?: string;
  cabin?: string;
  source: PriceSource;
  tradeoff?: string;
};

export type RavenJourneyBudgetItem = {
  label: string;
  amount: string;
  note?: string;
  source: PriceSource;
  share?: number;
};

export type RavenJourneyTimelineDay = {
  label: string;
  lines: string[];
  /** Short emotional beat for the day — Journey Timeline primitive. */
  feeling?: string;
};

export type RavenJourneyEssentialsGroup = {
  title: string;
  items: string[];
};

export type RavenJourneyView = {
  festivalName: string;
  destination: string;
  festivalDates: string;
  tripNights: number;
  travelers: number;
  origin: string;
  summary: string;
  /** Short editorial breath — replaces the glance card grid. */
  breath: string[];
  glance: {
    flight: { headline: string; detail: string; reason?: string };
    stay: { headline: string; detail: string; reason?: string };
    festival: { headline: string; detail: string };
    budget: { headline: string; detail: string; source: PriceSource };
  };
  festivalExperience: {
    nonNegotiables: string[];
    ravenPicks: string[];
    conflicts: string[];
    dailyFlow: Array<{
      label: string;
      sets: Array<{ time: string; artist: string; stage: string; highlight?: boolean }>;
    }>;
    setTimesStatus: 'available' | 'unavailable';
  };
  stayStrategy: {
    areaHeadline: string;
    areaReasons: string[];
    options: RavenJourneyStayOption[];
  };
  flightStrategy: {
    recommendation: string;
    reasons: string[];
    options: RavenJourneyFlightOption[];
  };
  timeline: RavenJourneyTimelineDay[];
  budget: {
    total: string;
    items: RavenJourneyBudgetItem[];
    insight?: string;
  };
  essentials: RavenJourneyEssentialsGroup[];
  insights: string[];
};

function formatMoney(amount: number, currency: DisplayCurrency, locale: Locale): string {
  return formatDisplayMoney(amount, currency, locale);
}

export function detectPriceSource(note?: string, range?: string): PriceSource {
  const sample = `${note ?? ''} ${range ?? ''}`;
  if (/unavailable|暂无|不可用|Live price unavailable/i.test(sample)) return 'unavailable';
  if (/Live|实时|RollingGo/i.test(sample)) return 'live';
  return 'estimated';
}

/** True for trip-total rows — not ordinary line items that happen to mention cost. */
export function isBudgetTotalLabel(label: string): boolean {
  const normalized = label.trim();
  if (!normalized) return false;
  if (/subtotal|小计/i.test(normalized)) return false;
  return (
    /合计参考|全程合计|estimated\s+total|(^|\s)total(\s|\(|$)/i.test(normalized) ||
    /^合计/.test(normalized)
  );
}

function flightOfferDetail(
  offer: NonNullable<RavenTravelGuidePlan['transport']['flightOffers']>[number],
  locale: Locale,
): string {
  const out = offer.outbound;
  const parts = [
    out.depTime && out.arrTime ? `${out.depTime} → ${out.arrTime}` : null,
    localizeFlightLabel(out.stopsLabel, locale),
    offer.return
      ? locale === 'zh'
        ? `返程 ${offer.return.depTime ?? ''} → ${offer.return.arrTime ?? ''}`.trim()
        : `Return ${offer.return.depTime ?? ''} → ${offer.return.arrTime ?? ''}`.trim()
      : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

/** Best-effort EN display when older cached plans still carry Chinese inventory labels. */
function localizeFlightLabel(value: string | undefined, locale: Locale): string | undefined {
  if (!value?.trim()) return value;
  if (locale !== 'en') return value;
  return value
    .replace(/超级经济舱/g, 'Premium Economy')
    .replace(/经济舱/g, 'Economy')
    .replace(/公务舱|商务舱/g, 'Business')
    .replace(/头等舱/g, 'First')
    .replace(/直飞|直达/g, 'Direct')
    .replace(/(\d+)\s*次经停/g, '$1 stop(s)')
    .replace(/(\d+)\s*次中转/g, '$1 stop(s)')
    .replace(/经停/g, 'Stopover')
    .replace(/中转/g, 'Connection');
}

function localizeHotelCopy(value: string | undefined, locale: Locale): string | undefined {
  if (!value?.trim()) return value;
  if (locale !== 'en') return value;
  return value
    .replace(/距会场约/g, '~')
    .replace(/\s*km/gi, ' km to venue')
    .replace(/晚/g, ' night(s)')
    .replace(/人/g, ' guest(s)')
    .replace(/建议\s*/g, '')
    .replace(/间/g, ' room(s)')
    .replace(/起步约/g, 'From ')
    .replace(/约\s*/g, 'About ')
    .replace(/价格以实时查询为准/g, 'Price subject to live OTA rates')
    .replace(/参考预订链接\s*·\s*以 OTA 实时为准/g, 'Reference booking link · confirm live OTA rates')
    .replace(/综合推荐/g, 'Best overall')
    .replace(/备选酒店/g, 'Backup stay')
    .replace(/性价比高/g, 'Good value')
    .replace(/距会场最近/g, 'Closest to venue')
    .replace(/评分优秀/g, 'Strong reviews')
    .replace(/交通便利/g, 'Easy transfer');
}

function isDirectLabel(stopsLabel: string | undefined): boolean {
  return /direct|non[\s-]?stop|直飞|直达/i.test(stopsLabel ?? '');
}

function stopCount(stopsLabel: string | undefined): number {
  if (isDirectLabel(stopsLabel)) return 0;
  const matched = stopsLabel?.match(/(\d+)/);
  return matched ? Number(matched[1]) : 1;
}

/** Derive badges from offer attributes — never invent comfort/cost by array index alone. */
export function assignFlightBadges(
  offers: NonNullable<RavenTravelGuidePlan['transport']['flightOffers']>,
  locale: Locale,
): string[] {
  const en = locale === 'en';
  const badges: string[] = offers.map(() => (en ? 'Alternative' : '备选'));
  if (!offers.length) return badges;

  badges[0] = en ? 'Recommended' : '推荐';

  let cheapestIdx = 0;
  for (let i = 1; i < offers.length; i += 1) {
    if (offers[i]!.pricePerAdult < offers[cheapestIdx]!.pricePerAdult) cheapestIdx = i;
  }
  if (cheapestIdx !== 0) {
    badges[cheapestIdx] = en ? 'Lowest Cost' : '最低成本';
  }

  let fewestStopsIdx = 0;
  for (let i = 1; i < offers.length; i += 1) {
    const current = stopCount(offers[i]!.outbound.stopsLabel);
    const best = stopCount(offers[fewestStopsIdx]!.outbound.stopsLabel);
    if (current < best) fewestStopsIdx = i;
  }
  if (fewestStopsIdx !== 0 && fewestStopsIdx !== cheapestIdx) {
    badges[fewestStopsIdx] = en ? 'Fewest Stops' : '最少经停';
  } else if (
    fewestStopsIdx === 0 &&
    offers.length > 1 &&
    isDirectLabel(offers[0]?.outbound.stopsLabel) &&
    cheapestIdx === 0
  ) {
    // Keep Recommended; second offer stays Alternative / Lowest Cost if assigned.
  }

  return badges;
}

function flightTradeoff(
  offer: NonNullable<RavenTravelGuidePlan['transport']['flightOffers']>[number],
  recommended: NonNullable<RavenTravelGuidePlan['transport']['flightOffers']>[number] | undefined,
  locale: Locale,
): string | undefined {
  if (!recommended || offer === recommended) return undefined;
  const en = locale === 'en';
  const offerStops = stopCount(offer.outbound.stopsLabel);
  const recStops = stopCount(recommended.outbound.stopsLabel);
  if (offerStops > recStops) {
    return en ? 'More stops than the recommended route.' : '经停多于推荐航线。';
  }
  if (offer.pricePerAdult > recommended.pricePerAdult * 1.15) {
    return en ? 'Higher fare than the recommended route.' : '票价高于推荐航线。';
  }
  if (offer.pricePerAdult < recommended.pricePerAdult) {
    return en ? 'Lower fare may mean a longer or less convenient route.' : '更低票价可能意味着更绕或更不便。';
  }
  return undefined;
}

function detectScheduleConflicts(
  days: PlannerTimelineDay[],
  favoriteArtists: string[],
  locale: Locale,
): string[] {
  if (!favoriteArtists.length) return [];
  const favorites = new Set(favoriteArtists.map((name) => name.trim().toLowerCase()));
  const conflicts: string[] = [];

  for (const day of days) {
    const prioritySets = day.sets.filter((set) => favorites.has(set.artist.trim().toLowerCase()));
    for (let i = 0; i < prioritySets.length; i += 1) {
      for (let j = i + 1; j < prioritySets.length; j += 1) {
        const left = prioritySets[i]!;
        const right = prioritySets[j]!;
        if (left.time === right.time) {
          conflicts.push(
            locale === 'zh'
              ? `${left.artist} 与 ${right.artist} 可能撞场 — 建议提前定优先级`
              : `${left.artist} likely conflicts with ${right.artist} — decide your priority early`,
          );
        }
      }
    }
  }

  return conflicts.slice(0, 3);
}

export function buildRavenJourneyView(input: {
  remote: RavenTravelGuidePlan | null | undefined;
  local: PlannerPlan;
  locale: Locale;
  festivalName: string;
  destination: string;
  festivalDates: string;
  favoriteArtists: string[];
  /** Performance-backed days only — never itinerary-mapped fake clock times. */
  scheduleDays?: PlannerTimelineDay[];
  /** Only true when real timetable data exists. */
  hasTimedSchedule?: boolean;
  /** Fallback traveler count from preferences when remote omits headcount. */
  travelersFallback?: number;
}): RavenJourneyView {
  const {
    remote,
    local,
    locale,
    festivalName,
    destination,
    festivalDates,
    favoriteArtists,
    scheduleDays = [],
    hasTimedSchedule = false,
    travelersFallback = 1,
  } = input;
  const en = locale === 'en';
  const stayBadges = en
    ? (['Best Overall', 'Best Value', 'Best for Groups'] as const)
    : (['综合优选', '性价比', '适合同行'] as const);

  const travelers = remote?.headcount ?? travelersFallback;
  const tripNights = remote?.accommodationNights ?? 0;
  const origin = remote?.departure?.trim() || '—';

  const tipItems = remote?.tips.items?.filter(Boolean) ?? local.experiences;
  const summary =
    tipItems[0] ||
    local.vibe ||
    (en
      ? `A personalized festival journey built around how you want to travel, stay, and experience the lineup.`
      : `围绕你的出行、住宿与阵容偏好，为你组装的专属电音节旅程。`);

  const hotels = remote?.accommodation.hotels ?? [];
  const schemes = remote?.accommodation.schemes ?? [];
  const stayOptionsSource =
    schemes.length > 0
      ? schemes.slice(0, 3).map((scheme, index) => ({
          badge: scheme.label || stayBadges[index] || stayBadges[0],
          name: scheme.name,
          note: localizeMoneyText(localizeHotelCopy(scheme.note, locale) || scheme.note, locale) || '',
          reason: localizeMoneyText(localizeHotelCopy(scheme.reason, locale), locale),
          bookingHint: localizeMoneyText(localizeHotelCopy(scheme.bookingHint, locale), locale),
          source: detectPriceSource(scheme.note),
        }))
      : hotels.slice(0, 3).map((hotel, index) => ({
          badge: stayBadges[index] || stayBadges[0],
          name: hotel.name,
          note: localizeMoneyText(localizeHotelCopy(hotel.note, locale) || hotel.note, locale) || '',
          reason: localizeMoneyText(localizeHotelCopy(hotel.reason, locale), locale),
          bookingHint: localizeMoneyText(localizeHotelCopy(hotel.bookingHint, locale), locale),
          source: detectPriceSource(hotel.note),
        }));

  const flightOffers = remote?.transport.flightOffers ?? [];
  const flightBadges = assignFlightBadges(flightOffers, locale);
  const recommendedOffer = flightOffers[0];
  const flightOptions: RavenJourneyFlightOption[] =
    flightOffers.length > 0
      ? flightOffers.slice(0, 3).map((offer, index) => ({
          badge: flightBadges[index] || (en ? 'Alternative' : '备选'),
          route: offer.outbound.route,
          detail: flightOfferDetail(offer, locale),
          price: formatMoney(offer.pricePerAdult, offer.currency, locale) + (en ? ' / person' : '/人'),
          cabin: localizeFlightLabel(offer.cabinLabel, locale),
          source: 'live' as const,
          tradeoff: flightTradeoff(offer, recommendedOffer, locale),
        }))
      : remote?.transport.lines?.length
        ? [
            {
              badge: en ? 'Recommended' : '推荐',
              route: remote.transport.lines[0]!,
              detail: remote.transport.lines.slice(1, 3).join(' · '),
              source: 'estimated' as const,
            },
          ]
        : local.travel.flight
          ? [
              {
                badge: en ? 'Recommended' : '推荐',
                route: local.travel.flight,
                detail: '',
                source: 'estimated' as const,
              },
            ]
          : [];

  const budgetItemsRaw = remote?.budget?.items ?? [];
  const budgetItems: RavenJourneyBudgetItem[] =
    budgetItemsRaw.length > 0
      ? budgetItemsRaw.map((item) => ({
          label: item.label,
          amount: localizeMoneyText(item.range, locale) || item.range,
          note: localizeMoneyText(item.note, locale),
          source: detectPriceSource(item.note, item.range),
        }))
      : local.budget.items.map((item) => ({
          label: item.label,
          amount: localizeMoneyText(item.amount, locale) || item.amount,
          source: 'estimated' as const,
          share: item.share,
        }));

  const usedRemoteBudget = budgetItemsRaw.length > 0;
  const totalRow = [...budgetItems].reverse().find((item) => isBudgetTotalLabel(item.label));
  // Never mix a local fallback total with remote line items — omit until a real total exists.
  const budgetTotal = totalRow?.amount
    ? totalRow.amount
    : usedRemoteBudget
      ? ''
      : localizeMoneyText(local.budget.total, locale) || local.budget.total;

  const dailyFlow =
    hasTimedSchedule && scheduleDays.length > 0
      ? scheduleDays.map((day) => ({
          label: day.label,
          sets: day.sets.map((set) => ({
            time: set.time,
            artist: set.artist,
            stage: set.stage,
            highlight: set.highlight,
          })),
        }))
      : [];

  const mustSee = favoriteArtists[0] || dailyFlow[0]?.sets.find((s) => s.highlight)?.artist;

  const timeline: RavenJourneyTimelineDay[] = remote?.itinerary?.days?.length
    ? remote.itinerary.days.map((day, index) => {
        const city = (destination || remote?.venue || festivalName).split(',')[0]?.trim() || '';
        const last = index === remote.itinerary!.days.length - 1;
        const feeling =
          index === 0
            ? en
              ? city
                ? `Arrive in ${city} with enough calm to settle before the first night.`
                : 'Arrive with enough calm to settle before the first night.'
              : city
                ? `抵达 ${city}，先安顿，再迎第一夜。`
                : '留出余裕抵达，先安顿再迎第一夜。'
            : last
              ? en
                ? city
                  ? `Close the weekend gently — one last night around ${city}.`
                  : 'Close the weekend gently — leave room for the last night.'
                : city
                  ? `温柔收束这个周末 — 在 ${city} 留下最后一夜。`
                  : '温柔收束这个周末，给最后一夜留白。'
              : local.experiences[index] ||
                (mustSee && index === 1
                  ? en
                    ? `Build the day toward ${mustSee}.`
                    : `这一天的节奏朝向 ${mustSee}。`
                  : tipItems[index + 1]);
        return {
          label: day.label,
          lines: day.lines.filter(Boolean),
          feeling: feeling || undefined,
        };
      })
    : [];

  const essentials: RavenJourneyEssentialsGroup[] = [];
  if (remote?.essentials) {
    if (remote.essentials.network.length) {
      essentials.push({
        title: en ? 'Network' : '网络',
        items: remote.essentials.network,
      });
    }
    if (remote.essentials.payment.length) {
      essentials.push({
        title: en ? 'Payment' : '支付',
        items: remote.essentials.payment,
      });
    }
    if (remote.essentials.apps.length) {
      essentials.push({
        title: en ? 'Apps' : '应用',
        items: remote.essentials.apps,
      });
    }
  }
  if (remote?.documents?.items.length) {
    essentials.push({
      title: remote.documents.title || (en ? 'Documents' : '证件'),
      items: remote.documents.items,
    });
  }
  if (remote?.tickets?.channels.length) {
    essentials.push({
      title: remote.tickets.title || (en ? 'Tickets' : '门票'),
      items: remote.tickets.channels.map((ch) => `${ch.name} — ${ch.note}`),
    });
  }

  const insights = tipItems
    .slice(1, 5)
    .filter(
      (tip) =>
        tip.length > 24 && !/book early|stay hydrated|have fun|早点订|多喝水|玩得开心/i.test(tip),
    )
    .slice(0, 4);

  const primaryStay = stayOptionsSource[0];
  const primaryFlight = flightOptions[0];
  const ravenPicks = [
    ...local.experiences.slice(0, 2),
    ...(remote?.nightlife.spots ?? [])
      .slice(0, 2)
      .map((spot) =>
        spot.reason
          ? `${spot.name} — ${spot.reason}`
          : spot.note
            ? `${spot.name} — ${spot.note}`
            : spot.name,
      ),
  ]
    .filter(Boolean)
    .slice(0, 4);

  const conflicts =
    hasTimedSchedule && scheduleDays.length
      ? detectScheduleConflicts(scheduleDays, favoriteArtists, locale)
      : [];

  const areaHeadline =
    local.travel.stay?.trim() ||
    (en ? 'Stay near the festival rhythm' : '贴近音乐节节奏的住宿');

  const glanceFlight = {
    headline: primaryFlight?.route || (en ? 'Getting there is still assembling' : '抵达方式组装中'),
    detail: primaryFlight?.price || primaryFlight?.detail || '',
    reason: remote?.transport.lines[1],
  };
  const glanceStay = {
    headline: primaryStay?.name || local.travel.stay || (en ? 'Stay still assembling' : '住宿组装中'),
    detail: primaryStay?.note || '',
    reason: primaryStay?.reason,
  };
  const glanceFestival = {
    headline:
      favoriteArtists.length > 0
        ? en
          ? `${favoriteArtists.length} artists locked in`
          : `${favoriteArtists.length} 位已锁定艺人`
        : en
          ? 'Your festival nights'
          : '你的音乐节之夜',
    detail: mustSee
      ? en
        ? `Anchor night around ${mustSee}`
        : `以 ${mustSee} 作为高光锚点`
      : tipItems[1] || '',
  };
  const glanceBudget = {
    headline: budgetTotal,
    detail: budgetItems[0] ? `${budgetItems[0].label} ${budgetItems[0].amount}` : '',
    source: (budgetItems.some((item) => item.source === 'live') ? 'live' : 'estimated') as PriceSource,
  };

  const breath = [
    glanceStay.reason || glanceStay.headline
      ? en
        ? glanceStay.reason
          ? `Wake near the festival rhythm — ${glanceStay.reason}`
          : `Wake near ${glanceStay.headline}`
        : glanceStay.reason
          ? `贴近音乐节节奏醒来 — ${glanceStay.reason}`
          : `住在 ${glanceStay.headline}`
      : null,
    glanceFestival.detail ||
      (mustSee
        ? en
          ? `Hold the nights for ${mustSee}`
          : `把夜晚留给 ${mustSee}`
        : null),
    glanceFlight.headline && glanceFlight.headline !== (en ? 'Getting there is still assembling' : '抵达方式组装中')
      ? en
        ? `Get there via ${glanceFlight.headline}`
        : `经 ${glanceFlight.headline} 抵达`
      : null,
    budgetTotal
      ? en
        ? `Keep the trip around ${budgetTotal}`
        : `这趟旅程大约 ${budgetTotal}`
      : null,
  ].filter((line): line is string => Boolean(line?.trim())).slice(0, 4);

  return {
    festivalName: remote?.activityName || festivalName,
    // Prefer page/city destination over venue name (e.g. "Antwerp, Belgium" vs "De Schorre").
    destination: destination || remote?.venue || '',
    festivalDates: remote?.eventDates || festivalDates,
    tripNights,
    travelers,
    origin,
    summary,
    breath,
    glance: {
      flight: glanceFlight,
      stay: glanceStay,
      festival: glanceFestival,
      budget: glanceBudget,
    },
    festivalExperience: {
      nonNegotiables: favoriteArtists.slice(0, 6),
      ravenPicks,
      conflicts,
      dailyFlow,
      setTimesStatus:
        hasTimedSchedule && dailyFlow.some((day) => day.sets.length > 0) ? 'available' : 'unavailable',
    },
    stayStrategy: {
      areaHeadline,
      areaReasons: [
        primaryStay?.reason,
        remote?.venueTransport?.options[0]?.label
          ? en
            ? `Transfer: ${remote.venueTransport.options[0].label}`
            : `接驳：${remote.venueTransport.options[0].label}`
          : undefined,
      ].filter((value): value is string => Boolean(value)),
      options: stayOptionsSource,
    },
    flightStrategy: {
      recommendation:
        primaryFlight?.route ||
        remote?.transport.lines[0] ||
        local.travel.flight ||
        (en ? 'Route still assembling' : '航线组装中'),
      reasons: remote?.transport.lines.slice(1, 3) ?? [],
      options: flightOptions,
    },
    timeline,
    budget: {
      total: budgetTotal,
      items: budgetItems,
      insight: tipItems.find((tip) => /budget|share|room|预算|合住|人均/i.test(tip)),
    },
    essentials,
    insights,
  };
}

export function journeyLooksChinese(view: RavenJourneyView): boolean {
  return looksLikeChineseCopy(
    [view.summary, view.glance.flight.headline, view.glance.stay.headline, ...view.insights].join(' '),
  );
}
