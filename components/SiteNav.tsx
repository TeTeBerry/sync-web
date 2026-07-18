'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { localizedPath, type Locale } from '../lib/i18n';
import { useAuthSession } from '../hooks/useAuthSession';

type SiteNavProps = {
  locale: Locale;
  nextLocale: Locale;
  labels: {
    howItWorks: string;
    festivals: string;
    language: string;
    profile: string;
    logout: string;
    logoutFailed: string;
    openMenu: string;
    closeMenu: string;
    mainNav: string;
    mobileNav: string;
  };
};

function isActive(pathname: string, href: string): boolean {
  if (href === localizedPath('zh') || href === localizedPath('en')) {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function SiteNav({ locale, nextLocale, labels }: SiteNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const auth = useAuthSession();
  const homePath = localizedPath(locale);
  const howItWorksHref = `${homePath}#discovery-promise`;

  const links = [
    { href: howItWorksHref, label: labels.howItWorks, secondary: false },
    { href: localizedPath(locale, '/events'), label: labels.festivals, secondary: true },
    { href: localizedPath(nextLocale), label: labels.language, secondary: false },
  ];
  const profileHref = localizedPath(locale, '/profile');

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(false);
    try {
      await auth.logout();
      window.location.replace(homePath);
    } catch {
      setLogoutError(true);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <div
        className={`site-nav__backdrop${open ? ' is-open' : ''}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />

      <nav className="site-nav site-nav--desktop" aria-label={labels.mainNav}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={[
              link.secondary ? 'site-nav__link--secondary' : undefined,
              isActive(pathname, link.href) ? 'is-active' : undefined,
            ]
              .filter(Boolean)
              .join(' ') || undefined}
            hrefLang={link.href.includes(`/${nextLocale}`) ? nextLocale : undefined}
          >
            {link.label}
          </Link>
        ))}
        {auth.signedIn ? (
          <div className="site-nav__profile-menu">
            <Link href={profileHref} className={`site-nav__profile${isActive(pathname, profileHref) ? ' is-active' : ''}`} aria-label={labels.profile}>
              <UserRound size={16} strokeWidth={1.8} aria-hidden />
              <span>{labels.profile}</span>
            </Link>
            <button className="site-nav__desktop-logout" type="button" onClick={() => void logout()} disabled={loggingOut}>
              <LogOut size={15} strokeWidth={1.8} aria-hidden />
              <span>{loggingOut ? '…' : labels.logout}</span>
            </button>
            {logoutError ? <p className="site-nav__logout-feedback" role="alert">{labels.logoutFailed}</p> : null}
          </div>
        ) : null}
      </nav>

      <button
        type="button"
        className="site-nav__toggle"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? labels.closeMenu : labels.openMenu}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
      </button>

      <div className={`site-nav__drawer ${open ? 'is-open' : ''}`} id="mobile-nav">
        <nav className="site-nav site-nav--mobile" aria-label={labels.mobileNav}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={[
                link.secondary ? 'site-nav__link--secondary' : undefined,
                isActive(pathname, link.href) ? 'is-active' : undefined,
              ]
                .filter(Boolean)
                .join(' ') || undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {auth.signedIn ? (
            <>
              <Link href={profileHref} className="site-nav__profile" onClick={() => setOpen(false)}>
                <UserRound size={17} strokeWidth={1.8} aria-hidden />
                <span>{labels.profile}</span>
              </Link>
              <button className="site-nav__logout" type="button" onClick={() => void logout()} disabled={loggingOut}>
                <LogOut size={17} strokeWidth={1.8} aria-hidden />
                <span>{loggingOut ? '…' : labels.logout}</span>
              </button>
              {logoutError ? <p className="site-nav__logout-feedback" role="alert">{labels.logoutFailed}</p> : null}
            </>
          ) : null}
        </nav>
      </div>
    </>
  );
}
