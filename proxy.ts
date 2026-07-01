import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, isLocale, LOCALES } from './lib/i18n';

function detectLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language') ?? '';
  const first = acceptLanguage.split(',')[0]?.trim().toLowerCase() ?? '';

  if (first.startsWith('zh')) return 'zh';
  if (first.startsWith('en')) return 'en';

  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal paths and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(ico|png|jpg|svg|css|js|txt|xml)$/)
  ) {
    return NextResponse.next();
  }

  // Already has a locale prefix — inject header and continue
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  const hasLocale = isLocale(firstSegment);

  if (hasLocale) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-sync-locale', firstSegment);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // No locale prefix — redirect to detected locale
  const locale = detectLocale(request);
  const newUrl = new URL(`/${locale}${pathname}`, request.url);
  newUrl.search = request.nextUrl.search;

  return NextResponse.redirect(newUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
