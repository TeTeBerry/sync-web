import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrandLogo } from '../../components/BrandLogo';
import { ScrollRevealInit } from '../../components/ScrollRevealInit';
import { SiteNav } from '../../components/SiteNav';
import {
  getMessages,
  isLocale,
  localizedPath,
  type Locale,
} from '../../lib/i18n';
import { getWaitlistCount, getWaitlistSocialProofMin } from '../../lib/waitlist';

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'zh' }];
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const nextLocale: Locale = locale === 'zh' ? 'en' : 'zh';
  const waitlistCount = await getWaitlistCount();
  const waitlistMin = getWaitlistSocialProofMin();
  const showWaitlistStat =
    waitlistCount !== null && waitlistCount >= waitlistMin;
  const formattedWaitlistCount =
    waitlistCount !== null
      ? waitlistCount.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')
      : '';

  return (
    <div className="site-shell">
      <ScrollRevealInit />
      <a className="skip-link" href="#main-content">
        {t.ui.skipToContent}
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="brand" href={localizedPath(locale)} aria-label={t.nav.brandHome}>
            <BrandLogo className="brand__logo" height={28} />
          </Link>
          <SiteNav
            locale={locale}
            nextLocale={nextLocale}
            labels={{
              howItWorks: t.nav.howItWorks,
              festivals: t.nav.festivals,
              waitlist: t.nav.waitlist,
              language: t.nav.language,
              planCta: t.nav.planCta,
              openMenu: t.nav.openMenu,
              closeMenu: t.nav.closeMenu,
              mainNav: t.nav.mainNav,
              mobileNav: t.nav.mobileNav,
            }}
          />
        </div>
      </header>
      <div id="main-content">{children}</div>
      <footer className="footer">
        <div className="container footer__inner">
          <div className="footer__brand">
            <BrandLogo className="brand__logo brand__logo--footer" height={22} />
          </div>
          <p>{t.footer.tagline}</p>
          {showWaitlistStat ? (
            <p className="footer__stat">
              {t.footer.waitlistStat.replace('{count}', formattedWaitlistCount)}
            </p>
          ) : null}
          <nav className="footer__links" aria-label={t.nav.footerNav}>
            <Link href={`${localizedPath(locale)}#discovery-promise`}>{t.nav.howItWorks}</Link>
            <Link href={localizedPath(locale, '/events')}>{t.nav.festivals}</Link>
            <Link href={localizedPath(locale, '/waitlist')}>{t.nav.waitlist}</Link>
            <Link href={localizedPath(locale, '/privacy')}>{t.waitlist.privacyPolicy}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
