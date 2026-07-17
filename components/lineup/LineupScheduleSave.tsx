'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { openRavenAuthModal } from '../../lib/auth/modal';
import type { Locale } from '../../lib/i18n';
import {
  createScheduleIcs,
  downloadScheduleBlob,
  type FestivalScheduleExportMeta,
  type NormalizedScheduleItem,
} from '../../lib/lineup-schedule-export';
import { renderLineupScheduleWallpaper } from './renderLineupScheduleWallpaper';
import { useLineupSchedulePersistence } from './LineupSchedulePersistence';

type Status = { tone: 'ok' | 'error'; message: string } | null;

export function LineupScheduleSave({
  locale,
  meta,
  items,
  image,
}: {
  locale: Locale;
  meta: FestivalScheduleExportMeta;
  items: NormalizedScheduleItem[];
  image?: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [wallpaperBlob, setWallpaperBlob] = useState<Blob | null>(null);
  const [loadingWallpaper, setLoadingWallpaper] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const { save, state: saveState, needsSignIn } = useLineupSchedulePersistence();
  const pathname = usePathname();
  const timed = items.filter((item) => item.startTime && item.endTime && item.festivalDay);
  const untimed = items.filter((item) => !item.startTime || !item.endTime || !item.festivalDay);
  const days = [...new Set(timed.map((item) => item.festivalDay!))];
  const selectedDay = day ?? days[0] ?? meta.festivalDate ?? '';
  const zh = locale === 'zh';

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const pendingCopy = useMemo(() => {
    if (!untimed.length) return '';
    return zh
      ? `${untimed.length} 位已选择艺人仍在等待确认时间。`
      : `${untimed.length} selected ${untimed.length === 1 ? 'artist is' : 'artists are'} still waiting on a confirmed time.`;
  }, [untimed.length, zh]);

  const saveMySchedule = async () => {
    await save();
    if (needsSignIn) {
      openRavenAuthModal('schedule', pathname);
    }
  };

  const saveCalendar = async () => {
    if (!timed.length) {
      setStatus({ tone: 'error', message: zh ? '还没有可导出的已确认演出时间。' : 'There are no confirmed set times to export yet.' });
      return;
    }
    try {
      const blob = new Blob([createScheduleIcs({ items: timed, meta })], { type: 'text/calendar;charset=utf-8' });
      const filename = `raven-${meta.festivalSlug}-my-schedule.ics`;
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: meta.festivalName });
      } else {
        downloadScheduleBlob(blob, filename);
      }
      setStatus({ tone: 'ok', message: zh ? `${timed.length} 场演出已准备好加入日历。` : `${timed.length} sets are ready for your calendar.` });
    } catch {
      setStatus({ tone: 'error', message: zh ? '日历文件暂时无法生成。' : 'The calendar file could not be created.' });
    }
  };

  const openWallpaper = async (requestedDay = selectedDay) => {
    const selectedItems = timed.filter((item) => item.festivalDay === requestedDay);
    if (!selectedItems.length && !untimed.length) return;
    setLoadingWallpaper(true);
    setStatus(null);
    try {
      const blob = await renderLineupScheduleWallpaper({
        festivalName: meta.festivalName,
        festivalDay: requestedDay || (zh ? '演出时间待公布' : 'Set times pending'),
        items: selectedItems,
        untimed,
        image,
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setWallpaperBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewOpen(true);
      setSheetOpen(false);
    } catch {
      setStatus({ tone: 'error', message: zh ? '壁纸暂时无法生成。' : 'The wallpaper could not be created.' });
    } finally {
      setLoadingWallpaper(false);
    }
  };

  const downloadWallpaper = async () => {
    if (!wallpaperBlob) return;
    const filename = `raven-${meta.festivalSlug}-schedule-${selectedDay || 'festival'}.png`;
    const file = new File([wallpaperBlob], filename, { type: 'image/png' });
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: meta.festivalName });
      } else {
        downloadScheduleBlob(wallpaperBlob, filename);
      }
    } catch {
      // Canceling native share should leave the preview open without an error.
    }
  };

  return (
    <>
      <button type="button" className="lineup-route-sheet__save" onClick={() => void saveMySchedule()} disabled={saveState === 'saving'}>
        {saveState === 'saving'
          ? (zh ? '正在保存…' : 'Saving…')
          : saveState === 'saved-cloud'
            ? (zh ? '已保存到 Raven' : 'Saved to Raven')
            : saveState === 'saved-local'
              ? (zh ? '已保存到浏览器' : 'Saved in browser')
              : (zh ? '保存我的日程' : 'Save My Schedule')}
      </button>
      <button type="button" className="lineup-route-sheet__share" onClick={() => setSheetOpen(true)}>
        {zh ? '分享' : 'Share'}
      </button>

      {sheetOpen ? (
        <div className="lineup-export-sheet" role="presentation">
          <button className="lineup-export-sheet__backdrop" type="button" aria-label={zh ? '关闭保存选项' : 'Close save options'} onClick={() => setSheetOpen(false)} />
          <section className="lineup-export-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="lineup-save-title">
            <p className="lineup-export-sheet__eyebrow">RAVEN</p>
            <h3 id="lineup-save-title">{zh ? '带着路线出发' : 'Share your schedule'}</h3>
            <p className="lineup-export-sheet__lead">{zh ? '把已保存的演出带进日历，或留在锁屏上。' : 'Carry your saved sets into your calendar or onto your lock screen.'}</p>
            <button type="button" className="lineup-export-sheet__option" onClick={saveCalendar}>
              <span>{zh ? '加入日历' : 'Add to Calendar'}</span>
              <small>{zh ? '把每一场已确认演出带进手机日历。' : 'Get each selected set in your phone calendar.'}</small>
              <em>{zh ? `${timed.length} 场已确认` : `${timed.length} timed sets`}</em>
            </button>
            <button type="button" className="lineup-export-sheet__option" onClick={() => void openWallpaper()} disabled={loadingWallpaper}>
              <span>{zh ? '保存为壁纸' : 'Save as Wallpaper'}</span>
              <small>{zh ? '让你的音乐路线留在锁屏上。' : 'Keep your festival schedule on your lock screen.'}</small>
              <em>{loadingWallpaper ? (zh ? '正在生成…' : 'Creating…') : '1080 × 1920 PNG'}</em>
            </button>
            {pendingCopy ? <p className="lineup-export-sheet__pending">{pendingCopy}</p> : null}
            {status ? <p className="lineup-export-sheet__status" data-tone={status.tone} role="status">{status.message}</p> : null}
          </section>
        </div>
      ) : null}

      {previewOpen && previewUrl ? (
        <div className="lineup-wallpaper" role="presentation">
          <button className="lineup-wallpaper__backdrop" type="button" aria-label={zh ? '关闭壁纸预览' : 'Close wallpaper preview'} onClick={() => setPreviewOpen(false)} />
          <section className="lineup-wallpaper__panel" role="dialog" aria-modal="true" aria-labelledby="lineup-wallpaper-title">
            <div className="lineup-wallpaper__header">
              <div>
                <p>RAVEN</p>
                <h3 id="lineup-wallpaper-title">{zh ? '你的锁屏路线' : 'Your lock-screen route'}</h3>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} aria-label={zh ? '关闭' : 'Close'}>×</button>
            </div>
            {days.length > 1 ? (
              <div className="lineup-wallpaper__days" aria-label={zh ? '选择演出日' : 'Choose festival day'}>
                {days.map((value) => <button key={value} type="button" aria-pressed={selectedDay === value} onClick={() => { setDay(value); void openWallpaper(value); }}>{value}</button>)}
              </div>
            ) : null}
            <img src={previewUrl} alt={zh ? `${meta.festivalName} 锁屏日程预览` : `${meta.festivalName} lock-screen schedule preview`} />
            <button type="button" className="lineup-wallpaper__download" onClick={downloadWallpaper}>{zh ? '下载或保存 PNG' : 'Download or Save PNG'}</button>
          </section>
        </div>
      ) : null}
    </>
  );
}
