'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureAuthCsrf, submitLogout } from '../../lib/auth/client';

export function AccountSettings() {
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  async function deleteAccount() {
    if (confirmation !== 'DELETE') return;
    setDeleting(true); setError(null);
    try {
      const csrf = await ensureAuthCsrf();
      const response = await fetch('/api/me/account', { method: 'DELETE', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify({ confirmation }) });
      if (!response.ok) throw new Error();
      await submitLogout();
      router.replace('/');
    } catch { setError('Your account could not be deleted. Please try again or contact [Contact email].'); }
    finally { setDeleting(false); }
  }
  return <main className="raven-settings"><section><p className="raven-settings__eyebrow">RAVEN / SETTINGS</p><h1>Your Raven, held lightly.</h1><p>Account and privacy controls for the journey you choose to keep.</p><div className="raven-settings__block"><h2>Account</h2><p>Sign-in identity is used only to keep your saved festival journey available across devices.</p></div><div className="raven-settings__block"><h2>Privacy</h2><p>Home airport, city and music preferences are optional. Your starting point stays in a plan unless you explicitly choose to remember it.</p></div><div className="raven-settings__danger"><h2>Delete account</h2><p>Delete your Raven account?</p><p>This permanently removes your profile, saved plans, schedules, favorites, and festival squad data. This action cannot be undone.</p><label htmlFor="delete-confirm">Type DELETE to confirm</label><input id="delete-confirm" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /><button type="button" onClick={() => void deleteAccount()} disabled={confirmation !== 'DELETE' || deleting}>{deleting ? 'Deleting…' : 'Delete account'}</button>{error ? <p role="alert">{error}</p> : null}</div></section></main>;
}
