'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ScheduleDj, SchedulePerformance } from '../../lib/api';
import { ensureAuthCsrf } from '../../lib/auth/client';
import type { Locale } from '../../lib/i18n';
import { buildLineupArtistNameResolver } from '../../lib/lineup-artist-name';
import {
  normalizeSavedLineupSchedule,
  readLocalSavedLineupSchedule,
  type SavedLineupSchedule,
  writeLocalSavedLineupSchedule,
} from '../../lib/lineup-schedule-persistence';
import { normalizeSelectedSchedule } from '../../lib/lineup-schedule-export';
import { TOMORROWLAND_BELGIUM_ACTIVITY_LEGACY_ID } from '../../lib/lineup-selection';
import { useAuthSession } from '../../hooks/useAuthSession';
import { useLineupSelection } from './LineupSelectionContext';

type SaveState = 'idle' | 'saving' | 'saved-local' | 'saved-cloud' | 'error';
type SchedulePersistenceValue = {
  saved: SavedLineupSchedule | null;
  state: SaveState;
  needsSignIn: boolean;
  save: () => Promise<void>;
};

const SchedulePersistenceContext = createContext<SchedulePersistenceValue | null>(null);

export function LineupSchedulePersistenceProvider({
  activityLegacyId,
  selectionScope,
  children,
}: {
  activityLegacyId: number;
  selectionScope?: string;
  children: ReactNode;
}) {
  const auth = useAuthSession();
  const { hydrated, ids, clashState, restoreSavedRoute } = useLineupSelection();
  const [saved, setSaved] = useState<SavedLineupSchedule | null>(null);
  const [state, setState] = useState<SaveState>('idle');
  const restored = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    const local = readLocalSavedLineupSchedule(activityLegacyId, selectionScope);
    if (!local) return;
    setSaved(local);
    if (!restored.current) {
      restoreSavedRoute(local);
      restored.current = true;
    }
  }, [activityLegacyId, hydrated, restoreSavedRoute, selectionScope]);

  useEffect(() => {
    if (!hydrated || auth.loading || !auth.signedIn) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(
          `/api/lineup-schedule/${activityLegacyId}${selectionScope ? `?scope=${encodeURIComponent(selectionScope)}` : ''}`,
          { credentials: 'same-origin', cache: 'no-store' },
        );
        if (!response.ok) return;
        const payload = await response.json() as { schedule?: unknown };
        const cloud = normalizeSavedLineupSchedule(payload.schedule, activityLegacyId, selectionScope);
        if (!cloud || cancelled) return;
        writeLocalSavedLineupSchedule(cloud);
        setSaved(cloud);
        restoreSavedRoute(cloud);
        restored.current = true;
        setState('saved-cloud');
      } catch {
        // The local copy remains available when a connection is interrupted.
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [activityLegacyId, auth.loading, auth.signedIn, hydrated, restoreSavedRoute, selectionScope]);

  const save = useCallback(async () => {
    if (!hydrated || !ids.length) return;
    const next: SavedLineupSchedule = {
      activityLegacyId,
      selectionScope,
      selectedIds: ids,
      clashState,
      savedAt: new Date().toISOString(),
    };
    writeLocalSavedLineupSchedule(next);
    setSaved(next);
    if (!auth.signedIn) {
      setState('saved-local');
      return;
    }
    setState('saving');
    try {
      const csrf = await ensureAuthCsrf();
      const response = await fetch(`/api/lineup-schedule/${activityLegacyId}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error('Schedule save failed');
      setState('saved-cloud');
    } catch {
      setState('saved-local');
    }
  }, [activityLegacyId, auth.signedIn, clashState, hydrated, ids, selectionScope]);

  const value = useMemo(() => ({ saved, state, needsSignIn: !auth.signedIn, save }), [auth.signedIn, saved, save, state]);
  return <SchedulePersistenceContext.Provider value={value}>{children}</SchedulePersistenceContext.Provider>;
}

export function useLineupSchedulePersistence(): SchedulePersistenceValue {
  const context = useContext(SchedulePersistenceContext);
  if (!context) throw new Error('useLineupSchedulePersistence must be used within LineupSchedulePersistenceProvider');
  return context;
}

function displayDay(value: string, locale: Locale): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-GB', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).format(date);
}

export function LineupSavedSchedule({
  locale,
  djs,
  performances,
}: {
  locale: Locale;
  djs: ScheduleDj[];
  performances: SchedulePerformance[];
}) {
  const { saved, state } = useLineupSchedulePersistence();
  const { openConflictCenter, conflicts } = useLineupSelection();
  const resolveArtistName = useMemo(
    () => buildLineupArtistNameResolver(djs, performances, locale === 'zh' ? '艺人名字待补充' : 'Artist name pending'),
    [djs, locale, performances],
  );
  const schedule = useMemo(
    () => saved ? normalizeSelectedSchedule({
      selectedIds: saved.selectedIds,
      performances,
      conflicts,
      resolveArtistName,
      dropOffBill: saved.activityLegacyId === TOMORROWLAND_BELGIUM_ACTIVITY_LEGACY_ID,
    }) : [],
    [conflicts, performances, resolveArtistName, saved],
  );
  if (!saved) return null;
  const zh = locale === 'zh';
  const cloud = state === 'saved-cloud';
  const timed = schedule.filter((item) => item.startTime && item.festivalDay);
  const untimed = schedule.filter((item) => !item.startTime || !item.festivalDay);
  const days = [...new Set(timed.map((item) => item.festivalDay!))];
  return (
    <section className="lineup-saved-schedule" aria-label={zh ? '已保存的时间表' : 'Saved schedule'}>
      <div className="lineup-saved-schedule__body">
        <div>
          <p className="lineup-saved-schedule__eyebrow">{zh ? '你的已保存时间表' : 'YOUR SAVED SCHEDULE'}</p>
          <h2>{zh ? '今晚，就按这条路走。' : 'Your night, set in motion.'}</h2>
          <p>{zh ? (cloud ? '已保存到 Raven' : '已保存到此浏览器') : (cloud ? 'Saved to Raven' : 'Saved in this browser')}</p>
        </div>
        <button type="button" onClick={() => openConflictCenter()}>{zh ? '打开完整路线' : 'Open full route'}</button>
      </div>
      {timed.length ? (
        <div className="lineup-saved-schedule__days">
          {days.map((day) => (
            <section className="lineup-saved-schedule__day" key={day} aria-label={displayDay(day, locale)}>
              <h3>{displayDay(day, locale)}</h3>
              <ol>
                {timed.filter((item) => item.festivalDay === day).map((item) => (
                  <li key={`${item.artistId}-${item.startMinutes ?? item.startTime}`} className={item.conflictGroupId ? 'is-clash' : ''}>
                    <time>{item.startTime}{item.endTime ? `–${item.endTime}` : ''}</time>
                    <div>
                      <strong>{item.artistName}</strong>
                      <span>{item.stageName || (zh ? '舞台待公布' : 'Stage TBA')}</span>
                    </div>
                    {item.conflictGroupId ? <em>{zh ? '时间冲突' : 'Clash'}</em> : null}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : null}
      {untimed.length ? (
        <section className="lineup-saved-schedule__waiting">
          <h3>{zh ? '等待演出时间' : 'Waiting on set time'}</h3>
          <p>{untimed.map((item) => item.artistName).join(' · ')}</p>
        </section>
      ) : null}
    </section>
  );
}
