import type { CSSProperties } from 'react';

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
  delay?: 0 | 1 | 2 | 3 | 4 | 5;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
};

export function Skeleton({ className = '', style, delay = 0, rounded = 'md' }: SkeletonProps) {
  const delayClass = delay > 0 ? ` skeleton--delay-${delay}` : '';
  return (
    <span
      className={`skeleton skeleton--${rounded}${delayClass}${className ? ` ${className}` : ''}`}
      style={style}
      aria-hidden="true"
    />
  );
}
