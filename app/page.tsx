import { redirect } from 'next/navigation';
import { localizedPath, DEFAULT_LOCALE } from '../lib/i18n';

export default function RootPage() {
  redirect(localizedPath(DEFAULT_LOCALE));
}
