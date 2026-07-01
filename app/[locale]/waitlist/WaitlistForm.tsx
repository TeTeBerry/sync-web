'use client';

import { useState } from 'react';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import {
  getMessages,
  localizedPath,
  type Locale,
} from '../../../lib/i18n';

type WaitlistFormProps = {
  initialEvent?: string;
  locale: Locale;
};

export function WaitlistForm({ initialEvent = '', locale }: WaitlistFormProps) {
  const t = getMessages(locale);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSending(true);

    const form = new FormData(e.currentTarget);
    const body = {
      email: (form.get('email') as string)?.trim() || '',
      event: (form.get('event') as string)?.trim() || '',
      note: (form.get('note') as string)?.trim() || '',
      sourcePath: `${window.location.pathname}${window.location.search}`,
      locale,
    };

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '发送失败');
      track('waitlist_submit_success', {
        event: body.event || 'none',
        sourcePath: body.sourcePath,
        locale,
      });
      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.waitlist.errorFallback;
      track('waitlist_submit_error', {
        event: body.event || 'none',
        sourcePath: body.sourcePath,
        reason: message,
        locale,
      });
      setError(message);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <main>
        <section className="section">
          <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="eyebrow">{t.waitlist.doneEyebrow}</div>
            <h2 style={{ marginTop: 12 }}>{t.waitlist.doneTitle}</h2>
            <p className="lead" style={{ marginTop: 16 }}>
              {t.waitlist.doneLead}
            </p>
            <div className="hero__actions" style={{ justifyContent: 'center', marginTop: 24 }}>
              <Link className="button" href={localizedPath(locale, '/events')}>
                {t.waitlist.eventsCta}
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="section">
        <div className="container detail-layout">
          <div>
            <div className="eyebrow">{t.waitlist.eyebrow}</div>
            <h1 style={{ marginTop: 12 }}>{t.waitlist.heading}</h1>
            <p className="lead" style={{ marginTop: 16 }}>
              {t.waitlist.lead}
            </p>
            <div className="hero__actions">
              <a className="button" href="mailto:czy250714751cn@sina.cn?subject=加入 SYNC 内测&body=微信/邮箱：%0A想看的活动：%0A想解决的问题：">
                {t.waitlist.emailCta}
              </a>
              <Link className="button secondary" href={localizedPath(locale, '/events')}>
                {t.waitlist.eventsCta}
              </Link>
            </div>
          </div>

          <section className="waitlist-panel">
            <div className="eyebrow">{t.waitlist.formEyebrow}</div>

            <form className="waitlist-form" onSubmit={handleSubmit}>
              <input name="email" placeholder={t.waitlist.contactPlaceholder} autoComplete="email" />
              <input name="event" placeholder={t.waitlist.eventPlaceholder} defaultValue={initialEvent} />
              <textarea name="note" placeholder={t.waitlist.notePlaceholder} />
              {error && <p style={{ color: 'var(--destructive)', fontSize: 'var(--type-small)' }}>{error}</p>}
              <button className="button" type="submit" disabled={sending}>
                {sending ? t.waitlist.sending : t.waitlist.submit}
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
