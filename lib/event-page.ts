import { notFound, permanentRedirect } from "next/navigation";
import {
  fetchActivitySchedule,
  getActivity,
  getActivityTitle,
  type ScheduleDj,
  type SchedulePerformance,
} from "./api";
import { buildEventAiSummary } from "./event-ai-summary";
import { buildEventTravelData } from "./event-travel";
import {
  buildLineupTimetable,
  countTimetableStats,
  hasLineupTimetable,
} from "./lineup-timetable";
import { groupByBroadGenre, otherGenreLabel } from "./lineup-genre";
import { buildFeaturedArtists, buildStageLabels } from "./lineup-preview";
import { getActivityContinent } from "./activity-continent";
import { eventPath, eventSlugMatches, parseEventLegacyId } from "./event-slug";
import { getContinentLabel, localizeActivity, type Locale } from "./i18n";
import type { Activity } from "./types";

export type EventPageData = {
  activity: Activity;
  eventTitle: string;
  continentLabel: string | undefined;
  djs: ScheduleDj[];
  lineupFetchFailed: boolean;
  showTimetable: boolean;
  timetableDays: ReturnType<typeof buildLineupTimetable>;
  timetableStats: ReturnType<typeof countTimetableStats> | null;
  genreGroupData: {
    genreLabel: string;
    color: string;
    djs: ScheduleDj[];
  }[];
  aiSummary: ReturnType<typeof buildEventAiSummary>;
  travelData: ReturnType<typeof buildEventTravelData>;
  featuredArtists: ReturnType<typeof buildFeaturedArtists>;
  stageLabels: string[];
  schedulePublished: boolean;
  performances: SchedulePerformance[];
};

export async function loadEventPageData(
  locale: Locale,
  slug: string,
  options?: { weekend?: "w1" | "w2" },
): Promise<EventPageData | "error" | "not_found"> {
  const legacyId = parseEventLegacyId(slug);
  if (!legacyId) notFound();

  const activityResult = await getActivity(legacyId);
  if (activityResult.status === "error") return "error";
  if (activityResult.status === "not_found" || !activityResult.activity)
    return "not_found";

  const rawActivity = activityResult.activity;
  const activity = localizeActivity(rawActivity, locale);

  if (!eventSlugMatches(slug, rawActivity, locale)) {
    permanentRedirect(eventPath(locale, activity));
  }

  const scheduleResult = await fetchActivitySchedule(
    activity.legacyId,
    options,
  );
  const schedule = scheduleResult.schedule;
  const djs = schedule?.djs ?? [];
  const schedulePublished = schedule?.schedulePublished ?? false;
  const stageOptions = { stagesPublished: schedulePublished };
  const showTimetable = hasLineupTimetable(schedule);
  const timetableDays =
    showTimetable && schedule ? buildLineupTimetable(schedule, locale) : [];
  const timetableStats = timetableDays.length
    ? countTimetableStats(timetableDays)
    : null;
  const genreGroups = groupByBroadGenre(djs, locale);
  const genreKeys = [...genreGroups.keys()].sort((a, b) => {
    const otherLabel = otherGenreLabel(locale);
    if (a === otherLabel) return 1;
    if (b === otherLabel) return -1;
    return (
      (genreGroups.get(b)?.djs.length ?? 0) -
      (genreGroups.get(a)?.djs.length ?? 0)
    );
  });

  const travelData = buildEventTravelData(activity, locale);
  const aiSummary = buildEventAiSummary(activity, djs, locale, {
    nearestAirport: travelData.flights.items.nearestAirport,
    arrivalWindow: travelData.flights.items.arrivalWindow,
    bestArea: travelData.stay.items.bestAreas[0],
    stayInsight: travelData.stay.insight,
    shuttle: travelData.transport.items.shuttle,
    stagesPublished: schedulePublished,
  });
  const reasonByName = new Map(
    aiSummary.mustSee.map((artist) => [
      artist.name.toLowerCase(),
      artist.reason,
    ]),
  );

  return {
    activity,
    eventTitle: getActivityTitle(activity),
    continentLabel: getContinentLabel(locale, getActivityContinent(activity)),
    djs,
    lineupFetchFailed: scheduleResult.status === "error",
    showTimetable,
    timetableDays,
    timetableStats,
    genreGroupData: genreKeys.map((genreLabel) => {
      const group = genreGroups.get(genreLabel)!;
      return { genreLabel, color: group.color, djs: group.djs };
    }),
    aiSummary,
    travelData,
    featuredArtists: buildFeaturedArtists(djs, locale, {
      ...stageOptions,
      limit: 4,
    }).map((artist) => ({
      ...artist,
      reason: reasonByName.get(artist.name.toLowerCase()),
    })),
    stageLabels: buildStageLabels(djs, locale, stageOptions),
    schedulePublished,
    performances: schedule?.performances ?? [],
  };
}
