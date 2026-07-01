import { redirect } from 'next/navigation';
import { localizedPath, DEFAULT_LOCALE } from '../../lib/i18n';

export default function LegacyEventsPage() {
  redirect(localizedPath(DEFAULT_LOCALE, '/events'));
}
