'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchAuthSession,
  submitEmailLogin,
  submitLogout,
} from '../lib/auth/client';
import { trackAuthEvent } from '../lib/auth/analytics';
import type {
  AuthIntendedAction,
  PublicAuthSessionResponse,
} from '../lib/auth/types';

export function useAuthSession() {
  const [session, setSession] = useState<PublicAuthSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchAuthSession();
      setSession(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
      setSession({
        signedIn: false,
        user: null,
        capabilities: {
          canCreateSquadProfile: false,
          canEditSquadProfile: false,
          canBrowseMatches: false,
          canSendConnectionRequest: false,
          canViewSentRequests: false,
          canViewReceivedRequests: false,
          canManageSquadVisibility: false,
          canUseMessaging: false,
          canSharePhoneNumber: false,
          canUsePayments: false,
          canCreatePaymentRequests: false,
          canConfirmAaTransfers: false,
          canPublishBookingDetails: false,
          canAccessSensitiveTravelDetails: false,
          canAccessRoommateVerification: false,
        },
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (input: {
      email: string;
      returnUrl?: string | null;
      intendedAction?: AuthIntendedAction | null;
    }) => {
      trackAuthEvent('auth_email_submitted', {
        intendedAction: input.intendedAction ?? 'none',
      });
      try {
        const result = await submitEmailLogin(input);
        setSession(result.session);
        trackAuthEvent('auth_email_login_completed', {
          intendedAction: result.intendedAction ?? 'none',
          hasReturnUrl: Boolean(result.returnUrl),
        });
        return result;
      } catch (err) {
        trackAuthEvent('auth_email_login_failed', {
          status:
            typeof err === 'object' && err && 'status' in err
              ? Number((err as { status: number }).status)
              : 0,
        });
        throw err;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await submitLogout();
    trackAuthEvent('auth_logout_completed');
    await refresh();
  }, [refresh]);

  return {
    session,
    loading,
    error,
    refresh,
    login,
    logout,
    signedIn: session?.signedIn === true,
    user: session?.signedIn ? session.user : null,
    capabilities: session?.capabilities,
  };
}
