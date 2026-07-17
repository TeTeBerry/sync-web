import { notFound, permanentRedirect } from 'next/navigation';
import { isLocale } from '../../../lib/i18n';

export const metadata = { title: 'Settings | Raven' };

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  permanentRedirect(`/${locale}/profile`);
}
