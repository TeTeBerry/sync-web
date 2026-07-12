'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import { Share2 } from 'lucide-react';
import {
  absoluteJourneyShareUrl,
  type JourneyShareCardData,
} from '../../lib/journey-share';
import { getSiteUrl } from '../../lib/site';
import { JourneyShareActions, type JourneyShareActionCopy } from './JourneyShareActions';
import { JourneyShareCard } from './JourneyShareCard';
import { JourneyShareLayout } from './JourneyShareLayout';
import type { JourneyShareLabels } from './JourneyShareMetadata';
import { JourneySharePreview } from './JourneySharePreview';

export type JourneyShareSectionCopy = {
  kicker: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  previewTitle: string;
  aspectLabel: string;
  closePreview: string;
  card: JourneyShareLabels;
  actions: JourneyShareActionCopy;
};

type JourneyShareSectionProps = {
  data: JourneyShareCardData;
  copy: JourneyShareSectionCopy;
  eventLegacyId?: number;
  locale: string;
};

export function JourneyShareSection({
  data,
  copy,
  eventLegacyId,
  locale,
}: JourneyShareSectionProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  const analyticsBase = {
    event: eventLegacyId != null ? String(eventLegacyId) : data.festivalName,
    locale,
    guide_id: data.id,
  };

  useEffect(() => {
    return () => {
      if (statusTimerRef.current != null) window.clearTimeout(statusTimerRef.current);
    };
  }, []);

  const flashStatus = (message: string) => {
    if (statusTimerRef.current != null) window.clearTimeout(statusTimerRef.current);
    setShareStatus(message);
    statusTimerRef.current = window.setTimeout(() => setShareStatus(null), 2200);
  };

  const shareUrl =
    typeof window !== 'undefined'
      ? absoluteJourneyShareUrl(window.location.origin, data.sharePath)
      : absoluteJourneyShareUrl(getSiteUrl(), data.sharePath);

  const openPreview = () => {
    track('journey_share_previewed', analyticsBase);
    setPreviewOpen(true);
  };

  const sharePrimary = async () => {
    track('journey_share_clicked', { ...analyticsBase, method: 'primary' });

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: data.festivalName,
          text: `${data.festivalName} — Raven Journey`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancel or share failure — fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      flashStatus(copy.actions.copied);
    } catch {
      flashStatus(copy.actions.copyFailed);
      setPreviewOpen(true);
    }
  };

  return (
    <section
      className="journey-share-section raven-journey__section raven-journey__section--share"
      aria-labelledby="journey-share-heading"
      data-journey-reveal
    >
      <div className="journey-share-section__intro">
        <p className="journey-share-section__kicker">{copy.kicker}</p>
        <h2 id="journey-share-heading" className="journey-share-section__title">
          {copy.title}
        </h2>
        <p className="journey-share-section__lead">{copy.description}</p>
        <div className="journey-share-section__ctas">
          <button type="button" className="journey-share-section__cta" onClick={sharePrimary}>
            <Share2 size={15} strokeWidth={2.25} aria-hidden />
            {copy.primaryCta}
          </button>
          <button
            type="button"
            className="journey-share-section__cta journey-share-section__cta--ghost"
            onClick={openPreview}
          >
            {copy.secondaryCta}
          </button>
        </div>
        {shareStatus ? (
          <p className="journey-share-section__status" role="status">
            {shareStatus}
          </p>
        ) : null}
      </div>

      <div className="journey-share-section__stage">
        <JourneyShareLayout aspect="portrait">
          <JourneyShareCard data={data} labels={copy.card} />
        </JourneyShareLayout>
        <div className="journey-share-section__actions">
          <JourneyShareActions
            data={data}
            labels={copy.card}
            copy={copy.actions}
            eventLegacyId={eventLegacyId}
            locale={locale}
            onPreview={openPreview}
          />
        </div>
      </div>

      <JourneySharePreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={data}
        labels={copy.card}
        actionCopy={copy.actions}
        title={copy.previewTitle}
        aspectLabel={copy.aspectLabel}
        closeLabel={copy.closePreview}
        eventLegacyId={eventLegacyId}
        locale={locale}
      />
    </section>
  );
}
