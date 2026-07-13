'use client';

import { FormEvent, useState } from 'react';
import { isValidEmail } from '../../lib/auth/email';
import { isTempEmailOnlyAuthEnabled } from '../../lib/auth/config';
import { getMessages, type Locale, type Messages } from '../../lib/i18n';

type EmailLoginFormProps = {
  locale: Locale;
  onSubmit: (email: string) => Promise<void>;
  disabled?: boolean;
  unavailable?: boolean;
};

type AuthErrorCode = keyof Messages['auth']['errors'];

function resolveAuthErrorMessage(err: unknown, copy: Messages['auth']): string {
  const code =
    typeof err === 'object' && err != null && 'code' in err
      ? String((err as { code?: string }).code)
      : undefined;

  if (code && code in copy.errors) {
    return copy.errors[code as AuthErrorCode];
  }

  return copy.errors.failed;
}

/**
 * Temporary email-only sign-in form.
 * Does not claim email ownership / verification.
 */
export function EmailLoginForm({
  locale,
  onSubmit,
  disabled = false,
  unavailable = !isTempEmailOnlyAuthEnabled(),
}: EmailLoginFormProps) {
  const copy = getMessages(locale).auth;
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (unavailable) {
      setError(copy.unavailable);
      return;
    }

    if (!isValidEmail(email)) {
      setError(copy.invalidEmail);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(email.trim());
      setSuccess(copy.success);
    } catch (err) {
      setError(resolveAuthErrorMessage(err, copy));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-email-form" onSubmit={handleSubmit} noValidate>
      {unavailable ? (
        <p className="auth-email-form__notice" role="status">
          {copy.unavailable}
        </p>
      ) : null}
      <label className="auth-email-form__label" htmlFor="raven-email-login">
        {copy.emailLabel}
      </label>
      <input
        id="raven-email-login"
        className="field-input auth-email-form__input"
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        placeholder={copy.emailPlaceholder}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={disabled || submitting}
        required
      />

      {error ? (
        <p className="auth-email-form__error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="auth-email-form__success" role="status">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        className="button auth-email-form__submit"
        disabled={disabled || submitting}
      >
        {submitting ? copy.submitting : copy.submit}
      </button>

      <p className="auth-email-form__footer">{copy.footer}</p>
    </form>
  );
}
