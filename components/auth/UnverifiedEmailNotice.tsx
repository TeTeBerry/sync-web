'use client';

type UnverifiedEmailNoticeProps = {
  signedIn: boolean;
  emailVerified: boolean;
  className?: string;
};

/**
 * Honest, non-alarming notice that the session is signed in but email-unverified.
 * Never use "verified traveler" / "trusted member" language here.
 */
export function UnverifiedEmailNotice({
  signedIn,
  emailVerified,
  className,
}: UnverifiedEmailNoticeProps) {
  if (!signedIn || emailVerified) return null;

  return (
    <p
      className={`auth-unverified-notice${className ? ` ${className}` : ''}`}
      role="status"
    >
      You’re signed in. Your email isn’t verified yet — verification will be required
      before messaging and booking features.
    </p>
  );
}
