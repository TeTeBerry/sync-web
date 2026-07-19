'use client';

import { useEffect, useRef, useState } from 'react';
import type { ActivitySchedule } from '../../lib/api';
import type { Locale } from '../../lib/i18n';
import { buildLineupTimetable, type LineupTimetableDay } from '../../lib/lineup-timetable';

type ProfileTimetableProps = {
  locale: Locale;
  activityLegacyId: number;
  selectedIds?: string[];
};

type ScheduleResponse = {
  schedule?: ActivitySchedule;
  data?: ActivitySchedule;
};

type SavedScheduleResponse = {
  schedule?: { selectedIds?: unknown };
};

function dayLabel(value: string, locale: Locale) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

async function loadSavedArtistIds(activityLegacyId: number, selectedIds: string[]): Promise<string[]> {
  const localIds = selectedIds.filter((id) => typeof id === 'string' && id.trim());
  const savedResponses = await Promise.all(['w1', 'w2', ''].map((scope) =>
    fetch(`/api/lineup-schedule/${activityLegacyId}${scope ? `?scope=${scope}` : ''}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    }),
  ));
  const savedPayloads = await Promise.all(
    savedResponses
      .filter((response) => response.ok)
      .map((response) => response.json() as Promise<SavedScheduleResponse>),
  );
  const cloudIds = savedPayloads.flatMap((payload) => (
    Array.isArray(payload.schedule?.selectedIds)
      ? payload.schedule.selectedIds.filter((id): id is string => typeof id === 'string')
      : []
  ));
  return [...new Set([...localIds, ...cloudIds])];
}

export function ProfileTimetable({ locale, activityLegacyId, selectedIds = [] }: ProfileTimetableProps) {
  const [expanded, setExpanded] = useState(selectedIds.length > 0);
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<LineupTimetableDay[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);
  const zh = locale === 'zh';
  const artistCount = selectedIds.length;

  useEffect(() => {
    if (selectedIds.length > 0) setExpanded(true);
  }, [selectedIds.length]);

  useEffect(() => {
    if (!expanded) return;
    const cacheKey = `${activityLegacyId}:${selectedIds.join(',')}`;
    if (loadedFor.current === cacheKey) return;
    loadedFor.current = cacheKey;

    let active = true;
    setLoading(true);
    setMessage(null);

    void (async () => {
      try {
        const responses = await Promise.all(['', '?weekend=w1', '?weekend=w2'].map((query) =>
          fetch(`/api/activities/${activityLegacyId}/itinerary/schedule${query}`, {
            credentials: 'same-origin',
            cache: 'no-store',
          }),
        ));
        const savedIds = await loadSavedArtistIds(activityLegacyId, selectedIds);
        if (!active) return;
        const payloads = await Promise.all(
          responses
            .filter((response) => response.ok)
            .map((response) => response.json() as Promise<ScheduleResponse>),
        );
        const schedules = payloads
          .map((payload) => payload.schedule ?? payload.data)
          .filter((value): value is ActivitySchedule => Boolean(value));
        const allPerformances = [...new Map(schedules.flatMap((value) => value.performances ?? []).map((performance) => [
          `${performance.artistId}-${performance.dateKey}-${performance.startMinutes}-${performance.stage}`,
          performance,
        ])).values()];
        const savedIdSet = new Set(savedIds);
        const performances = allPerformances.filter((performance) => (
          savedIdSet.has(`${performance.artistId}@${performance.startMinutes}`)
          || savedIdSet.has(performance.artistId)
        ));
        const timetable = schedules.length
          ? buildLineupTimetable({
            ...schedules[0],
            schedulePublished: schedules.some((value) => value.schedulePublished),
            sessions: [...new Map(schedules.flatMap((value) => value.sessions ?? []).map((session) => [session.dateKey, session])).values()],
            performances,
          }, locale)
          : [];
        setSchedule(timetable);
        if (!timetable.length) {
          setMessage(savedIds.length
            ? (zh ? '你保存的艺人暂时没有可用的演出时间。' : 'Your saved artists do not have published set times yet.')
            : (zh ? '还没有保存的艺人。' : 'You have not saved any artists for this event yet.'));
        }
      } catch {
        if (!active) return;
        loadedFor.current = null;
        setMessage(zh ? '暂时无法加载 timetable。' : 'The timetable is unavailable right now.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [activityLegacyId, expanded, locale, selectedIds, zh]);

  return (
    <div className="raven-profile__timetable">
      <button
        type="button"
        className="raven-profile__timetable-toggle"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {expanded
          ? (zh ? '收起 timetable' : 'Hide timetable')
          : artistCount
            ? (zh ? `查看 timetable · ${artistCount} 位艺人` : `View timetable · ${artistCount} artists`)
            : (zh ? '查看 timetable' : 'View timetable')}
      </button>
      {expanded ? (
        <section className="lineup-saved-schedule raven-profile__timetable-panel" aria-live="polite" aria-label={zh ? '已保存的时间表' : 'Saved schedule'}>
          {loading ? <p>{zh ? '正在找回你的夜晚…' : 'Gathering your night…'}</p> : null}
          {!loading && schedule?.length ? (
            <>
              <div className="lineup-saved-schedule__body">
                <div>
                  <p className="lineup-saved-schedule__eyebrow">{zh ? '你的已保存时间表' : 'YOUR SAVED SCHEDULE'}</p>
                  <h2>{zh ? '今晚，就按这条路走。' : 'Your night, set in motion.'}</h2>
                </div>
              </div>
              <div className="lineup-saved-schedule__days">
                {schedule.map((day) => (
                  <section key={day.dateKey} className="lineup-saved-schedule__day">
                    <h3>{dayLabel(day.dateKey, locale)}</h3>
                    <ol>
                      {day.stages.flatMap((stage) => stage.slots.map((slot) => (
                        <li key={`${slot.artistId}-${slot.startMinutes}`}>
                          <time>{slot.startTime}{slot.endTime ? `–${slot.endTime}` : ''}</time>
                          <div><strong>{slot.artistName}</strong><span>{stage.stageLabel}</span></div>
                        </li>
                      )))}
                    </ol>
                  </section>
                ))}
              </div>
            </>
          ) : null}
          {!loading && !schedule?.length && message ? <p>{message}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
