import { permanentRedirect } from 'next/navigation';
import { getActivity } from '../../../lib/api';
import { eventPath } from '../../../lib/event-slug';
import { DEFAULT_LOCALE, localizeActivity, localizedPath } from '../../../lib/i18n';

type LegacyEventDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacyEventDetailPage({ params }: LegacyEventDetailProps) {
  const { id } = await params;
  const legacyId = Number(id);

  if (Number.isFinite(legacyId) && legacyId > 0) {
    const activityResult = await getActivity(legacyId);
    if (activityResult.activity) {
      const activity = localizeActivity(activityResult.activity, DEFAULT_LOCALE);
      permanentRedirect(eventPath(DEFAULT_LOCALE, activity));
    }
  }

  permanentRedirect(localizedPath(DEFAULT_LOCALE, '/events'));
}
