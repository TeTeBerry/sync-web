import type { AuthCapabilities } from './types';

/**
 * Centralized Raven capability checks.
 * Prefer these helpers over raw emailVerifiedAt checks in UI or Squad logic.
 */
export function buildAuthCapabilities(
  emailVerifiedAt: string | Date | null | undefined,
): AuthCapabilities {
  const verified = emailVerifiedAt != null;
  return {
    // Unverified MVP: allowed
    canCreateSquadProfile: true,
    canEditSquadProfile: true,
    canBrowseMatches: true,
    canSendConnectionRequest: true,
    canViewSentRequests: true,
    canViewReceivedRequests: true,
    canManageSquadVisibility: true,
    // Require verification later
    canUseMessaging: verified,
    canSharePhoneNumber: verified,
    canUsePayments: verified,
    canCreatePaymentRequests: verified,
    canConfirmAaTransfers: verified,
    canPublishBookingDetails: verified,
    canAccessSensitiveTravelDetails: verified,
    canAccessRoommateVerification: verified,
  };
}

export function capabilitiesForAnonymous(): AuthCapabilities {
  return {
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
  };
}

export type CapabilityKey = keyof AuthCapabilities;

export function hasCapability(
  caps: AuthCapabilities,
  key: CapabilityKey,
): boolean {
  return caps[key] === true;
}
