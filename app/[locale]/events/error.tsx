'use client';

import { useParams } from 'next/navigation';
import { PageErrorState } from '../../../components/states/PageErrorState';
import { isLocale, DEFAULT_LOCALE, type Locale } from '../../../lib/i18n';

type EventsErrorProps = {
  reset: () => void;
};

export default function EventsError({ reset }: EventsErrorProps) {
  const params = useParams();
  const rawLocale = typeof params.locale === 'string' ? params.locale : DEFAULT_LOCALE;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return <PageErrorState locale={locale} reset={reset} />;
}
