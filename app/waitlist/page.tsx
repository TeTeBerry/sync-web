'use client';

import { useState } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

type WaitlistPageProps = {
  searchParams?: Promise<{ event?: string }>;
};

export default function WaitlistPage() {
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
    };

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '发送失败');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <main>
        <section className="section">
          <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="eyebrow">Done</div>
            <h2 style={{ marginTop: 12 }}>已收到，感谢加入内测</h2>
            <p className="lead" style={{ marginTop: 16 }}>
              我们会通过你留下的联系方式通知你。
            </p>
            <div className="hero__actions" style={{ justifyContent: 'center', marginTop: 24 }}>
              <Link className="button" href="/events">
                继续看活动
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
            <div className="eyebrow">Waitlist</div>
            <h1 style={{ marginTop: 12 }}>加入 SYNC 内测</h1>
            <p className="lead" style={{ marginTop: 16 }}>
              现在先收集第一批真实需求：你想查哪场节、想不想找组队、愿不愿意订阅阵容更新。
            </p>
            <div className="hero__actions">
              <a className="button" href="mailto:czy250714751cn@sina.cn?subject=加入 SYNC 内测&body=微信/邮箱：%0A想看的活动：%0A想解决的问题：">
                邮件加入
              </a>
              <Link className="button secondary" href="/events">
                继续看活动
              </Link>
            </div>
          </div>

          <section className="waitlist-panel">
            <div className="eyebrow">What We Need</div>

            <form className="waitlist-form" onSubmit={handleSubmit}>
              <input name="email" placeholder="微信 / 邮箱" />
              <input name="event" placeholder="你最关注哪场活动" />
              <textarea name="note" placeholder="你更想查节、看阵容，还是找组队？" />
              {error && <p style={{ color: 'var(--destructive)', fontSize: 'var(--type-small)' }}>{error}</p>}
              <button className="button" type="submit" disabled={sending}>
                {sending ? '发送中...' : '发送'}
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
