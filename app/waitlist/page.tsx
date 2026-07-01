import { redirect } from 'next/navigation';
import { localizedPath, DEFAULT_LOCALE } from '../../lib/i18n';

type LegacyWaitlistProps = {
  searchParams?: Promise<{ event?: string }>;
};

export default async function LegacyWaitlistPage({ searchParams }: LegacyWaitlistProps) {
  const params = (await searchParams) ?? {};
  const event = params.event ? `?event=${encodeURIComponent(params.event)}` : '';
  redirect(`${localizedPath(DEFAULT_LOCALE, '/waitlist')}${event}`);
}
