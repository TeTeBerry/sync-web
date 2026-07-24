import { describe, expect, it } from "vitest";
import type { ActivitySchedule, SchedulePerformance } from "./api";
import {
  hasLineupTimetable,
  normalizeActivitySchedule,
} from "./lineup-timetable";

function performance(
  partial: Partial<SchedulePerformance> &
    Pick<SchedulePerformance, "artistId" | "artistName">,
): SchedulePerformance {
  return {
    dateKey: "day1",
    dateLabel: "Day 1",
    genre: "Techno",
    genreLabel: "Techno",
    stage: "main",
    stageLabel: "Main Stage",
    startTime: "",
    endTime: "",
    startMinutes: -1,
    endMinutes: -1,
    popularity: 80,
    avatarSeed: partial.artistId,
    genreColor: "#fff",
    ...partial,
  };
}

describe("normalizeActivitySchedule", () => {
  it("clears performances when the official timetable is unpublished", () => {
    const schedule: ActivitySchedule = {
      activityLegacyId: 17,
      schedulePublished: false,
      djs: [{ id: "a", name: "Artist A" }],
      performances: [
        performance({
          artistId: "a",
          artistName: "Artist A",
          startTime: "16:00",
          startMinutes: 960,
        }),
      ],
    };

    const normalized = normalizeActivitySchedule(schedule);
    expect(normalized.schedulePublished).toBe(false);
    expect(normalized.performances).toEqual([]);
    expect(normalized.djs).toHaveLength(1);
    expect(hasLineupTimetable(normalized)).toBe(false);
  });

  it("treats published schedules without HH:mm as lineup-only", () => {
    const schedule: ActivitySchedule = {
      activityLegacyId: 11,
      schedulePublished: true,
      performances: [
        performance({
          artistId: "b",
          artistName: "Artist B",
          stage: "",
          stageLabel: "",
          startTime: "",
          startMinutes: -1,
        }),
      ],
    };

    const normalized = normalizeActivitySchedule(schedule);
    expect(normalized.schedulePublished).toBe(false);
    expect(normalized.performances).toEqual([]);
    expect(hasLineupTimetable(normalized)).toBe(false);
  });

  it("keeps official timed slots when the timetable is live", () => {
    const timed = performance({
      artistId: "c",
      artistName: "Artist C",
      startTime: "22:00",
      endTime: "23:00",
      startMinutes: 1320,
      endMinutes: 1380,
    });
    const schedule: ActivitySchedule = {
      activityLegacyId: 7,
      schedulePublished: true,
      performances: [timed],
    };

    const normalized = normalizeActivitySchedule(schedule);
    expect(normalized.schedulePublished).toBe(true);
    expect(normalized.performances).toEqual([timed]);
    expect(hasLineupTimetable(normalized)).toBe(true);
  });
});
