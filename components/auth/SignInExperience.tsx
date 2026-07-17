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
  default: {
    title: 'Save your festival journey',
    lead: 'Keep your schedule, plans and festival profile synced across devices.',
  },
};

function safeCallback(raw: string | null) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/';
  return raw;
}

export function SignInExperience() {
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState({ google: true });
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const intent = params.get('intent') === 'squad' ? 'squad' : params.get('intent') === 'profile' ? 'profile' : 'default';
  const copy = copyByIntent[intent];
  const callbackUrl = safeCallback(params.get('callbackUrl'));

  async function continueWithGoogle() {
    setError(null);
    if (!config.google) {
      setError('Google sign-in is not configured yet. Please contact the Raven team.');
      return;
    }
    try {
      const result = await signIn('google', { callbackUrl, redirect: false });
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
        if (value && typeof value.google === 'boolean') setConfig({ google: value.google });
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="raven-auth-scene">
      <section className="raven-auth-scene__light" aria-hidden />
      <div className="raven-auth-card">
        <Image src="/brand/rraven-logo.png" alt="Raven" width={88} height={88} priority />
        <p className="raven-auth-card__eyebrow">RAVEN</p>
        <h1>{copy.title}</h1>
        <p>{copy.lead}</p>
        <button className="raven-auth-card__google" type="button" onClick={() => void continueWithGoogle()}>
          <span aria-hidden>G</span> Continue with Google
        </button>
        {error ? <p className="raven-auth-card__error" role="alert">{error}</p> : null}
        <p className="raven-auth-card__legal">By continuing, you agree to Raven’s <Link href="/en/terms">Terms</Link> and acknowledge the <Link href="/en/privacy">Privacy Policy</Link>.</p>
      </div>
    </main>
  );
}
