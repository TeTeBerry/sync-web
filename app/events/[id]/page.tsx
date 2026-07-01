import { redirect } from 'next/navigation';
import { localizedPath, DEFAULT_LOCALE } from '../../../lib/i18n';

type LegacyEventDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacyEventDetailPage({ params }: LegacyEventDetailProps) {
  const { id } = await params;
  redirect(localizedPath(DEFAULT_LOCALE, `/events/${id}`));
}
