import type { RavenTravelGuidePlan } from "./api";
import type { Locale } from "./i18n";
import type { PlannerPlan, PlannerTimelineDay } from "./planner-plan";
import { looksLikeChineseCopy } from "./planner-result";
import {
  formatDisplayMoney,
  localizeMoneyText,
  type DisplayCurrency,
} from "./raven-currency";

export type PriceSource = "live" | "estimated" | "unavailable" | "user";

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
  recommendationReason?: string;
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
      sets: Array<{
        time: string;
        artist: string;
        stage: string;
        highlight?: boolean;
      }>;
    }>;
    setTimesStatus: "available" | "unavailable";
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
    /** Calm confidence cue for Budget Confidence primitive. */
    confidence: PriceSource;
  };
  essentials: RavenJourneyEssentialsGroup[];
  insights: string[];
};

function formatMoney(
  amount: number,
  currency: DisplayCurrency,
  locale: Locale,
): string {
  return formatDisplayMoney(amount, currency, locale);
}

export function detectPriceSource(note?: string, range?: string): PriceSource {
  const sample = `${note ?? ""} ${range ?? ""}`;
  if (/unavailable|暂无|不可用|Live price unavailable/i.test(sample))
    return "unavailable";
  if (
    /Live|实时|RollingGo|recommended (?:flight|hotel) reference|verified ticket-channel reference|推荐(?:航班|酒店)参考|已核验票务渠道参考/i.test(
      sample,
    )
  )
    return "live";
  return "estimated";
}

/** True for trip-total rows — not ordinary line items that happen to mention cost. */
export function isBudgetTotalLabel(label: string): boolean {
  const normalized = label.trim();
  if (!normalized) return false;
  if (/subtotal|小计/i.test(normalized)) return false;
  return (
    /合计参考|全程合计|estimated\s+total|(^|\s)total(\s|\(|$)/i.test(
      normalized,
    ) || /^合计/.test(normalized)
  );
}

function flightOfferDetail(
  offer: NonNullable<RavenTravelGuidePlan["transport"]["flightOffers"]>[number],
  locale: Locale,
): string {
  const out = offer.outbound;
  const parts = [
    out.depTime && out.arrTime ? `${out.depTime} → ${out.arrTime}` : null,
    localizeFlightLabel(out.stopsLabel, locale),
    offer.return
      ? locale === "zh"
        ? `返程 ${offer.return.depTime ?? ""} → ${offer.return.arrTime ?? ""}`.trim()
        : `Return ${offer.return.depTime ?? ""} → ${offer.return.arrTime ?? ""}`.trim()
      : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** Best-effort EN display when older cached plans still carry Chinese inventory labels. */
function localizeFlightLabel(
  value: string | undefined,
  locale: Locale,
): string | undefined {
  if (!value?.trim()) return value;
  if (locale !== "en") return value;
  return value
    .replace(
      /上海浦东\/虹桥国际机场/g,
      "Shanghai Pudong / Hongqiao International Airports",
    )
    .replace(
      /上海虹桥\/浦东国际机场/g,
      "Shanghai Hongqiao / Pudong International Airports",
    )
    .replace(/新加坡樟宜国际机场/g, "Singapore Changi International Airport")
    .replace(/新加坡国际机场/g, "Singapore International Airport")
    .replace(/普吉国际机场/g, "Phuket International Airport")
    .replace(/曼谷国际机场/g, "Bangkok International Airport")
    .replace(/仁川国际机场/g, "Incheon International Airport")
    .replace(/普吉岛|普吉/g, "Phuket")
    .replace(/芭提雅/g, "Pattaya")
    .replace(/曼谷/g, "Bangkok")
    .replace(/清迈/g, "Chiang Mai")
    .replace(/苏梅岛|苏梅/g, "Koh Samui")
    .replace(/仁川/g, "Incheon")
    .replace(/首尔/g, "Seoul")
    .replace(/东京/g, "Tokyo")
    .replace(/大阪/g, "Osaka")
    .replace(/香港/g, "Hong Kong")
    .replace(/澳门/g, "Macau")
    .replace(/台北/g, "Taipei")
    .replace(/高雄/g, "Kaohsiung")
    .replace(/布鲁塞尔/g, "Brussels")
    .replace(/安特卫普/g, "Antwerp")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/\s*\(([^)]*)\)/g, " ($1)")
    .replace(/超级经济舱/g, "Premium Economy")
    .replace(/经济舱/g, "Economy")
    .replace(/公务舱|商务舱/g, "Business")
    .replace(/头等舱/g, "First")
    .replace(/直飞|直达/g, "Direct")
    .replace(/(\d+)\s*次经停/g, "$1 stop(s)")
    .replace(/(\d+)\s*次中转/g, "$1 stop(s)")
    .replace(/经停/g, "Stopover")
    .replace(/中转/g, "Connection")
    .replace(/去程/g, "Outbound")
    .replace(/返程/g, "Return")
    .replace(/约\s*/g, "about ")
    .replace(/\/人起/g, "/ person")
    .replace(/\/人/g, "/ person");
}

/** Prefer English-safe prose for EN locale; drop Chinese-dominated lines. */
export function englishSafeLines(
  lines: string[] | undefined,
  locale: Locale,
): string[] {
  if (!lines?.length) return [];
  if (locale !== "en") return lines.filter(Boolean);
  return lines
    .map((line) => localizeFlightLabel(line, locale)?.trim() || "")
    .filter((line) => line && !looksLikeChineseCopy(line));
}

function englishSafeText(
  value: string | undefined,
  locale: Locale,
  fallback = "",
): string {
  if (!value?.trim()) return fallback;
  if (locale !== "en") return value;
  const localized = localizeFlightLabel(value, locale)?.trim() || value.trim();
  if (!/[\u3400-\u9fff]/.test(localized)) return localized;
  if (!fallback.trim()) return "";
  const localizedFallback = localizeFlightLabel(fallback, locale)?.trim() || "";
  return /[\u3400-\u9fff]/.test(localizedFallback)
    ? "Festival destination"
    : localizedFallback;
}

/** System route copy must never mix Chinese place labels into an English plan. */
function englishSystemPlace(
  value: string,
  locale: Locale,
  airportCode?: string,
): string {
  if (locale !== "en") return value;
  const normalized = value.trim();
  if (!looksLikeChineseCopy(normalized)) return normalized;
  return airportCode
    ? `${airportCode.toUpperCase()} Airport`
    : "Festival destination";
}

function localizeHotelCopy(
  value: string | undefined,
  locale: Locale,
): string | undefined {
  if (!value?.trim()) return value;
  if (locale !== "en") return value;
  return value
    .replace(/距会场约/g, "~")
    .replace(/\s*km/gi, " km to venue")
    .replace(/晚/g, " night(s)")
    .replace(/人/g, " guest(s)")
    .replace(/建议\s*/g, "")
    .replace(/间/g, " room(s)")
    .replace(/起步约/g, "From ")
    .replace(/约\s*/g, "About ")
    .replace(/价格以实时查询为准/g, "Price subject to live OTA rates")
    .replace(
      /参考预订链接\s*·\s*以 OTA 实时为准/g,
      "Reference booking link · confirm live OTA rates",
    )
    .replace(/综合推荐/g, "Best overall")
    .replace(/备选酒店/g, "Backup stay")
    .replace(/性价比高/g, "Good value")
    .replace(/距会场最近/g, "Closest to venue")
    .replace(/评分优秀/g, "Strong reviews")
    .replace(/交通便利/g, "Easy transfer");
}

/** Keep API prose as optional detail; the primary journey surface needs one calm decision at a time. */
function conciseText(value: string | undefined, limit = 150): string {
  const normalized =
    value
      ?.replace(/\s+/g, " ")
      .replace(/\bto venue to venue\b/gi, "to venue")
      .trim() ?? "";
  if (!normalized) return "";
  const firstThought = normalized.split(/[；;]/)[0]?.trim() || normalized;
  return firstThought.length > limit
    ? `${firstThought.slice(0, limit - 1).trimEnd()}…`
    : firstThought;
}

function conciseHotelDetail(value: string | undefined): string {
  const normalized = conciseText(value, 240);
  if (!normalized) return "";
  return normalized
    .split(/\s*·\s*/)
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");
}

function conciseStayHeadline(
  value: string | undefined,
  destination: string,
  locale: Locale,
): string {
  const normalized = conciseText(value, 96);
  const city = destination.split(",")[0]?.trim();
  if (!normalized || /[；;]/.test(value ?? "") || normalized.length > 88) {
    return locale === "zh"
      ? city
        ? `住在 ${city} 场地附近`
        : "住在场地附近"
      : city
        ? `Stay close to ${city}`
        : "Stay close to the festival";
  }
  return normalized;
}

function conciseFlightRoute(value: string | undefined, locale: Locale): string {
  const normalized = conciseText(value, 180);
  if (!normalized) return "";
  const internationalRoute = normalized.match(
    /travel\s+from\s+[「“\"]?(.+?)[」”\"]?\s+to\s+(.+?)\s+is\s+international/i,
  );
  if (internationalRoute) {
    return `${internationalRoute[1]!.trim()} → ${internationalRoute[2]!.trim()}`;
  }
  const match = normalized.match(
    /(?:fly|flight)\s+from\s+(.+?)\s+to\s+(.+?)(?=\s+(?:with|via|through)|[,.;]|$)/i,
  );
  if (match) return `${match[1]!.trim()} → ${match[2]!.trim()}`;
  const arrowRoute = normalized.match(/(.+?)\s*(?:→|->)\s*(.+)/);
  if (arrowRoute)
    return `${arrowRoute[1]!.replace(/^fly\s+/i, "").trim()} → ${conciseText(arrowRoute[2], 74)}`;
  return locale === "zh"
    ? conciseText(normalized, 64)
    : conciseText(normalized, 84);
}

function isDirectLabel(stopsLabel: string | undefined): boolean {
  return /direct|non[\s-]?stop|直飞|直达/i.test(stopsLabel ?? "");
}

function stopCount(stopsLabel: string | undefined): number {
  if (isDirectLabel(stopsLabel)) return 0;
  const matched = stopsLabel?.match(/(\d+)/);
  return matched ? Number(matched[1]) : 1;
}

/** Expose the scored recommendation categories carried in backend offer order. */
export function assignFlightBadges(
  offers: NonNullable<RavenTravelGuidePlan["transport"]["flightOffers"]>,
  locale: Locale,
): string[] {
  const en = locale === "en";
  const categories = en
    ? ["Best overall", "Lowest price", "Fastest route"]
    : ["综合推荐", "最低价格", "最快路线"];
  return offers.map((offer, index) => {
    const explicit = offer.cabinLabel?.match(
      /Best overall|Lowest price|Fastest route|综合推荐|最低价格|最快路线/i,
    )?.[0];
    return explicit || categories[index] || (en ? "Other option" : "其他选项");
  });
}

function flightTradeoff(
  offer: NonNullable<RavenTravelGuidePlan["transport"]["flightOffers"]>[number],
  recommended:
    | NonNullable<RavenTravelGuidePlan["transport"]["flightOffers"]>[number]
    | undefined,
  locale: Locale,
): string | undefined {
  if (!recommended || offer === recommended) return undefined;
  const en = locale === "en";
  const offerStops = stopCount(offer.outbound.stopsLabel);
  const recStops = stopCount(recommended.outbound.stopsLabel);
  if (offerStops > recStops) {
    return en ? "More stops than the recommended route." : "经停多于推荐航线。";
  }
  if (offer.pricePerAdult > recommended.pricePerAdult * 1.15) {
    return en
      ? "Higher fare than the recommended route."
      : "票价高于推荐航线。";
  }
  if (offer.pricePerAdult < recommended.pricePerAdult) {
    return en
      ? "Lower fare may mean a longer or less convenient route."
      : "更低票价可能意味着更绕或更不便。";
  }
  return undefined;
}

function detectScheduleConflicts(
  days: PlannerTimelineDay[],
  favoriteArtists: string[],
  locale: Locale,
): string[] {
  if (!favoriteArtists.length) return [];
  const favorites = new Set(
    favoriteArtists.map((name) => name.trim().toLowerCase()),
  );
  const conflicts: string[] = [];

  for (const day of days) {
    const prioritySets = day.sets.filter((set) =>
      favorites.has(set.artist.trim().toLowerCase()),
    );
    for (let i = 0; i < prioritySets.length; i += 1) {
      for (let j = i + 1; j < prioritySets.length; j += 1) {
        const left = prioritySets[i]!;
        const right = prioritySets[j]!;
        if (left.time === right.time) {
          conflicts.push(
            locale === "zh"
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
  const en = locale === "en";
  const stayBadges = en
    ? (["Best Overall", "Best Value", "Best for Groups"] as const)
    : (["综合优选", "性价比", "适合同行"] as const);

  const travelers = remote?.headcount ?? travelersFallback;
  const tripNights = remote?.accommodationNights ?? 0;
  const origin = remote?.departure?.trim() || "—";
  const displayDestination = englishSystemPlace(destination, locale);

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
          note: conciseHotelDetail(
            localizeMoneyText(
              localizeHotelCopy(scheme.note, locale) || scheme.note,
              locale,
            ),
          ),
          reason: conciseText(
            localizeMoneyText(localizeHotelCopy(scheme.reason, locale), locale),
            130,
          ),
          bookingHint: localizeMoneyText(
            localizeHotelCopy(scheme.bookingHint, locale),
            locale,
          ),
          source: detectPriceSource(scheme.note),
        }))
      : hotels.slice(0, 3).map((hotel, index) => ({
          badge: stayBadges[index] || stayBadges[0],
          name: hotel.name,
          note: conciseHotelDetail(
            localizeMoneyText(
              localizeHotelCopy(hotel.note, locale) || hotel.note,
              locale,
            ),
          ),
          reason: conciseText(
            localizeMoneyText(localizeHotelCopy(hotel.reason, locale), locale),
            130,
          ),
          bookingHint: localizeMoneyText(
            localizeHotelCopy(hotel.bookingHint, locale),
            locale,
          ),
          source: detectPriceSource(hotel.note),
        }));

  const flightOffers = remote?.transport.flightOffers ?? [];
  const flightBadges = assignFlightBadges(flightOffers, locale);
  const recommendedOffer = flightOffers[0];
  const transportLinesSafe = englishSafeLines(remote?.transport.lines, locale);
  const primaryRouteFromPlan = transportLinesSafe[0]
    ? conciseFlightRoute(transportLinesSafe[0], locale)
    : "";
  const localFlightSafe =
    englishSafeText(local.travel.flight, locale) ||
    (en
      ? displayDestination
        ? `Flights toward ${displayDestination.split(",")[0]!.trim()}`
        : `Flights for ${festivalName}`
      : "");
  const flightOptions: RavenJourneyFlightOption[] =
    flightOffers.length > 0
      ? flightOffers.slice(0, 3).map((offer, index) => ({
          badge: flightBadges[index] || (en ? "Alternative" : "备选"),
          route: conciseFlightRoute(
            index === 0 && primaryRouteFromPlan
              ? primaryRouteFromPlan
              : englishSafeText(
                  offer.outbound.route,
                  locale,
                  `${offer.outbound.depAirport ?? ""}→${offer.outbound.arrAirport ?? ""}`.replace(
                    /^→|→$/g,
                    "",
                  ) || (en ? "Flight route" : "航线"),
                ),
            locale,
          ),
          detail: conciseText(
            englishSafeText(flightOfferDetail(offer, locale), locale),
            110,
          ),
          price:
            formatMoney(offer.pricePerAdult, offer.currency, locale) +
            (en ? " / person" : "/人"),
          cabin: localizeFlightLabel(offer.cabinLabel, locale),
          source: "live" as const,
          tradeoff: flightTradeoff(offer, recommendedOffer, locale),
          recommendationReason: offer.recommendationReason,
        }))
      : transportLinesSafe.length
        ? [
            {
              badge: en ? "Recommended" : "推荐",
              route: conciseFlightRoute(transportLinesSafe[0], locale),
              detail: conciseText(
                transportLinesSafe.slice(1, 3).join(" · "),
                110,
              ),
              source: "estimated" as const,
            },
          ]
        : localFlightSafe
          ? [
              {
                badge: en ? "Recommended" : "推荐",
                route: conciseFlightRoute(localFlightSafe, locale),
                detail: "",
                source: "estimated" as const,
              },
            ]
          : [];

  const primaryFlightOption = flightOptions[0];
  const systemOrigin = englishSystemPlace(
    origin,
    locale,
    flightOffers[0]?.outbound.depAirport,
  );
  const systemDestination = englishSystemPlace(
    destination,
    locale,
    flightOffers[0]?.outbound.arrAirport,
  );
  const flightRecommendation =
    primaryFlightOption?.route ||
    transportLinesSafe[0] ||
    localFlightSafe ||
    (en ? "Route still assembling" : "航线组装中");
  const flightReasons = primaryFlightOption?.recommendationReason
    ? [primaryFlightOption.recommendationReason]
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
          source: "estimated" as const,
          share: item.share,
        }));

  const usedRemoteBudget = budgetItemsRaw.length > 0;
  const totalRow = [...budgetItems]
    .reverse()
    .find((item) => isBudgetTotalLabel(item.label));
  // Never mix a local fallback total with remote line items — omit until a real total exists.
  const budgetTotal = totalRow?.amount
    ? totalRow.amount
    : usedRemoteBudget
      ? ""
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

  const mustSee =
    favoriteArtists[0] || dailyFlow[0]?.sets.find((s) => s.highlight)?.artist;

  const timeline: RavenJourneyTimelineDay[] = remote?.itinerary?.days?.length
    ? remote.itinerary.days.map((day, index) => {
        const city =
          (destination || remote?.venue || festivalName)
            .split(",")[0]
            ?.trim() || "";
        const last = index === remote.itinerary!.days.length - 1;
        const feeling =
          index === 0
            ? en
              ? city
                ? `Arrive in ${city} with enough calm to settle before the first night.`
                : "Arrive with enough calm to settle before the first night."
              : city
                ? `抵达 ${city}，先安顿，再迎第一夜。`
                : "留出余裕抵达，先安顿再迎第一夜。"
            : last
              ? en
                ? city
                  ? `Close the weekend gently — one last night around ${city}.`
                  : "Close the weekend gently — leave room for the last night."
                : city
                  ? `温柔收束这个周末 — 在 ${city} 留下最后一夜。`
                  : "温柔收束这个周末，给最后一夜留白。"
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
        title: en ? "Network" : "网络",
        items: remote.essentials.network,
      });
    }
    if (remote.essentials.payment.length) {
      essentials.push({
        title: en ? "Payment" : "支付",
        items: remote.essentials.payment,
      });
    }
    if (remote.essentials.apps.length) {
      essentials.push({
        title: en ? "Apps" : "应用",
        items: remote.essentials.apps,
      });
    }
  }
  if (remote?.documents?.items.length) {
    essentials.push({
      title: remote.documents.title || (en ? "Documents" : "证件"),
      items: remote.documents.items,
    });
  }
  if (remote?.tickets?.channels.length) {
    essentials.push({
      title: remote.tickets.title || (en ? "Tickets" : "门票"),
      items: remote.tickets.channels.map((ch) => `${ch.name} — ${ch.note}`),
    });
  }

  const insights = tipItems
    .slice(1, 5)
    .filter(
      (tip) =>
        tip.length > 24 &&
        !/book early|stay hydrated|have fun|早点订|多喝水|玩得开心/i.test(tip),
    )
    .slice(0, 4);

  const primaryStay = stayOptionsSource[0];
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

  const areaHeadline = conciseStayHeadline(
    local.travel.stay,
    destination,
    locale,
  );

  const glanceFlight = {
    headline:
      primaryFlightOption?.route ||
      (en ? "Getting there is still assembling" : "抵达方式组装中"),
    detail: primaryFlightOption?.price || primaryFlightOption?.detail || "",
    reason: flightReasons[0],
  };
  const glanceStay = {
    headline:
      primaryStay?.name ||
      local.travel.stay ||
      (en ? "Stay still assembling" : "住宿组装中"),
    detail: primaryStay?.note || "",
    reason: primaryStay?.reason,
  };
  const glanceFestival = {
    headline:
      favoriteArtists.length > 0
        ? en
          ? `${favoriteArtists.length} artists locked in`
          : `${favoriteArtists.length} 位已锁定艺人`
        : en
          ? "Your festival nights"
          : "你的电音节之夜",
    detail: mustSee
      ? en
        ? `Anchor night around ${mustSee}`
        : `以 ${mustSee} 作为高光锚点`
      : tipItems[1] || "",
  };
  const glanceBudget = {
    headline: budgetTotal,
    detail: budgetItems[0]
      ? `${budgetItems[0].label} ${budgetItems[0].amount}`
      : "",
    source: (budgetItems.some((item) => item.source === "live")
      ? "live"
      : budgetItems.some((item) => item.source === "unavailable")
        ? "unavailable"
        : "estimated") as PriceSource,
  };

  const breath = [
    glanceStay.reason || glanceStay.headline
      ? en
        ? glanceStay.reason
          ? `Wake near the festival rhythm — ${glanceStay.reason}`
          : `Wake near ${glanceStay.headline}`
        : glanceStay.reason
          ? `贴近电音节节奏醒来 — ${glanceStay.reason}`
          : `住在 ${glanceStay.headline}`
      : null,
    glanceFestival.detail ||
      (mustSee
        ? en
          ? `Hold the nights for ${mustSee}`
          : `把夜晚留给 ${mustSee}`
        : null),
    glanceFlight.headline &&
    glanceFlight.headline !==
      (en ? "Getting there is still assembling" : "抵达方式组装中")
      ? en
        ? `Get there via ${glanceFlight.headline}`
        : `经 ${glanceFlight.headline} 抵达`
      : null,
    budgetTotal
      ? en
        ? `Keep the trip around ${budgetTotal}`
        : `这趟旅程大约 ${budgetTotal}`
      : null,
  ]
    .filter((line): line is string => Boolean(line?.trim()))
    .filter(
      (line) =>
        !/still assembling|组装中|Stay still|Route still|unavailable|暂不可用/i.test(
          line,
        ),
    )
    .slice(0, 3);

  return {
    festivalName: remote?.activityName || festivalName,
    // Prefer page/city destination over venue name (e.g. "Antwerp, Belgium" vs "De Schorre").
    destination:
      systemDestination || englishSystemPlace(remote?.venue || "", locale),
    festivalDates: remote?.eventDates || festivalDates,
    tripNights,
    travelers,
    origin: systemOrigin,
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
        hasTimedSchedule && dailyFlow.some((day) => day.sets.length > 0)
          ? "available"
          : "unavailable",
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
      recommendation: flightRecommendation,
      reasons: flightReasons,
      options: flightOptions,
    },
    timeline,
    budget: {
      total: budgetTotal,
      items: budgetItems,
      insight: tipItems.find((tip) =>
        /budget|share|room|预算|合住|人均/i.test(tip),
      ),
      confidence: glanceBudget.source,
    },
    essentials,
    insights,
  };
}

export function journeyLooksChinese(view: RavenJourneyView): boolean {
  return looksLikeChineseCopy(
    [
      view.summary,
      view.glance.flight.headline,
      view.glance.stay.headline,
      ...view.insights,
    ].join(" "),
  );
}
