import { notFound } from 'next/navigation';
import { AccountSettings } from '../../../components/auth/AccountSettings';
import { isLocale } from '../../../lib/i18n';
import { listActivities } from '../../../lib/api';

export const metadata = { title: 'Profile | Raven' };

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const activities = await listActivities();
  return <AccountSettings locale={locale} activities={activities} view="profile" />;
}
