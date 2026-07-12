'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  JOURNEY_SHARE_ASPECTS,
  type JourneyShareAspect,
  type JourneyShareCardData,
} from '../../lib/journey-share';
import { JourneyShareActions, type JourneyShareActionCopy } from './JourneyShareActions';
import { JourneyShareCard } from './JourneyShareCard';
import { JourneyShareLayout } from './JourneyShareLayout';
import type { JourneyShareLabels } from './JourneyShareMetadata';

type JourneySharePreviewProps = {
  open: boolean;
  onClose: () => void;
  data: JourneyShareCardData;
  labels: JourneyShareLabels;
  actionCopy: JourneyShareActionCopy;
  title: string;
  aspectLabel: string;
  closeLabel: string;
  eventLegacyId?: number;
  locale: string;
  initialAspect?: JourneyShareAspect;
};

const ASPECT_ORDER: JourneyShareAspect[] = ['portrait', 'story', 'square', 'og'];

export function JourneySharePreview({
  open,
  onClose,
  data,
  labels,
  actionCopy,
  title,
  aspectLabel,
  closeLabel,
  eventLegacyId,
  locale,
  initialAspect = 'portrait',
}: JourneySharePreviewProps) {
  const [aspect, setAspect] = useState<JourneyShareAspect>(initialAspect);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) setAspect(initialAspect);
  }, [open, initialAspect]);

  if (!open) return null;

  return (
    <div className="journey-share-preview" role="presentation">
      <button
        type="button"
        className="journey-share-preview__backdrop"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        className="journey-share-preview__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="journey-share-preview__header">
          <h2 id={titleId} className="journey-share-preview__title">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="journey-share-preview__close"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </header>

        <div
          className="journey-share-preview__aspects"
          role="group"
          aria-label={aspectLabel}
        >
          {ASPECT_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              className="journey-share-preview__aspect"
              aria-pressed={aspect === key}
              onClick={() => setAspect(key)}
            >
              {JOURNEY_SHARE_ASPECTS[key].label}
            </button>
          ))}
        </div>

        <div className="journey-share-preview__canvas">
          <JourneyShareLayout aspect={aspect}>
            <JourneyShareCard data={data} labels={labels} priority />
          </JourneyShareLayout>
        </div>

        <div className="journey-share-preview__actions">
          <JourneyShareActions
            data={data}
            labels={labels}
            copy={actionCopy}
            aspect={aspect}
            eventLegacyId={eventLegacyId}
            locale={locale}
            showPreview={false}
          />
        </div>
      </div>
    </div>
  );
}
