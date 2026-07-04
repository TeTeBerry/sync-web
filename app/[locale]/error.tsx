'use client';

import { useParams } from 'next/navigation';
import { PageErrorState } from '../../components/states/PageErrorState';
import { isLocale, type Locale } from '../../lib/i18n';

type LocaleErrorProps = {
  reset: () => void;
};

export default function LocaleError({ reset }: LocaleErrorProps) {
  const params = useParams();
  const rawLocale = typeof params.locale === 'string' ? params.locale : 'zh';
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'zh';

  return <PageErrorState locale={locale} reset={reset} />;
}
