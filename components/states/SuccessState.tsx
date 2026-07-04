import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type SuccessStateVariant = 'page' | 'panel' | 'inline';

type SuccessStateProps = {
  icon: LucideIcon;
  title: string;
  lead: string;
  variant?: SuccessStateVariant;
  iconTone?: 'default' | 'accent';
  eyebrow?: ReactNode;
  nextLabel?: string;
  nextSteps?: readonly string[];
  actions?: ReactNode;
  className?: string;
  id?: string;
};

export function SuccessState({
  icon: Icon,
  title,
  lead,
  variant = 'page',
  iconTone = 'default',
  eyebrow,
  nextLabel,
  nextSteps,
  actions,
  className = '',
  id,
}: SuccessStateProps) {
  const classes = [
    'success-state',
    'state-enter',
    `success-state--${variant}`,
    iconTone === 'accent' ? 'success-state--accent-icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes} aria-labelledby={id}>
      <div className="success-state__atmosphere" aria-hidden="true">
        <div className="success-state__glow success-state__glow--primary" />
        <div className="success-state__glow success-state__glow--accent" />
      </div>

      <div className="success-state__content">
        <div className="success-state__icon" aria-hidden="true">
          <Icon size={variant === 'inline' ? 20 : 28} strokeWidth={2.25} />
        </div>

        {eyebrow ? <div className="success-state__eyebrow">{eyebrow}</div> : null}

        <h2 className="success-state__title" id={id}>
          {title}
        </h2>
        <p className="success-state__lead">{lead}</p>

        {nextSteps?.length ? (
          <ul className="success-state__next" aria-label={nextLabel}>
            {nextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        {actions ? <div className="success-state__actions">{actions}</div> : null}
      </div>
    </section>
  );
}
