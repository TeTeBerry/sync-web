'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { localizedPath, type Locale } from '../lib/i18n';

type SiteNavProps = {
  locale: Locale;
  nextLocale: Locale;
  labels: {
    howItWorks: string;
    festivals: string;
    waitlist: string;
    language: string;
    planCta: string;
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
  const homePath = localizedPath(locale);
  const howItWorksHref = `${homePath}#discovery-promise`;

  const links = [
    { href: howItWorksHref, label: labels.howItWorks, secondary: false },
    { href: localizedPath(locale, '/waitlist'), label: labels.waitlist, secondary: false },
    { href: localizedPath(locale, '/events'), label: labels.festivals, secondary: true },
    { href: localizedPath(nextLocale), label: labels.language, secondary: false },
  ];

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
        <Link className="button button--compact" href={localizedPath(locale, '/waitlist')}>
          {labels.planCta}
        </Link>
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
          <Link
            className="button"
            href={localizedPath(locale, '/waitlist')}
            onClick={() => setOpen(false)}
          >
            {labels.planCta}
          </Link>
        </nav>
      </div>
    </>
  );
}
