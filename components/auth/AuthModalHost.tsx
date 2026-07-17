'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SignInExperience } from './SignInExperience';
import type { RavenAuthIntent } from '../../lib/auth/modal';

type AuthRequest = { intent: RavenAuthIntent; callbackUrl: string };

export function AuthModalHost() {
  const [request, setRequest] = useState<AuthRequest | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setRequest(null), []);

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<AuthRequest>).detail;
      if (detail?.callbackUrl) setRequest(detail);
    };
    window.addEventListener('raven:open-auth', open);
    return () => window.removeEventListener('raven:open-auth', open);
  }, []);

  useEffect(() => {
    if (!request) return;
    const modal = modalRef.current;
    if (!modal) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const hiddenSiblings = [...document.body.children]
      .filter((element) => element !== modal)
      .map((element) => ({
        element,
        ariaHidden: element.getAttribute('aria-hidden'),
        inert: element.hasAttribute('inert'),
      }));
    hiddenSiblings.forEach(({ element }) => {
      element.setAttribute('aria-hidden', 'true');
      element.setAttribute('inert', '');
    });

    const focusable = () => Array.from(modal.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    const initialFocus = modal.querySelector<HTMLElement>('.raven-auth-card__close') ?? focusable()[0];
    requestAnimationFrame(() => initialFocus?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      hiddenSiblings.forEach(({ element, ariaHidden, inert }) => {
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
        if (!inert) element.removeAttribute('inert');
      });
      openerRef.current?.focus();
    };
  }, [close, request]);

  if (!request) return null;
  return (
    <div ref={modalRef} className="raven-auth-modal" role="dialog" aria-modal="true" aria-label="Raven sign in">
      <button className="raven-auth-modal__backdrop" type="button" tabIndex={-1} aria-label="Close sign in" onClick={close} />
      <SignInExperience
        modal
        intent={request.intent}
        callbackUrl={request.callbackUrl}
        onClose={close}
      />
    </div>
  );
}
