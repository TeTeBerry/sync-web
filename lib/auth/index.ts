export { isValidEmail, normalizeEmail } from './email';
export {
  buildAuthCapabilities,
  capabilitiesForAnonymous,
  hasCapability,
  type CapabilityKey,
} from './capabilities';
export { getUnverifiedAuthLimits } from './limits';
export {
  isTempEmailOnlyAuthEnabled,
  TEMP_EMAIL_AUTH_SUCCESS_MESSAGE,
  TEMP_EMAIL_AUTH_UNAVAILABLE_MESSAGE,
} from './config';
export { sanitizeReturnUrl, parseIntendedAction } from './return-url';
export {
  consumeAuthRateLimit,
  getAuthLoginRateLimits,
  resetAuthRateLimitMemory,
} from './rate-limit';
export {
  loginWithEmail,
  logoutSession,
  getSessionFromCookie,
  AuthServiceError,
} from './service';
export {
  trackAuthEvent,
  assertNoEmailInAnalyticsProps,
} from './analytics';
export {
  fetchAuthSession,
  submitEmailLogin,
  submitLogout,
  ensureAuthCsrf,
} from './client';
export {
  recordConnectionRequestServer,
  recordPrivateProfileViewServer,
  isPrivateProfileDetail,
} from './client-limits';
export { consumeAuthUsage, resetAuthUsageMemory } from './usage-limits';
export {
  assertSameOriginMutation,
  requireCsrf,
  rejectUnsafeMutation,
} from './http';
export type {
  AuthCapabilities,
  AuthIntendedAction,
  EmailLoginResult,
  PublicAuthSession,
  PublicAuthSessionResponse,
  RavenAuthUser,
} from './types';
