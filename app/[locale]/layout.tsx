import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AudioWaveform } from 'lucide-react';
import {
  getMessages,
  isLocale,
  localizedPath,
  type Locale,
} from '../../lib/i18n';

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return [{ locale: 'zh' }, { locale: 'en' }];
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const nextLocale: Locale = locale === 'zh' ? 'en' : 'zh';

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="brand" href={localizedPath(locale)} aria-label="SYNC home">
            <AudioWaveform className="brand__icon" size={28} strokeWidth={2.5} color="#4cc9f0" />
            <span>SYNC</span>
          </Link>
          <nav className="site-nav" aria-label="Main navigation">
            <Link href={localizedPath(locale, '/events')}>{t.nav.events}</Link>
            <Link href={localizedPath(locale, '/waitlist')}>{t.nav.waitlist}</Link>
            <Link href={localizedPath(nextLocale)} hrefLang={nextLocale}>
              {t.nav.language}
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="footer">
        <div className="container">{t.footer}</div>
      </footer>
    </div>
  );
}
