import { notFound } from 'next/navigation';
import { PersonalityTestExperience } from '../../../components/personality-test/PersonalityTestExperience';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../../../lib/i18n';

type PersonalityTestPageProps = { params: Promise<{ locale: string }> };

export default async function PersonalityTestPage({ params }: PersonalityTestPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  return <PersonalityTestExperience locale={rawLocale as Locale} fallbackLocale={DEFAULT_LOCALE} />;
}
