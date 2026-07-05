import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Outfit, DM_Sans } from 'next/font/google';
import { DEFAULT_LOCALE, getMessages, normalizeLocale } from '../lib/i18n';
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
const defaultMessages = getMessages(DEFAULT_LOCALE);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultMessages.siteTitle,
    template: '%s | Raven',
  },
  description: defaultMessages.siteDescription,
  ...buildSocialMetadata({
    title: defaultMessages.siteTitle,
    description: defaultMessages.ogDescription,
    url: siteUrl,
    locale: DEFAULT_LOCALE,
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
    <html lang={t.htmlLang} className={`${outfit.variable} ${dmSans.variable}`} data-scroll-behavior="smooth">
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
