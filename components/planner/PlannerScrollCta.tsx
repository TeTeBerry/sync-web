'use client';

import { ArrowDown } from 'lucide-react';

type PlannerScrollCtaProps = {
  label: string;
  targetId?: string;
  className?: string;
};

export function PlannerScrollCta({
  label,
  targetId = 'planner-form',
  className = 'button button--glow',
}: PlannerScrollCtaProps) {
  const handleClick = () => {
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    }
  };

  return (
    <button type="button" className={className} onClick={handleClick}>
      {label}
      <ArrowDown size={15} strokeWidth={2.25} aria-hidden />
    </button>
  );
}
