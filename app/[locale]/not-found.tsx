import { EventUnavailableState } from '../../components/states/EventUnavailableState';
import { isLocale, resolveLoadingLocale, type Locale } from '../../lib/i18n';

type NotFoundPageProps = {
  params?: Promise<{ locale?: string }>;
};

export default async function LocaleNotFound({ params }: NotFoundPageProps = {}) {
  const locale = await resolveLoadingLocale(params);
  const eventLocale: Locale = isLocale(locale) ? locale : 'en';

  return <EventUnavailableState locale={eventLocale} />;
}
