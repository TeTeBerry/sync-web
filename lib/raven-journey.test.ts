import { describe, expect, it } from "vitest";
import type { RavenTravelGuidePlan } from "./api";
import type { PlannerPlan } from "./planner-plan";
import {
  assignFlightBadges,
  buildRavenJourneyView,
  detectPriceSource,
  isBudgetTotalLabel,
} from "./raven-journey";

const localPlan: PlannerPlan = {
  vibe: "Local vibe",
  experiences: ["Sunset mainstage moments", "Late-night discoveries"],
  artistTimeline: {
    days: [
      {
        label: "Day 1",
        sets: [
          {
            time: "22:00",
            artist: "Amelie Lens",
            stage: "Main",
            highlight: true,
          },
          {
            time: "22:00",
            artist: "Charlotte de Witte",
            stage: "Cage",
            highlight: true,
          },
        ],
      },
    ],
  },
  travel: {
    stay: "Walking distance to Boom festival grounds",
    flight: "Balanced flights from London",
    transport: "Venue shuttles",
  },
  budget: {
    total: "$3,200",
    items: [{ label: "Accommodation", amount: "$1,344", share: 42 }],
  },
};

function makeRemote(
  overrides: Partial<RavenTravelGuidePlan> = {},
): RavenTravelGuidePlan {
  return {
    activityName: "Tomorrowland Belgium",
    venue: "De Schorre",
    eventDates: "07/17-19",
    departure: "London",
    headcount: 2,
    budgetLabel: "Comfort",
    accommodationNights: 3,
    selfDrive: false,
    transport: {
      title: "Flights",
      lines: ["LHR to BRU", "Arrive one day early for calmer transfer"],
      flightOffers: [
        {
          pricePerAdult: 220,
          currency: "USD",
          outbound: {
            route: "LHR-BRU",
            stopsLabel: "Direct",
            depTime: "09:00",
            arrTime: "11:20",
          },
        },
        {
          pricePerAdult: 160,
          currency: "USD",
          outbound: {
            route: "LHR-AMS-BRU",
            stopsLabel: "1 stop",
            depTime: "06:00",
            arrTime: "12:40",
          },
        },
      ],
    },
    accommodation: {
      title: "Stay",
      hotels: [],
      schemes: [
        {
          label: "Best Overall",
          name: "Hotel Docklands",
          note: "Live from RollingGo · near venue",
          reason: "Short late-night return",
        },
      ],
    },
    nightlife: {
      title: "Night",
      spots: [
        {
          name: "Afters bar",
          note: "Worth arriving early",
          reason: "Fits your taste",
        },
      ],
    },
    tips: {
      title: "Tips",
      items: [
        "Arrive through Brussels, stay near Boom, and keep the shared budget balanced.",
        "Sharing a room with one other traveler reduces the estimated stay cost by €310 per person.",
        "Book early",
      ],
    },
    essentials: {
      title: "Essentials",
      network: ["eSIM"],
      payment: ["Card"],
      apps: ["Maps"],
    },
    itinerary: {
      title: "Itinerary",
      days: [
        { label: "Arrival Day", lines: ["Land in BRU", "Transfer to hotel"] },
      ],
    },
    ...overrides,
  };
}

describe("isBudgetTotalLabel", () => {
  it("matches trip totals and rejects ordinary line items", () => {
    expect(isBudgetTotalLabel("Estimated total (group)")).toBe(true);
    expect(isBudgetTotalLabel("合计参考（全员）")).toBe(true);
    expect(isBudgetTotalLabel("Accommodation")).toBe(false);
    expect(isBudgetTotalLabel("Food & extras")).toBe(false);
  });
});

describe("detectPriceSource", () => {
  it("labels live, unavailable, and estimated notes", () => {
    expect(detectPriceSource("Live from RollingGo")).toBe("live");
    expect(
      detectPriceSource(
        "Based on recommended hotel reference · 2 room(s) · 4 nights.",
      ),
    ).toBe("live");
    expect(
      detectPriceSource("Based on verified ticket-channel reference price."),
    ).toBe("live");
    expect(detectPriceSource("Live price unavailable")).toBe("unavailable");
    expect(detectPriceSource("About ¥2,000")).toBe("estimated");
  });
});

describe("assignFlightBadges", () => {
  it("exposes the scored recommendation categories", () => {
    const offers = makeRemote().transport.flightOffers!;
    const badges = assignFlightBadges(offers, "en");
    expect(badges).toEqual(["Best overall", "Lowest price"]);
  });
});

describe("buildRavenJourneyView", () => {
  it("attaches feeling lines to timeline days", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: ["Amelie Lens"],
    });
    expect(view.timeline[0]?.feeling).toBeTruthy();
  });

  it("builds an editorial breath instead of only glance cards", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: ["Amelie Lens"],
    });
    expect(view.breath.length).toBeGreaterThan(0);
    expect(view.breath.length).toBeLessThanOrEqual(3);
    expect(
      view.breath.some((line) =>
        /Wake|Hold|Get there|Amelie|festival|Keep the trip/i.test(line),
      ),
    ).toBe(true);
    expect(view.budget.confidence).toBeTruthy();
  });

  it("uses a confident budget total amount rather than a section title", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        budget: {
          title: "Budget reference",
          items: [
            { label: "Accommodation", range: "About $800–1,200" },
            { label: "Estimated total (group)", range: "About $3,200" },
          ],
        },
      }),
      local: localPlan,
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: ["Amelie Lens"],
    });
    expect(view.budget.total).toMatch(/\$/);
    expect(view.budget.total).not.toMatch(/Budget reference/i);
  });

  it("does not mix a local total with remote budget line items", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        budget: {
          title: "Budget reference",
          items: [{ label: "Accommodation", range: "About $800–1,200" }],
        },
      }),
      local: localPlan,
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: ["Amelie Lens"],
    });
    expect(view.budget.total).toBe("");
    expect(view.budget.items[0]?.amount).toMatch(/\$800/);
  });

  it("does not reuse hotel note as the stay area headline", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        accommodation: {
          title: "Stay",
          hotels: [],
          schemes: [
            {
              label: "Best Overall",
              name: "Hotel Docklands",
              note: "Live from RollingGo · near venue",
              reason: "Short late-night return",
            },
          ],
        },
      }),
      local: { ...localPlan, travel: { ...localPlan.travel, stay: "" } },
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: [],
    });
    expect(view.stayStrategy.areaHeadline).not.toContain("Live from RollingGo");
    expect(view.stayStrategy.options[0]?.note).toContain("Live from RollingGo");
  });

  it("prefers page destination over venue name", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: ["Amelie Lens"],
    });
    expect(view.destination).toBe("Boom, Belgium");
  });

  it("does not invent set times from itinerary when scheduleDays are absent", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: ["Amelie Lens"],
      hasTimedSchedule: true,
      scheduleDays: [],
    });
    expect(view.festivalExperience.setTimesStatus).toBe("unavailable");
    expect(view.festivalExperience.dailyFlow).toEqual([]);
    expect(view.timeline[0]?.label).toBe("Arrival Day");
  });

  it("uses performance scheduleDays for daily flow and conflicts", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: ["Amelie Lens", "Charlotte de Witte"],
      hasTimedSchedule: true,
      scheduleDays: localPlan.artistTimeline.days,
    });
    expect(view.festivalExperience.setTimesStatus).toBe("available");
    expect(view.festivalExperience.dailyFlow[0]?.sets[0]?.time).toBe("22:00");
    expect(view.festivalExperience.conflicts.length).toBeGreaterThan(0);
  });

  it("keeps stay strategy visible from area headline when hotels are empty", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        accommodation: { title: "Stay", hotels: [] },
      }),
      local: localPlan,
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: [],
    });
    expect(view.stayStrategy.areaHeadline).toContain("Boom");
    expect(view.stayStrategy.options).toEqual([]);
    expect(view.glance.stay.headline).toContain("Boom");
  });

  it("assigns grounded flight badges and tradeoffs", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: [],
    });
    expect(view.flightStrategy.options[0]?.badge).toBe("Best overall");
    expect(view.flightStrategy.options[1]?.badge).toBe("Lowest price");
    expect(view.flightStrategy.options[1]?.tradeoff).toMatch(
      /stops|fare|route/i,
    );
  });

  it("keeps Getting there English when remote transport lines are Chinese", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        transport: {
          title: "出行",
          lines: [
            "从「伦敦」前往安特卫普为国际出行，建议提前 1–2 天飞抵",
            "建议搭乘国际航班飞往布鲁塞尔；往返机票建议提前关注",
            "抵目的地机场后的接驳见下方会场接驳",
          ],
          flightOffers: [],
        },
      }),
      local: localPlan,
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: [],
    });
    expect(view.flightStrategy.recommendation).not.toMatch(/[\u4e00-\u9fff]/);
    expect(view.flightStrategy.reasons.join(" ")).not.toMatch(
      /[\u4e00-\u9fff]/,
    );
    expect(view.flightStrategy.options[0]?.route).not.toMatch(
      /[\u4e00-\u9fff]/,
    );
    expect(view.flightStrategy.options[0]?.route).toMatch(
      /Balanced flights|Boom|Tomorrowland/i,
    );
  });

  it("turns an international travel sentence into a complete English route", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        transport: {
          title: "Getting there",
          lines: [
            "Travel from 「Shanghai, China」 to 普吉 is international — arrive 1–2 days early for immigration, SIM pickup, and rest.",
            "Fly PVG → HKT; watch round-trip fares ahead.",
          ],
          flightOffers: [],
        },
      }),
      local: localPlan,
      locale: "en",
      festivalName: "EDC Thailand",
      destination: "普吉",
      festivalDates: "Dec 18–20",
      favoriteArtists: [],
    });

    expect(view.flightStrategy.options[0]?.route).toBe(
      "Shanghai, China → Phuket",
    );
    expect(view.flightStrategy.options[0]?.route).not.toContain("…");
  });

  it("localizes Chinese airport labels in an existing English plan", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        transport: {
          title: "Getting there",
          lines: ["Fly 上海浦东/虹桥国际机场（PVG/SHA） → 普吉国际机场（HKT）"],
          flightOffers: [],
        },
      }),
      local: localPlan,
      locale: "en",
      festivalName: "EDC Thailand",
      destination: "Phuket, Thailand",
      festivalDates: "Dec 18–20",
      favoriteArtists: [],
    });

    expect(view.flightStrategy.options[0]?.route).toBe(
      "Shanghai Pudong / Hongqiao International Airports (PVG/SHA) → Phuket International Airport (HKT)",
    );
  });

  it("keeps the full airport route beside a live fare", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        transport: {
          title: "Getting there",
          lines: [
            "Fly Shanghai Pudong / Hongqiao International Airports (PVG/SHA) → Phuket International Airport (HKT)",
          ],
          flightOffers: [
            {
              pricePerAdult: 2880,
              currency: "CNY",
              outbound: { route: "PVG→HKT", stopsLabel: "Direct" },
            },
          ],
        },
      }),
      local: localPlan,
      locale: "en",
      festivalName: "EDC Thailand",
      destination: "Phuket, Thailand",
      festivalDates: "Dec 18–20",
      favoriteArtists: [],
    });

    expect(view.flightStrategy.options[0]?.route).toBe(
      "Shanghai Pudong / Hongqiao International Airports (PVG/SHA) → Phuket International Airport (HKT)",
    );
    expect(view.flightStrategy.options[0]?.price).toBe("About $400 / person");
  });

  it("removes duplicate flight lines and keeps an English recommendation reason", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote({
        transport: {
          title: "Getting there",
          lines: [
            "Travel from Singapore, Singapore to Incheon is international — arrive early.",
            "Fly 新加坡樟宜国际机场 (SIN) → Incheon International Airport (ICN)",
            "Bring passport, visa / K-ETA if needed, return flight, and hotel booking.",
          ],
          flightOffers: [
            {
              pricePerAdult: 353,
              currency: "USD",
              outbound: {
                route: "SIN→ICN",
                stopsLabel: "Direct",
                depTime: "00:50",
                arrTime: "08:40",
              },
              return: {
                route: "ICN→SIN",
                depTime: "18:10",
                arrTime: "23:40",
                stopsLabel: "Direct",
              },
              recommendationReason: "Direct · Good arrival window",
            },
          ],
        },
      }),
      local: localPlan,
      locale: "en",
      festivalName: "EDC Korea",
      destination: "Incheon, South Korea",
      festivalDates: "Oct 17–18",
      favoriteArtists: [],
    });

    expect(view.flightStrategy.reasons[0]).toBe("Direct · Good arrival window");
    expect(view.flightStrategy.reasons.join(" ")).not.toMatch(
      /passport|visa|K-ETA|hotel booking/i,
    );
    expect(view.flightStrategy.reasons.join(" ")).not.toMatch(
      /[\u4e00-\u9fff]/,
    );
  });

  it("uses travelersFallback when remote headcount is missing", () => {
    const view = buildRavenJourneyView({
      remote: { ...makeRemote(), headcount: undefined as unknown as number },
      local: localPlan,
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: [],
      travelersFallback: 4,
    });
    expect(view.travelers).toBe(4);
  });

  it("keeps essentials group titles aligned with source fields", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: [],
    });
    expect(view.essentials.map((group) => group.title)).toEqual([
      "Network",
      "Payment",
      "Apps",
    ]);
  });

  it("filters generic tips from Raven Insights", () => {
    const view = buildRavenJourneyView({
      remote: makeRemote(),
      local: localPlan,
      locale: "en",
      festivalName: "Tomorrowland Belgium",
      destination: "Boom, Belgium",
      festivalDates: "Jul 17–19",
      favoriteArtists: [],
    });
    expect(view.insights.some((tip) => /book early/i.test(tip))).toBe(false);
    expect(view.insights[0]).toMatch(/Sharing a room/i);
  });
});
