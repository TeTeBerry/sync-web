'use client';

import { getMessages, type Locale } from '../../lib/i18n';

type UnverifiedEmailNoticeProps = {
  locale: Locale;
  signedIn: boolean;
  emailVerified: boolean;
  className?: string;
};

/**
 * Honest, non-alarming notice that the session is signed in but email-unverified.
 * Never use "verified traveler" / "trusted member" language here.
 */
export function UnverifiedEmailNotice({
  locale,
  signedIn,
  emailVerified,
  className,
}: UnverifiedEmailNoticeProps) {
  if (!signedIn || emailVerified) return null;

  const copy = getMessages(locale).auth;

  return (
    <p
      className={`auth-unverified-notice${className ? ` ${className}` : ''}`}
      role="status"
    >
      {copy.unverifiedNotice}
    </p>
  );
}
