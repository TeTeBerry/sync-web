'use client';

import { FormEvent, useState } from 'react';
import { isValidEmail } from '../../lib/auth/email';
import { isTempEmailOnlyAuthEnabled } from '../../lib/auth/config';

type EmailLoginFormProps = {
  onSubmit: (email: string) => Promise<void>;
  disabled?: boolean;
  unavailable?: boolean;
};

/**
 * Temporary email-only sign-in form.
 * Does not claim email ownership / verification.
 */
export function EmailLoginForm({
  onSubmit,
  disabled = false,
  unavailable = !isTempEmailOnlyAuthEnabled(),
}: EmailLoginFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (unavailable) {
      setError('Email sign-in is temporarily unavailable. Please try again later.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(email.trim());
      setSuccess("You're signed in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (unavailable) {
    return (
      <div className="auth-email-form auth-email-form--unavailable" role="status">
        <p className="auth-email-form__notice">
          Email sign-in is temporarily unavailable. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <form className="auth-email-form" onSubmit={handleSubmit} noValidate>
      <label className="auth-email-form__label" htmlFor="raven-email-login">
        Email
      </label>
      <input
        id="raven-email-login"
        className="field-input auth-email-form__input"
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
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
        {submitting ? 'Continuing…' : 'Continue'}
      </button>

      <p className="auth-email-form__footer">
        For this early access version, Raven uses email-only sign-in. Email verification
        will be added before public messaging and booking features.
      </p>
    </form>
  );
}
