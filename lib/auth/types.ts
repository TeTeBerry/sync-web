export type RavenAuthUser = {
  id: string;
  email: string;
  emailNormalized: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type RavenAuthSession = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
};

export type PublicAuthSession = {
  signedIn: true;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    emailVerifiedAt: string | null;
  };
  capabilities: AuthCapabilities;
};

export type PublicAuthSessionResponse =
  | PublicAuthSession
  | { signedIn: false; user: null; capabilities: AuthCapabilities };

export type AuthCapabilities = {
  canCreateSquadProfile: boolean;
  canEditSquadProfile: boolean;
  canBrowseMatches: boolean;
  canSendConnectionRequest: boolean;
  canViewSentRequests: boolean;
  canViewReceivedRequests: boolean;
  canManageSquadVisibility: boolean;
  canUseMessaging: boolean;
  canSharePhoneNumber: boolean;
  canUsePayments: boolean;
  canCreatePaymentRequests: boolean;
  canConfirmAaTransfers: boolean;
  canPublishBookingDetails: boolean;
  canAccessSensitiveTravelDetails: boolean;
  canAccessRoommateVerification: boolean;
};

export type AuthIntendedAction =
  | 'create_squad_profile'
  | 'edit_squad_profile'
  | 'send_connection_request'
  | 'view_sent_requests'
  | 'view_received_requests'
  | 'manage_squad_visibility'
  | 'logout';

export type EmailLoginResult = {
  ok: true;
  message: string;
  session: PublicAuthSession;
  returnUrl: string | null;
  intendedAction: AuthIntendedAction | null;
};
