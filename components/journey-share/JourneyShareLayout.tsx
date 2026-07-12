import type { ReactNode } from 'react';
import {
  JOURNEY_SHARE_ASPECTS,
  type JourneyShareAspect,
} from '../../lib/journey-share';

type JourneyShareLayoutProps = {
  aspect?: JourneyShareAspect;
  children: ReactNode;
  className?: string;
  cardRef?: React.RefObject<HTMLDivElement | null>;
};

export function JourneyShareLayout({
  aspect = 'portrait',
  children,
  className,
  cardRef,
}: JourneyShareLayoutProps) {
  const spec = JOURNEY_SHARE_ASPECTS[aspect];
  const classes = ['journey-share-layout', className].filter(Boolean).join(' ');

  return (
    <div
      ref={cardRef}
      className={classes}
      data-aspect={aspect}
      style={{ ['--journey-share-ratio' as string]: spec.ratio }}
    >
      <div className="journey-share-layout__frame">{children}</div>
    </div>
  );
}
