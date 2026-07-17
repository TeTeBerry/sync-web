import { notFound } from 'next/navigation';
import { SignInExperience } from '../../../../components/auth/SignInExperience';
import { isLocale } from '../../../../lib/i18n';

export const metadata = { title: 'Sign in | Raven' };

export default async function LocalizedSignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <SignInExperience />;
}
