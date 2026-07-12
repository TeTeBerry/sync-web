'use client';

import type { ReactNode } from 'react';
import type { AuthCapabilities, AuthIntendedAction } from '../../lib/auth/types';
import type { CapabilityKey } from '../../lib/auth/capabilities';
import { getMessages, type Locale } from '../../lib/i18n';

type AuthRequiredGateProps = {
  locale: Locale;
  signedIn: boolean;
  loading?: boolean;
  capabilities?: AuthCapabilities | null;
  /** Capability required after sign-in (defaults to allow when signed in). */
  requireCapability?: CapabilityKey;
  intendedAction: AuthIntendedAction;
  onRequireAuth: (action: AuthIntendedAction) => void;
  /** When capability is missing after sign-in. */
  deniedFallback?: ReactNode;
  children: ReactNode;
};

/**
 * Gates protected Festival Squad actions behind auth without coupling to
 * the temporary email-only method. Swap the onRequireAuth opener later for OTP.
 */
export function AuthRequiredGate({
  locale,
  signedIn,
  loading = false,
  capabilities,
  requireCapability,
  intendedAction,
  onRequireAuth,
  deniedFallback = null,
  children,
}: AuthRequiredGateProps) {
  const copy = getMessages(locale).auth;

  if (loading) return null;

  if (!signedIn) {
    return (
      <button
        type="button"
        className="button"
        onClick={() => onRequireAuth(intendedAction)}
      >
        {copy.continueWithEmail}
      </button>
    );
  }

  if (requireCapability && capabilities && !capabilities[requireCapability]) {
    return <>{deniedFallback}</>;
  }

  return <>{children}</>;
}
