'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

const copyByIntent: Record<string, { title: string; lead: string }> = {
  squad: {
    title: 'Join the festival community',
    lead: 'Create your festival profile and connect with people attending the same event.',
  },
  profile: {
    title: 'Shape your Raven profile',
    lead: 'Keep your music preferences and festival identity with you across devices.',
  },
  schedule: {
    title: 'Save your festival schedule',
    lead: 'Keep every set you chose close, revisit it on any device, and adjust when the lineup changes.',
  },
  journey: {
    title: 'Save your festival journey',
    lead: 'Keep this plan with you across devices, ready whenever you want to pick up the thread.',
  },
  default: {
    title: 'Save your festival journey',
    lead: 'Keep your schedule, plans and festival profile synced across devices.',
  },
};

function safeCallback(raw: string | null) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/';
  return raw;
}

export function SignInExperience({
  modal = false,
  intent: providedIntent,
  callbackUrl: providedCallbackUrl,
  onClose,
}: {
  modal?: boolean;
  intent?: string;
  callbackUrl?: string;
  onClose?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState({ google: true, mock: false });
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const intent = providedIntent ?? (params.get('intent') === 'squad' ? 'squad' : params.get('intent') === 'profile' ? 'profile' : 'default');
  const copy = copyByIntent[intent] ?? copyByIntent.default;
  const callbackUrl = safeCallback(providedCallbackUrl ?? params.get('callbackUrl'));

  async function continueWithGoogle() {
    setError(null);
    if (!config.google && !config.mock) {
      setError('Google sign-in is not configured yet. Please contact the Raven team.');
      return;
    }
    try {
      const result = await signIn(config.mock ? 'dev-mock' : 'google', { callbackUrl, redirect: false });
      if (result?.error) setError('Google sign-in could not be started. Please try again.');
      else if (result?.url) window.location.assign(result.url);
    } catch {
      setError('Google sign-in could not be started. Please try again.');
    }
  }

  useEffect(() => {
    void fetch('/api/auth/config', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => {
        if (value && typeof value.google === 'boolean') {
          setConfig({ google: value.google, mock: value.mock === true });
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className={`raven-auth-scene${modal ? ' raven-auth-scene--modal' : ''}`}>
      <section className="raven-auth-scene__light" aria-hidden />
      <div className="raven-auth-card">
        {modal && onClose ? <button className="raven-auth-card__close" type="button" aria-label="Close sign in" onClick={onClose}>×</button> : null}
        <div className="raven-auth-card__brand">
          <Image src="/brand/rraven-logo.png" alt="Raven" width={152} height={72} priority />
        </div>
        <p className="raven-auth-card__eyebrow">{intent === 'squad' ? 'FESTIVAL COMMUNITY' : 'YOUR FESTIVAL JOURNEY'}</p>
        <h1>{copy.title}</h1>
        <p className="raven-auth-card__lead">{copy.lead}</p>
        <button className="raven-auth-card__google" type="button" onClick={() => void continueWithGoogle()}>
          <span aria-hidden>G</span> Continue with Google <span aria-hidden className="raven-auth-card__arrow">↗</span>
        </button>
        {error ? <p className="raven-auth-card__error" role="alert">{error}</p> : null}
        <p className="raven-auth-card__legal">By continuing, you agree to Raven’s <Link href="/en/terms" onClick={onClose}>Terms</Link> and acknowledge the <Link href="/en/privacy" onClick={onClose}>Privacy Policy</Link>.</p>
      </div>
    </main>
  );
}
