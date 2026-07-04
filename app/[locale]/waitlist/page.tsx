import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WaitlistForm } from './WaitlistForm';
import {
  getMessages,
  isLocale,
  localizedPath,
  type Locale,
} from '../../../lib/i18n';
import {
  absoluteAlternateLanguages,
  absoluteLocalizedUrl,
  buildSocialMetadata,
} from '../../../lib/seo';

type WaitlistPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ event?: string; note?: string; prompt?: string }>;
};

export async function generateMetadata({ params }: WaitlistPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : 'zh';
  const t = getMessages(locale);
  const url = absoluteLocalizedUrl(locale, '/waitlist');

  return {
    title: {
      absolute: t.waitlist.seoTitle,
    },
    description: t.waitlist.description,
    alternates: {
      canonical: url,
      languages: absoluteAlternateLanguages('/waitlist'),
    },
    robots: {
      index: true,
      follow: true,
    },
    ...buildSocialMetadata({
      title: t.waitlist.seoTitle,
      description: t.waitlist.description,
      url,
      locale,
    }),
  };
}

export default async function WaitlistPage({ params: routeParams, searchParams }: WaitlistPageProps) {
  const { locale: rawLocale } = await routeParams;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const queryParams = (await searchParams) ?? {};
  const initialNote = queryParams.note?.trim() || queryParams.prompt?.trim();

  return (
    <WaitlistForm
      initialEvent={queryParams.event?.trim()}
      initialNote={initialNote}
      locale={locale}
    />
  );
}
