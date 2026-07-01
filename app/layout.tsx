import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/next';
import { getMessages, normalizeLocale } from '../lib/i18n';
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
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.png', type: 'image/png', sizes: '180x180' },
    ],
  },
  openGraph: {
    title: 'SYNC | 电音节资讯与公开组队招募',
    description: '查活动、看阵容、找公开组队招募。',
    type: 'website',
    url: siteUrl,
  },
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const requestHeaders = await headers();
  const locale = normalizeLocale(requestHeaders.get('x-sync-locale') ?? undefined);
  const t = getMessages(locale);

  return (
    <html lang={t.htmlLang}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
