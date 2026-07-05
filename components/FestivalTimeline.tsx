'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

type TimelineItem = {
  time: string;
  label: string;
  kind: 'logistics' | 'artist';
};

type TimelineDay = {
  label: string;
  items: readonly TimelineItem[];
};

type FestivalTimelineProps = {
  days: readonly TimelineDay[];
  ariaLabel: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function scrollItemWithinContainer(
  container: HTMLElement,
  item: HTMLElement,
  behavior: ScrollBehavior = 'smooth',
) {
  const containerRect = container.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const padding = 8;

  if (itemRect.top < containerRect.top + padding) {
    const nextTop = itemRect.top - containerRect.top + container.scrollTop - padding;
    container.scrollTo({ top: Math.max(0, nextTop), behavior });
    return;
  }

  if (itemRect.bottom > containerRect.bottom - padding) {
    const nextTop =
      itemRect.bottom - containerRect.top + container.scrollTop - container.clientHeight + padding;
    container.scrollTo({
      top: Math.min(nextTop, container.scrollHeight - container.clientHeight),
      behavior,
    });
  }
}

export function FestivalTimeline({ days, ariaLabel }: FestivalTimelineProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [revealed, setRevealed] = useState(false);

  const flatItems = useMemo(
    () =>
      days.flatMap((day, dayIndex) =>
        day.items.map((item, itemIndex) => ({
          ...item,
          dayIndex,
          dayLabel: day.label,
          itemIndex,
          isFirstInDay: itemIndex === 0,
        })),
      ),
    [days],
  );

  const itemCount = flatItems.length;

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setRevealed(true);
      setActiveIndex(itemCount - 1);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [itemCount]);

  useEffect(() => {
    if (!revealed) return;

    let cancelled = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    async function animate() {
      for (let index = 0; index < itemCount; index += 1) {
        if (cancelled) return;
        setActiveIndex(index);
        if (!reducedMotion) await sleep(420);
      }

      if (cancelled || reducedMotion) return;

      await sleep(800);

      while (!cancelled) {
        for (let index = 0; index < itemCount; index += 1) {
          if (cancelled) return;
          setActiveIndex(index);
          await sleep(2000);
        }
      }
    }

    void animate();
    return () => {
      cancelled = true;
    };
  }, [revealed, itemCount]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const container = scrollRef.current;
    const node = itemRefs.current[activeIndex];
    if (!container || !node) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollItemWithinContainer(container, node, reducedMotion ? 'auto' : 'smooth');
  }, [activeIndex]);

  const progress =
    activeIndex < 0 ? 0 : Math.min(100, ((activeIndex + 1) / itemCount) * 100);

  let globalIndex = -1;

  return (
    <div
      className={`festival-timeline${revealed ? ' is-revealed' : ''}`}
      ref={rootRef}
      aria-label={ariaLabel}
    >
      <div className="festival-timeline__panel">
        <div className="festival-timeline__scroll" ref={scrollRef}>
          {days.map((day) => (
            <section className="festival-timeline__day-group" key={day.label}>
              <h3 className="festival-timeline__day">{day.label}</h3>

              <ol className="festival-timeline__list">
                {day.items.map((item) => {
                  globalIndex += 1;
                  const index = globalIndex;
                  const isActive = index === activeIndex;
                  const isPast = index < activeIndex;

                  return (
                    <li
                      className={[
                        'festival-timeline__item',
                        `festival-timeline__item--${item.kind}`,
                        isActive ? 'is-active' : '',
                        isPast ? 'is-past' : '',
                        revealed ? 'is-visible' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      key={`${day.label}-${item.time}-${item.label}`}
                      ref={(node) => {
                        itemRefs.current[index] = node;
                      }}
                      style={{ '--item-index': index } as CSSProperties}
                    >
                      <span className="festival-timeline__node" aria-hidden />
                      <time className="festival-timeline__time" dateTime={item.time.replace('.', ':')}>
                        {item.time}
                      </time>
                      <span className="festival-timeline__label">{item.label}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>

        <div className="festival-timeline__track" aria-hidden>
          <span className="festival-timeline__track-fill" style={{ height: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
