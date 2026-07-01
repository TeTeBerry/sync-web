import type { Metadata } from 'next';
import Link from 'next/link';
import { AudioWaveform } from 'lucide-react';
import { getSiteUrl } from '../lib/site';
import './globals.css';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SYNC | 电音节资讯与公开组队招募',
    template: '%s | SYNC',
  },
  description: '发现电音节、查看阵容与公开组队招募，先用 Web MVP 加入 SYNC 内测。',
  openGraph: {
    title: 'SYNC | 电音节资讯与公开组队招募',
    description: '查活动、看阵容、找公开组队招募。',
    type: 'website',
    url: siteUrl,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <div className="site-header__inner">
              <Link className="brand" href="/" aria-label="SYNC home">
                <AudioWaveform className="brand__icon" size={28} strokeWidth={2.5} color="#4cc9f0" />
                <span>SYNC</span>
              </Link>
              <nav className="site-nav" aria-label="Main navigation">
                <Link href="/events">活动</Link>
                <Link href="/waitlist">加入内测</Link>
              </nav>
            </div>
          </header>
          {children}
          <footer className="footer">
            <div className="container">
              SYNC 提供免费的活动资讯与公开招募发现工具，不售票，不收取服务费。
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
