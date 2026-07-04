'use client';

import { useEffect, useState } from 'react';

type UseTypingEffectOptions = {
  /** Characters per tick */
  speed?: number;
  /** Pause between ticks in ms */
  interval?: number;
  /** Start typing when true */
  active?: boolean;
};

export function useTypingEffect(
  text: string,
  { speed = 1, interval = 24, active = true }: UseTypingEffectOptions = {},
): { text: string; isComplete: boolean } {
  const [displayed, setDisplayed] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!active) {
      setDisplayed('');
      setIsComplete(false);
      return;
    }

    setDisplayed('');
    setIsComplete(false);

    if (!text) {
      setIsComplete(true);
      return;
    }

    let index = 0;
    const timer = window.setInterval(() => {
      index += speed;
      if (index >= text.length) {
        setDisplayed(text);
        setIsComplete(true);
        clearInterval(timer);
        return;
      }
      setDisplayed(text.slice(0, index));
    }, interval);

    return () => clearInterval(timer);
  }, [text, speed, interval, active]);

  return { text: displayed, isComplete };
}
