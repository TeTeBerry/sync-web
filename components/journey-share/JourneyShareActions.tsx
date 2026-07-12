'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import { Copy, Download, Eye, Share2 } from 'lucide-react';
import {
  absoluteJourneyShareUrl,
  type JourneyShareAspect,
  type JourneyShareCardData,
} from '../../lib/journey-share';
import { getSiteUrl } from '../../lib/site';
import type { JourneyShareLabels } from './JourneyShareMetadata';
import { downloadBlob, renderJourneySharePng } from './renderJourneySharePng';

export type JourneyShareActionCopy = {
  preview: string;
  download: string;
  copyLink: string;
  nativeShare: string;
  copied: string;
  copyFailed: string;
  downloadFailed: string;
  downloading: string;
};

type JourneyShareActionsProps = {
  data: JourneyShareCardData;
  labels: JourneyShareLabels;
  copy: JourneyShareActionCopy;
  aspect?: JourneyShareAspect;
  eventLegacyId?: number;
  locale: string;
  onPreview?: () => void;
  showPreview?: boolean;
  showNativeShare?: boolean;
};

type Status = { tone: 'ok' | 'error'; message: string } | null;

export function JourneyShareActions({
  data,
  labels,
  copy,
  aspect = 'portrait',
  eventLegacyId,
  locale,
  onPreview,
  showPreview = true,
  showNativeShare = true,
}: JourneyShareActionsProps) {
  const [status, setStatus] = useState<Status>(null);
  const [downloading, setDownloading] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  const analyticsBase = {
    event: eventLegacyId != null ? String(eventLegacyId) : data.festivalName,
    locale,
    guide_id: data.id,
    aspect,
  };

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    return () => {
      if (resetTimerRef.current != null) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  const flash = (next: Status, ms = 2200) => {
    if (resetTimerRef.current != null) window.clearTimeout(resetTimerRef.current);
    setStatus(next);
    if (next) {
      resetTimerRef.current = window.setTimeout(() => setStatus(null), ms);
    }
  };

  const shareUrl =
    typeof window !== 'undefined'
      ? absoluteJourneyShareUrl(window.location.origin, data.sharePath)
      : absoluteJourneyShareUrl(getSiteUrl(), data.sharePath);

  const handleCopy = async () => {
    track('journey_share_copied', analyticsBase);
    try {
      await navigator.clipboard.writeText(shareUrl);
      flash({ tone: 'ok', message: copy.copied });
    } catch {
      flash({ tone: 'error', message: copy.copyFailed });
    }
  };

  const handleDownload = async () => {
    track('journey_share_downloaded', analyticsBase);
    setDownloading(true);
    try {
      const blob = await renderJourneySharePng({ data, labels, aspect });
      const safeName = data.festivalName
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48);
      downloadBlob(blob, `raven-journey-${safeName || data.id}-${aspect}.png`);
    } catch {
      flash({ tone: 'error', message: copy.downloadFailed });
    } finally {
      setDownloading(false);
    }
  };

  const handleNativeShare = async () => {
    track('journey_share_clicked', { ...analyticsBase, method: 'native' });
    try {
      await navigator.share({
        title: data.festivalName,
        text: `${data.festivalName} — Raven Journey`,
        url: shareUrl,
      });
    } catch {
      // User cancel is fine; ignore.
    }
  };

  const handlePreview = () => {
    // Parent owns journey_share_previewed to avoid double-firing.
    onPreview?.();
  };

  return (
    <div className="journey-share-actions">
      {showPreview && onPreview ? (
        <button type="button" className="journey-share-actions__btn" onClick={handlePreview}>
          <Eye size={14} strokeWidth={2.25} aria-hidden />
          {copy.preview}
        </button>
      ) : null}

      <button
        type="button"
        className="journey-share-actions__btn"
        onClick={handleDownload}
        disabled={downloading}
      >
        <Download size={14} strokeWidth={2.25} aria-hidden />
        {downloading ? copy.downloading : copy.download}
      </button>

      <button type="button" className="journey-share-actions__btn" onClick={handleCopy}>
        <Copy size={14} strokeWidth={2.25} aria-hidden />
        {copy.copyLink}
      </button>

      {showNativeShare && canNativeShare ? (
        <button type="button" className="journey-share-actions__btn" onClick={handleNativeShare}>
          <Share2 size={14} strokeWidth={2.25} aria-hidden />
          {copy.nativeShare}
        </button>
      ) : null}

      {status ? (
        <p className="journey-share-actions__status" data-tone={status.tone} role="status">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
