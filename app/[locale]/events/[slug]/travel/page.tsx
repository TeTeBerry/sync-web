import { notFound, permanentRedirect } from 'next/navigation';
import { getActivity } from '../../../../../lib/api';
import { eventPlanPath, parseEventLegacyId } from '../../../../../lib/event-slug';
import { isLocale, localizeActivity, type Locale } from '../../../../../lib/i18n';

type TravelRedirectPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

/**
 * Legacy /travel chapter — permanently consolidated into /plan.
 * Prefer next.config redirects; this page remains as a typed App Router fallback.
 */
export default async function EventTravelRedirectPage({ params }: TravelRedirectPageProps) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const legacyId = parseEventLegacyId(slug);
  if (!legacyId) notFound();

  const activityResult = await getActivity(legacyId);
  if (activityResult.status === 'error') {
    permanentRedirect(`/${locale}/events`);
  }
  if (!activityResult.activity) notFound();

  const activity = localizeActivity(activityResult.activity, locale);
  permanentRedirect(eventPlanPath(locale, activity, { from: 'event' }));
}
