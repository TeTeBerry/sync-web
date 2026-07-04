import { AlertCircle, RefreshCw, UserCheck, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type WaitlistErrorKind = 'network' | 'duplicate' | 'validation' | 'server';

type WaitlistFormErrorProps = {
  kind: WaitlistErrorKind;
  title: string;
  lead: string;
  retryLabel: string;
  onRetry?: () => void;
};

const errorIcons: Record<WaitlistErrorKind, LucideIcon> = {
  network: WifiOff,
  duplicate: UserCheck,
  validation: AlertCircle,
  server: AlertCircle,
};

export function WaitlistFormError({ kind, title, lead, retryLabel, onRetry }: WaitlistFormErrorProps) {
  const Icon = errorIcons[kind];

  return (
    <div className="waitlist-form-error state-enter" role="alert" aria-live="polite">
      <div className="waitlist-form-error__glow" aria-hidden="true" />
      <div className={`waitlist-form-error__icon waitlist-form-error__icon--${kind}`} aria-hidden="true">
        <Icon size={16} strokeWidth={2} />
      </div>
      <div className="waitlist-form-error__copy">
        <p className="waitlist-form-error__title">{title}</p>
        <p className="waitlist-form-error__lead">{lead}</p>
      </div>
      {onRetry ? (
        <button className="waitlist-form-error__retry" type="button" onClick={onRetry}>
          <RefreshCw size={13} strokeWidth={2} aria-hidden />
          <span>{retryLabel}</span>
        </button>
      ) : null}
    </div>
  );
}
