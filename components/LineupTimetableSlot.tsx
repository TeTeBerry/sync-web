'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import type { LineupTimetableSlot as TimetableSlot } from '../lib/lineup-timetable';
import { formatLineupTimeRange } from '../lib/lineup-timetable';
import { MISSING_GENRE_LABEL } from '../lib/lineup-genre';
import { timetableSlotSelectionId } from '../lib/lineup-selection';
import { useLineupSelection } from './lineup/LineupSelectionContext';

type LineupTimetableSlotProps = {
  slot: TimetableSlot;
  timeLabel: string;
  accent: string;
};

function splitB2bName(name: string): string[] | null {
  const parts = name.split(/\s+b2b\s+/i).map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts : null;
}

function ArtistTooltipContent({ name }: { name: string }) {
  const b2bParts = splitB2bName(name);
  if (!b2bParts) {
    return <span className="lineup-timetable__tooltip-text">{name}</span>;
  }

  return (
    <span className="lineup-timetable__tooltip-artists">
      {b2bParts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
          {index > 0 ? (
            <span className="lineup-timetable__tooltip-b2b" aria-hidden="true">
              B2B
            </span>
          ) : null}
          <span className="lineup-timetable__tooltip-artist-part">{part}</span>
        </Fragment>
      ))}
    </span>
  );
}

export function LineupTimetableSlot({ slot, timeLabel, accent }: LineupTimetableSlotProps) {
  const { isSelected, toggle } = useLineupSelection();
  const selectionId = timetableSlotSelectionId(slot.artistId, slot.startMinutes);
  const selected = isSelected(selectionId);
  const tooltipId = useId();
  const slotRef = useRef<HTMLButtonElement>(null);
  const artistRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isTooltipAnimated, setIsTooltipAnimated] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [canHover, setCanHover] = useState(false);
  const missingGenre = slot.genreLabel === MISSING_GENRE_LABEL;

  const measureTruncation = useCallback(() => {
    const artist = artistRef.current;
    if (!artist) {
      setIsTruncated(false);
      return;
    }

    setIsTruncated(artist.scrollWidth > artist.clientWidth + 1);
  }, []);

  const updateTooltipPosition = useCallback(() => {
    const slotElement = slotRef.current;
    if (!slotElement) return;

    const rect = slotElement.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top - 10,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const syncHoverCapability = () => setCanHover(hoverQuery.matches);
    syncHoverCapability();
    hoverQuery.addEventListener('change', syncHoverCapability);
    return () => hoverQuery.removeEventListener('change', syncHoverCapability);
  }, []);

  useEffect(() => {
    measureTruncation();

    const artist = artistRef.current;
    if (!artist) return;

    const resizeObserver = new ResizeObserver(() => {
      measureTruncation();
    });
    resizeObserver.observe(artist);

    window.addEventListener('resize', measureTruncation);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measureTruncation);
    };
  }, [measureTruncation, slot.artistName]);

  useEffect(() => {
    if (!isTooltipVisible) {
      setIsTooltipAnimated(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setIsTooltipAnimated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isTooltipVisible]);

  useEffect(() => {
    if (!isTooltipVisible) return;

    updateTooltipPosition();

    const handleReposition = () => updateTooltipPosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isTooltipVisible, updateTooltipPosition]);

  const showTooltip = isTruncated && canHover;

  const handleShowTooltip = () => {
    if (!showTooltip) return;
    updateTooltipPosition();
    setIsTooltipVisible(true);
  };

  const handleHideTooltip = () => {
    setIsTooltipVisible(false);
  };

  return (
    <>
      <li className="lineup-timetable__slot-item">
        <button
          ref={slotRef}
          type="button"
          className={[
            'lineup-timetable__slot',
            selected ? 'lineup-timetable__slot--selected' : '',
            showTooltip ? 'lineup-timetable__slot--tooltip' : '',
            isTooltipVisible ? 'lineup-timetable__slot--tooltip-open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ '--stage-accent': accent } as CSSProperties}
          aria-pressed={selected}
          onClick={() => toggle(selectionId)}
          onMouseEnter={handleShowTooltip}
          onMouseLeave={handleHideTooltip}
          onFocus={handleShowTooltip}
          onBlur={handleHideTooltip}
          aria-describedby={showTooltip && isTooltipVisible ? tooltipId : undefined}
        >
          <time
            className="lineup-timetable__slot-time"
            dateTime={slot.startTime}
            aria-label={timeLabel}
          >
            {formatLineupTimeRange(slot.startTime, slot.endTime)}
          </time>
          <div className="lineup-timetable__slot-body">
            <span ref={artistRef} className="lineup-timetable__slot-artist">
              {slot.artistName}
            </span>
            {!missingGenre ? (
              <span
                className="lineup-timetable__slot-genre"
                style={{ '--genre-accent': slot.genreColor ?? accent } as CSSProperties}
              >
                {slot.genreLabel}
              </span>
            ) : null}
          </div>
        </button>
      </li>

      {showTooltip && isTooltipVisible
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              className={[
                'lineup-timetable__tooltip',
                isTooltipAnimated ? 'lineup-timetable__tooltip--visible' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                {
                  '--stage-accent': accent,
                  top: `${tooltipPosition.top}px`,
                  left: `${tooltipPosition.left}px`,
                } as CSSProperties
              }
            >
              <ArtistTooltipContent name={slot.artistName} />
              <span className="lineup-timetable__tooltip-caret" aria-hidden="true" />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
