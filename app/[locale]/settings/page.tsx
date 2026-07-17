import { notFound } from 'next/navigation';
import { AccountSettings } from '../../../components/auth/AccountSettings';
import { isLocale } from '../../../lib/i18n';

export const metadata = { title: 'Settings | Raven' };

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <AccountSettings />;
}
