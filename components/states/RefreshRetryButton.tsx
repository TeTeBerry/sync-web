'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type RefreshRetryButtonProps = {
  children: ReactNode;
  className?: string;
  label?: string;
};

export function RefreshRetryButton({ children, className = 'button', label }: RefreshRetryButtonProps) {
  const router = useRouter();

  return (
    <button className={className} type="button" onClick={() => router.refresh()} aria-label={label}>
      {children}
    </button>
  );
}
