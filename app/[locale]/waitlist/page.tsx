import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WaitlistForm } from './WaitlistForm';
import {
  alternateLanguages,
  getMessages,
  isLocale,
  localizedPath,
  type Locale,
} from '../../../lib/i18n';

type WaitlistPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ event?: string }>;
};

export async function generateMetadata({ params }: WaitlistPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : 'zh';
  const t = getMessages(locale);
  return {
    title: t.waitlist.title,
    description: t.waitlist.description,
    alternates: {
      canonical: localizedPath(locale, '/waitlist'),
      languages: alternateLanguages('/waitlist'),
    },
  };
}

export default async function WaitlistPage({ params: routeParams, searchParams }: WaitlistPageProps) {
  const { locale: rawLocale } = await routeParams;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const queryParams = (await searchParams) ?? {};
  return <WaitlistForm initialEvent={queryParams.event?.trim()} locale={locale} />;
}
