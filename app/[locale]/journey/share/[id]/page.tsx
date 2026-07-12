import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JourneyShareActions } from '../../../../../components/journey-share/JourneyShareActions';
import { JourneyShareCard } from '../../../../../components/journey-share/JourneyShareCard';
import { JourneyShareLayout } from '../../../../../components/journey-share/JourneyShareLayout';
import '../../../../../components/journey-share/journey-share.css';
import {
  getActivity,
  getActivityImage,
  getActivityTitle,
  getSavedRavenPlan,
  type RavenSavedPlan,
} from '../../../../../lib/api';
import {
  buildJourneyShareFromSavedPlan,
  type JourneyShareCardData,
  type JourneyShareLookingFor,
} from '../../../../../lib/journey-share';
import {
  activityMetaForLocale,
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  localizeActivity,
  localizedPath,
  type Locale,
} from '../../../../../lib/i18n';
import { buildSocialMetadata } from '../../../../../lib/seo';
import { getSiteUrl } from '../../../../../lib/site';

type JourneySharePageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{
    artists?: string;
    looking?: string;
  }>;
};

export const dynamic = 'force-dynamic';

function parseLookingFor(raw: string | undefined): JourneyShareLookingFor[] | undefined {
  if (!raw?.trim()) return undefined;
  const allowed = new Set<JourneyShareLookingFor>([
    'roommate',
    'festival_buddy',
    'ride_share',
  ]);
  const values = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is JourneyShareLookingFor =>
      allowed.has(item as JourneyShareLookingFor),
    );
  return values.length ? values : undefined;
}

function parseArtists(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

async function loadSavedPlan(id: string): Promise<RavenSavedPlan | null> {
  try {
    return await getSavedRavenPlan(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: JourneySharePageProps): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = getMessages(locale);
  const saved = await loadSavedPlan(id);
  if (!saved) return {};

  try {
    const activityResult = await getActivity(saved.activityLegacyId);
    const activity = activityResult.activity
      ? localizeActivity(activityResult.activity, locale)
      : null;
    const festivalName = activity
      ? getActivityTitle(activity) || saved.plan.activityName
      : saved.plan.activityName;
    const image = activity ? getActivityImage(activity) : undefined;
    const siteUrl = getSiteUrl();
    const url = `${siteUrl}${localizedPath(locale, `/journey/share/${encodeURIComponent(id)}`)}`;
    const title = t.aiPlanner.journeyShare.metaTitle.replace('{festival}', festivalName);
    const description = t.aiPlanner.journeyShare.metaDescription.replace(
      '{festival}',
      festivalName,
    );

    return {
      title,
      description,
      alternates: {
        canonical: url,
        languages: {
          'zh-CN': `${siteUrl}${localizedPath('zh', `/journey/share/${encodeURIComponent(id)}`)}`,
          en: `${siteUrl}${localizedPath('en', `/journey/share/${encodeURIComponent(id)}`)}`,
        },
      },
      ...buildSocialMetadata({
        title,
        description,
        url,
        locale,
        image: image
          ? { url: image, width: 1200, height: 630, alt: festivalName }
          : undefined,
      }),
    };
  } catch {
    return {};
  }
}

export default async function JourneySharePage({
  params,
  searchParams,
}: JourneySharePageProps) {
  const { locale: rawLocale, id } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const query = await searchParams;

  const saved = await loadSavedPlan(id);
  if (!saved) notFound();

  const activityResult = await getActivity(saved.activityLegacyId).catch(() => null);
  const activity = activityResult?.activity
    ? localizeActivity(activityResult.activity, locale)
    : null;
  const metaLine = activity ? activityMetaForLocale(activity, locale) : '';
  const metaLocation = metaLine.includes(' · ')
    ? metaLine.split(' · ').slice(1).join(' · ')
    : activity?.location || activity?.city || '';
  const heroImage = activity ? getActivityImage(activity) : undefined;
  const t = getMessages(locale);
  const shareCopy = t.aiPlanner.journeyShare;

  const data = buildJourneyShareFromSavedPlan({
    id,
    locale,
    plan: saved.plan,
    festivalLocation: metaLocation || saved.plan.venue,
    favoriteArtists: parseArtists(query.artists),
    lookingFor: parseLookingFor(query.looking),
    heroImage,
  });

  return (
    <main className="journey-share-page">
      <div className="journey-share-page__inner">
        <p className="journey-share-page__whisper">{shareCopy.pageWhisper}</p>
        <JourneyShareLayout aspect="portrait">
          <JourneyShareCard data={data} labels={shareCopy.card} priority />
        </JourneyShareLayout>
        <div className="journey-share-page__actions">
          <JourneyShareActions
            data={data}
            labels={shareCopy.card}
            copy={shareCopy.actions}
            eventLegacyId={saved.activityLegacyId}
            locale={locale}
            showPreview={false}
          />
        </div>
      </div>
    </main>
  );
}

export type { JourneyShareCardData };
