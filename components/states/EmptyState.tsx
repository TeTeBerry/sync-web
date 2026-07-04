import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type EmptyStateVariant = 'panel' | 'compact' | 'inline';
export type EmptyStateTone = 'neutral' | 'accent' | 'error';
export type EmptyStateGraphic = 'glow' | 'orbit' | 'pulse' | 'none';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  lead: string;
  variant?: EmptyStateVariant;
  tone?: EmptyStateTone;
  graphic?: EmptyStateGraphic;
  className?: string;
  suggestionsLabel?: string;
  suggestions?: readonly string[];
  actions?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  lead,
  variant = 'panel',
  tone = 'neutral',
  graphic = 'glow',
  className = '',
  suggestionsLabel,
  suggestions,
  actions,
}: EmptyStateProps) {
  const classes = [
    'empty-state',
    'state-enter',
    `empty-state--${variant}`,
    tone !== 'neutral' ? `empty-state--${tone}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role="status">
      {graphic !== 'none' ? (
        <div className="empty-state__atmosphere" aria-hidden="true">
          {graphic === 'glow' ? <div className="empty-state__glow" /> : null}
          {graphic === 'orbit' ? (
            <>
              <div className="empty-state__orbit empty-state__orbit--outer" />
              <div className="empty-state__orbit empty-state__orbit--inner" />
            </>
          ) : null}
          {graphic === 'pulse' ? <div className="empty-state__pulse" /> : null}
        </div>
      ) : null}

      <div className="empty-state__icon" aria-hidden="true">
        <Icon size={variant === 'inline' ? 18 : 22} strokeWidth={1.75} />
      </div>

      <div className="empty-state__copy">
        <h2 className="empty-state__title">{title}</h2>
        <p className="empty-state__lead">{lead}</p>
      </div>

      {suggestions?.length ? (
        <div className="empty-state__suggestions">
          {suggestionsLabel ? (
            <span className="empty-state__suggestions-label">{suggestionsLabel}</span>
          ) : null}
          <ul className="empty-state__suggestions-list">
            {suggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {actions ? <div className="empty-state__actions">{actions}</div> : null}
    </div>
  );
}
