'use client';

import { useParams } from 'next/navigation';
import { PageErrorState } from '../../../components/states/PageErrorState';
import { isLocale, type Locale } from '../../../lib/i18n';

type WaitlistErrorProps = {
  reset: () => void;
};

export default function WaitlistError({ reset }: WaitlistErrorProps) {
  const params = useParams();
  const rawLocale = typeof params.locale === 'string' ? params.locale : 'zh';
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'zh';

  return <PageErrorState locale={locale} reset={reset} />;
}
