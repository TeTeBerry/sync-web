'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAuthSession, submitLogout } from '../lib/auth/client';
import { trackAuthEvent } from '../lib/auth/analytics';
import type { PublicAuthSessionResponse } from '../lib/auth/types';

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
    logout,
    signedIn: session?.signedIn === true,
    user: session?.signedIn ? session.user : null,
    capabilities: session?.capabilities,
  };
}
