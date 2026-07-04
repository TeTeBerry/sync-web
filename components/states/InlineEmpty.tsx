import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

type InlineEmptyProps = {
  icon: LucideIcon;
  title: string;
  lead: string;
  action?: ReactNode;
};

export function InlineEmpty({ icon, title, lead, action }: InlineEmptyProps) {
  return (
    <EmptyState
      className="inline-empty"
      icon={icon}
      title={title}
      lead={lead}
      variant="inline"
      graphic="none"
      actions={action}
    />
  );
}
