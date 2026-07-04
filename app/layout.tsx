import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Outfit, DM_Sans } from 'next/font/google';
import { getMessages, normalizeLocale } from '../lib/i18n';
import { getSiteUrl } from '../lib/site';
import { buildSocialMetadata } from '../lib/seo';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  adjustFontFallback: true,
  preload: true,
  weight: ['400', '500', '600', '700'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  adjustFontFallback: true,
  preload: true,
  weight: ['400', '500', '600', '700'],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Raven | AI Festival Companion',
    template: '%s | Raven',
  },
  description:
    'Your AI festival companion. Discover festivals, read lineups, and plan the trip in one conversation.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  ...buildSocialMetadata({
    title: 'Raven | AI Festival Companion',
    description: 'Less planning. More floor time.',
    url: siteUrl,
    locale: 'en',
  }),
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const requestHeaders = await headers();
  const locale = normalizeLocale(requestHeaders.get('x-sync-locale') ?? undefined);
  const t = getMessages(locale);

  return (
    <html lang={t.htmlLang} className={`${outfit.variable} ${dmSans.variable}`}>
      <body>
        <div className="ambient-bg" aria-hidden="true">
          <div className="ambient-bg__orb ambient-bg__orb--purple" />
          <div className="ambient-bg__orb ambient-bg__orb--blue" />
          <div className="ambient-bg__grid" />
        </div>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
