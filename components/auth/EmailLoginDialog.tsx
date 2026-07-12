'use client';

import { useEffect, useId, useRef } from 'react';
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

  if (!open) return null;

  return (
    <div className="squad-dialog squad-dialog--bg-scroll auth-email-dialog" role="presentation">
      <button
        type="button"
        className="squad-dialog__backdrop"
        aria-label={copy.closeAria}
        onClick={onClose}
        onWheel={(event) => {
          // Backdrop intercepts pointer events for dismiss; forward wheel to the page.
          window.scrollBy({ top: event.deltaY, left: event.deltaX });
        }}
      />
      <div
        ref={panelRef}
        className="squad-dialog__panel squad-dialog__panel--form auth-email-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="squad-dialog__header">
          <h2 id={titleId}>{copy.dialogTitle}</h2>
          <p>{copy.dialogLead}</p>
          <button type="button" className="squad-dialog__close" onClick={onClose}>
            {copy.close}
          </button>
        </div>
        <div className="squad-dialog__body">
          <EmailLoginForm locale={locale} onSubmit={onSubmitEmail} />
        </div>
      </div>
    </div>
  );
}
