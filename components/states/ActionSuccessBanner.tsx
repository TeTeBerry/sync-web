import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type ActionSuccessBannerProps = {
  icon: LucideIcon;
  title: string;
  lead?: string;
  actions?: ReactNode;
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
};

export function ActionSuccessBanner({
  icon: Icon,
  title,
  lead,
  actions,
  className = '',
  dismissible = false,
  onDismiss,
  dismissLabel = 'Dismiss',
}: ActionSuccessBannerProps) {
  return (
    <div
      className={`action-success state-enter${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="action-success__glow" aria-hidden="true" />
      <div className="action-success__icon" aria-hidden="true">
        <Icon size={16} strokeWidth={2.25} />
      </div>
      <div className="action-success__copy">
        <p className="action-success__title">{title}</p>
        {lead ? <p className="action-success__lead">{lead}</p> : null}
      </div>
      {actions ? <div className="action-success__actions">{actions}</div> : null}
      {dismissible && onDismiss ? (
        <button className="action-success__dismiss" type="button" onClick={onDismiss} aria-label={dismissLabel}>
          ×
        </button>
      ) : null}
    </div>
  );
}
