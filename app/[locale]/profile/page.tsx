import { notFound, redirect } from 'next/navigation';
import { auth } from '../../../auth';
import { AccountSettings } from '../../../components/auth/AccountSettings';
import { isLocale, localizedPath } from '../../../lib/i18n';
import { listActivities } from '../../../lib/api';

export const metadata = { title: 'Profile | Raven' };

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const session = await auth();
  if (!session?.user?.id) {
    const profilePath = localizedPath(locale, '/profile');
    redirect(`${localizedPath(locale, '/auth/sign-in')}?intent=profile&callbackUrl=${encodeURIComponent(profilePath)}`);
  }

  const activities = await listActivities();
  return <AccountSettings locale={locale} activities={activities} view="profile" />;
}
