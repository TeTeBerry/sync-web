/**
 * Temporary email-only auth for Raven MVP.
 * Ownership is not verified; emailVerifiedAt stays null until OTP/magic-link.
 */

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Trim, keep local-part casing for display, lowercase domain for storage. */
export function normalizeEmail(raw: string): {
  email: string;
  emailNormalized: string;
} {
  const trimmed = raw.trim();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) {
    return { email: trimmed, emailNormalized: trimmed.toLowerCase() };
  }
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  const email = `${local}@${domain}`;
  return {
    email,
    emailNormalized: `${local.toLowerCase()}@${domain}`,
  };
}

export function isValidEmail(raw: string): boolean {
  const { email } = normalizeEmail(raw);
  if (email.length > 254) return false;
  return EMAIL_PATTERN.test(email);
}
