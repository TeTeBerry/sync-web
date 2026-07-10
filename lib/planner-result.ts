import type { RavenTravelGuidePlan } from './api';
import type { Locale } from './i18n';
import type { PlannerPlan, PlannerTimelineDay } from './planner-plan';

const CJK_CHAR_PATTERN = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/;

export function listJoin(locale: Locale, parts: string[]): string {
  return parts.filter(Boolean).join(locale === 'zh' ? '；' : '; ');
}

export function looksLikeChineseCopy(text: string): boolean {
  const sample = text.trim();
  if (!sample) return false;
  const cjk = sample.match(new RegExp(CJK_CHAR_PATTERN.source, 'g'))?.length ?? 0;
  return cjk / sample.length >= 0.12;
}

export function remotePlanLooksChinese(plan: RavenTravelGuidePlan): boolean {
  // Titles + tips only — hotel / nightlife proper nouns often stay Chinese on EN plans.
  const sample = [
    plan.budgetLabel,
    plan.transport.title,
    plan.accommodation.title,
    plan.nightlife.title,
    plan.tips.title,
    ...plan.tips.items,
    plan.budget?.title,
    plan.parking?.title,
    plan.venueTransport?.title,
  ]
    .filter(Boolean)
    .join(' ');

  return looksLikeChineseCopy(sample);
}

function mapRemoteTimeline(plan: RavenTravelGuidePlan): PlannerTimelineDay[] {
  return (
    plan.itinerary?.days
      .map((day) => {
        const sets = day.lines
          .map((line, index) => {
            const text = line.trim();
            if (!text) return null;

            const matched = text.match(/^(\d{1,2}:\d{2})\s*[-–:：]?\s*(.+)$/);
            if (matched) {
              const [, time, detail] = matched;
              return {
                time,
                artist: detail.trim(),
                stage: plan.itinerary?.title || day.label,
              };
            }

            return {
              time: `${index + 1}`.padStart(2, '0'),
              artist: text,
              stage: plan.itinerary?.title || day.label,
            };
          })
          .filter((set): set is PlannerTimelineDay['sets'][number] => Boolean(set));

        if (!sets.length) return null;
        return {
          label: day.label,
          sets,
        };
      })
      .filter((day): day is PlannerTimelineDay => Boolean(day)) ?? []
  );
}

function estimateBudgetAmount(value: string): number | null {
  const amounts = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!amounts.length) return null;
  return amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
}

export function mapRemotePlan(
  plan: RavenTravelGuidePlan,
  fallbackTimeline: PlannerPlan['artistTimeline'],
  locale: Locale,
): PlannerPlan {
  const hotels = plan.accommodation.hotels.map((hotel) =>
    `${hotel.name}${hotel.note ? ` — ${hotel.note}` : ''}`,
  );
  const venueTransport = plan.venueTransport?.options.flatMap((option) => option.lines) ?? [];
  const budgetItems = plan.budget?.items ?? [];
  const budgetAmounts = budgetItems.map((item) => estimateBudgetAmount(item.range));
  const budgetTotal = budgetAmounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
  const remoteTimeline = mapRemoteTimeline(plan);

  return {
    vibe: [plan.activityName, plan.eventDates, plan.venue].filter(Boolean).join(' · '),
    experiences: plan.tips.items.length
      ? plan.tips.items
      : plan.nightlife.spots.map((spot) => spot.name),
    artistTimeline: remoteTimeline.length ? { days: remoteTimeline } : fallbackTimeline,
    travel: {
      stay: listJoin(locale, hotels) || plan.accommodation.title,
      flight: listJoin(locale, plan.transport.lines) || plan.transport.title,
      transport:
        listJoin(locale, venueTransport) ||
        listJoin(locale, plan.parking?.lines ?? []) ||
        plan.venueTransport?.title ||
        '',
    },
    budget: {
      total: plan.budget?.title || plan.budgetLabel,
      items: budgetItems.map((item, index) => ({
        label: item.label,
        amount: item.range,
        share:
          budgetTotal > 0 && budgetAmounts[index] != null
            ? Math.round(((budgetAmounts[index] ?? 0) / budgetTotal) * 100)
            : undefined,
      })),
    },
  };
}

export type ResolveResultPlanOptions = {
  /**
   * Shared / deep-linked plans must keep remote content even when locale is en,
   * so guideId links do not silently replace the saved journey.
   */
  preferRemote?: boolean;
};

export type ResolvedPlannerResult = {
  plan: PlannerPlan;
  showLanguageCaveat: boolean;
};

/**
 * Decide which plan body to show on the result page.
 * Prefer remote when present (real orchestration). For non-zh locales, surface a
 * language caveat only when the remote body still looks Chinese (legacy shared plans).
 */
export function resolveResultPlan(
  remote: RavenTravelGuidePlan | null | undefined,
  local: PlannerPlan,
  locale: Locale,
  options: ResolveResultPlanOptions = {},
): ResolvedPlannerResult {
  if (!remote) {
    return { plan: local, showLanguageCaveat: false };
  }

  if (locale === 'zh' || options.preferRemote !== false) {
    return {
      plan: mapRemotePlan(remote, local.artistTimeline, locale),
      showLanguageCaveat: locale !== 'zh' && remotePlanLooksChinese(remote),
    };
  }

  return { plan: local, showLanguageCaveat: false };
}

/**
 * Shared-plan seeding should run once so preference edits do not force phase back to result.
 */
export function shouldSeedSharedPlan(args: {
  hasInitialRemote: boolean;
  alreadySeeded: boolean;
  hasUserGenerated: boolean;
}): boolean {
  return args.hasInitialRemote && !args.alreadySeeded && !args.hasUserGenerated;
}
