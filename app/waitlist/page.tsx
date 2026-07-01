import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '加入内测',
  description: '订阅 SYNC Web MVP 的活动更新与公开组队内测。',
};

type WaitlistPageProps = {
  searchParams?: Promise<{ event?: string }>;
};

export default async function WaitlistPage({ searchParams }: WaitlistPageProps) {
  const params = (await searchParams) ?? {};
  const email = process.env.NEXT_PUBLIC_WAITLIST_EMAIL ?? 'hello@example.com';
  const subject = encodeURIComponent('加入 SYNC Web MVP 内测');
  const body = encodeURIComponent(
    `我想加入 SYNC 内测${params.event ? `，关注活动 ID：${params.event}` : ''}。\n\n微信/邮箱：\n想看的活动：\n想解决的问题：`,
  );

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
              <a className="button" href={`mailto:${email}?subject=${subject}&body=${body}`}>
                邮件加入
              </a>
              <Link className="button secondary" href="/events">
                继续看活动
              </Link>
            </div>
          </div>

          <section className="waitlist-panel">
            <div className="eyebrow">What We Need</div>
            <h2>第一版只问三个问题</h2>
            <form className="waitlist-form" action={`mailto:${email}`} method="get">
              <input name="subject" type="hidden" value="加入 SYNC Web MVP 内测" />
              <input name="body" placeholder="微信 / 邮箱" />
              <input name="body" placeholder="你最关注哪场活动" />
              <textarea name="body" placeholder="你更想查节、看阵容，还是找组队？" />
              <button className="button" type="submit">
                发送
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
