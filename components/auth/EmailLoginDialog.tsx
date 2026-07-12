'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { EmailLoginForm } from './EmailLoginForm';
import { trackAuthEvent } from '../../lib/auth/analytics';
import type { AuthIntendedAction } from '../../lib/auth/types';
import { useFocusTrap } from '../../lib/festival-squad/use-focus-trap';
import { getMessages, type Locale } from '../../lib/i18n';

type EmailLoginDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmitEmail: (email: string) => Promise<void>;
  intendedAction?: AuthIntendedAction | null;
  locale: Locale;
};

/**
 * Non-blocking email login:
 * - Dimmer is visual-only (`pointer-events: none`) so the page keeps native scroll.
 * - Outside click closes the dialog but still reaches the page (click-through).
 * - Not a hard modal: `aria-modal="false"` because background remains interactive.
 */
export function EmailLoginDialog({
  open,
  onClose,
  onSubmitEmail,
  intendedAction,
  locale,
}: EmailLoginDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const copy = getMessages(locale).auth;

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    trackAuthEvent('auth_email_login_opened', {
      intendedAction: intendedAction ?? 'none',
    });
  }, [open, intendedAction]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Click-through dismiss: close when the user activates something behind the panel,
  // without preventDefault/stopPropagation so links and controls still work.
  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      const panel = panelRef.current;
      const target = event.target;
      if (!panel || !(target instanceof Node) || panel.contains(target)) return;
      onClose();
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="squad-dialog squad-dialog--bg-scroll auth-email-dialog" role="presentation">
      <div className="squad-dialog__backdrop" aria-hidden />
      <div
        ref={panelRef}
        className="squad-dialog__panel squad-dialog__panel--form auth-email-dialog__panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="squad-dialog__header">
          <h2 id={titleId}>{copy.dialogTitle}</h2>
          <p>{copy.dialogLead}</p>
          <button
            type="button"
            className="squad-dialog__close"
            onClick={onClose}
            aria-label={copy.closeAria}
          >
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <div className="squad-dialog__body">
          <EmailLoginForm locale={locale} onSubmit={onSubmitEmail} />
        </div>
      </div>
    </div>
  );
}
