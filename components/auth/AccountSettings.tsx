'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { localizedPath, type Locale } from '../../lib/i18n';
import { eventLineupPath, eventPath, eventPlanPath, eventSquadPath } from '../../lib/event-slug';
import type { Activity } from '../../lib/types';
import { getActivityImage } from '../../lib/api';
import { activityMeta } from '../../lib/format';
import { formatYmdInCatalogTz, getActivityStartYmd, isActivityExpired } from '../../lib/activity-date';
import { getFestivalAtmosphere } from '../../lib/festival-atmosphere';
import { ensureAuthCsrf, submitLogout } from '../../lib/auth/client';
import { useAuthSession } from '../../hooks/useAuthSession';
import { EventImage } from '../EventImage';

type SavedJourney = { guideId: string; activityLegacyId: number; updatedAt?: string };
type SquadProfileSummary = {
  eventId: number;
  displayName: string;
  matchingPaused: boolean;
  visibility?: { hideProfile?: boolean };
};
type SquadRequestSummary = { received: number; sent: number };
type RavenOverview = {
  profile?: {
    favoriteFestivalIds?: Array<string | number>;
    favoriteGenres?: string[];
    favoriteArtistIds?: string[];
    favoriteArtists?: Array<{ id: string; name: string }>;
  };
  journeys?: SavedJourney[];
  squadProfiles?: SquadProfileSummary[];
  pendingSquadRequestsByEvent?: Record<string, SquadRequestSummary>;
};

type FestivalJourney = {
  eventId: number;
  activity: Activity | null;
  favorite: boolean;
  journeys: SavedJourney[];
  squad: SquadProfileSummary | null;
};

type AccountSettingsProps = {
  locale: Locale;
  activities?: Activity[];
  view?: 'profile' | 'settings';
};

function activityTitle(activity: Activity) {
  return activity.title?.trim() || activity.name;
}

function activityMetaLine(activity: Activity) {
  return activityMeta(activity) || activity.city || activity.location || 'Festival journey';
}

function journeyTiming(activity: Activity, locale: Locale): string | null {
  if (isActivityExpired(activity)) return locale === 'zh' ? '这一章已经落幕' : 'A chapter you carried with you';
  const start = getActivityStartYmd(activity);
  if (!start) return null;
  const today = formatYmdInCatalogTz(new Date());
  if (start === today) return locale === 'zh' ? '就是今天' : 'Happening today';
  const days = Math.round((Date.parse(`${start}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (days < 0) return locale === 'zh' ? '正在发生' : 'Happening now';
  if (days === 1) return locale === 'zh' ? '明天出发' : 'Tomorrow';
  return locale === 'zh' ? `${days} 天后相见` : `${days} days to go`;
}

function lineupMatches(activity: Activity, artists: Array<{ id: string; name: string }>) {
  const lineup = [...(activity.artists ?? []), ...(activity.lineup ?? [])]
    .map((artist) => artist.trim().toLowerCase())
    .filter(Boolean);
  return artists.filter((artist) => lineup.includes(artist.name.trim().toLowerCase())).slice(0, 3);
}

function savedPlanJourney(journeys: SavedJourney[]) {
  return journeys.find((journey) => journey.guideId.trim()) ?? null;
}

function hasSavedRavenData(overview: RavenOverview) {
  return Boolean(
    overview.profile?.favoriteFestivalIds?.length
    || overview.profile?.favoriteArtistIds?.length
    || overview.profile?.favoriteGenres?.length
    || overview.journeys?.length
    || overview.squadProfiles?.length,
  );
}

function createDevelopmentOverview(activities: Activity[]): RavenOverview | null {
  const candidates = activities.filter((activity) => !isActivityExpired(activity));
  const festivals = (candidates.length ? candidates : activities).slice(0, 3);
  const primary = festivals[0];
  if (!primary) return null;
  const artistNames = [...(primary.artists ?? []), ...(primary.lineup ?? [])]
    .filter((name, index, all) => Boolean(name.trim()) && all.indexOf(name) === index)
    .slice(0, 3);
  const favoriteArtists = artistNames.map((name, index) => ({ id: `dev-artist-${index + 1}`, name }));
  return {
    profile: {
      favoriteFestivalIds: festivals.map((activity) => activity.legacyId),
      favoriteGenres: ['House', 'Techno', 'Melodic'],
      favoriteArtistIds: favoriteArtists.map((artist) => artist.id),
      favoriteArtists,
    },
    // An empty guide id intentionally opens the normal Plan entry point rather
    // than pretending a fixture is a persisted user plan.
    journeys: [{ guideId: '', activityLegacyId: primary.legacyId, updatedAt: new Date().toISOString() }],
    squadProfiles: [{
      eventId: primary.legacyId,
      displayName: 'Raven Dev',
      matchingPaused: false,
      visibility: { hideProfile: false },
    }],
    pendingSquadRequestsByEvent: { [String(primary.legacyId)]: { received: 2, sent: 1 } },
  };
}

export function AccountSettings({ locale, activities = [], view = 'settings' }: AccountSettingsProps) {
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [overview, setOverview] = useState<RavenOverview | null>(null);
  const [overviewError, setOverviewError] = useState(false);
  const router = useRouter();
  const { loading: authLoading, signedIn } = useAuthSession();
  const developmentFixture = useMemo(
    () => process.env.NODE_ENV === 'development' ? createDevelopmentOverview(activities) : null,
    [activities],
  );

  useEffect(() => {
    if (view !== 'profile' || authLoading || !signedIn) return;
    let active = true;
    setOverviewError(false);
    void fetch('/api/me/overview', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load profile overview');
        return (await response.json()) as RavenOverview;
      })
      .then((data) => {
        if (!active) return;
        setOverview(developmentFixture && !hasSavedRavenData(data) ? developmentFixture : data);
      })
      .catch(() => {
        if (!active) return;
        if (developmentFixture) {
          setOverview(developmentFixture);
          return;
        }
        setOverviewError(true);
      });
    return () => {
      active = false;
    };
  }, [authLoading, developmentFixture, signedIn, view]);

  const activityById = useMemo(
    () => new Map(activities.map((activity) => [activity.legacyId, activity])),
    [activities],
  );
  const favoriteIds = new Set((overview?.profile?.favoriteFestivalIds ?? []).map((id) => Number(id)));
  const journeyByEvent = new Map<number, SavedJourney[]>();
  for (const journey of overview?.journeys ?? []) {
    const journeys = journeyByEvent.get(journey.activityLegacyId) ?? [];
    journeys.push(journey);
    journeyByEvent.set(journey.activityLegacyId, journeys);
  }
  const squadByEvent = new Map((overview?.squadProfiles ?? []).map((profile) => [profile.eventId, profile]));
  const eventIds = new Set([...favoriteIds, ...journeyByEvent.keys(), ...squadByEvent.keys()]);
  const festivalJourneys: FestivalJourney[] = [...eventIds].map((eventId) => ({
    eventId,
    activity: activityById.get(eventId) ?? null,
    favorite: favoriteIds.has(eventId),
    journeys: journeyByEvent.get(eventId) ?? [],
    squad: squadByEvent.get(eventId) ?? null,
  }));
  festivalJourneys.sort((a, b) => {
    const aDate = a.journeys[0]?.updatedAt ?? '';
    const bDate = b.journeys[0]?.updatedAt ?? '';
    return bDate.localeCompare(aDate) || (a.activity?.title ?? '').localeCompare(b.activity?.title ?? '');
  });
  const favoriteGenres = (overview?.profile?.favoriteGenres ?? []).filter(Boolean).slice(0, 4);
  const favoriteArtists = (overview?.profile?.favoriteArtists ?? []).filter((artist) => artist.name.trim()).slice(0, 6);
  const favoriteArtistCount = overview?.profile?.favoriteArtistIds?.length ?? 0;
  const upcomingFestivals = festivalJourneys.filter((item) => item.activity && !isActivityExpired(item.activity));
  upcomingFestivals.sort((a, b) => {
    const aStart = a.activity ? getActivityStartYmd(a.activity) : null;
    const bStart = b.activity ? getActivityStartYmd(b.activity) : null;
    if (aStart && bStart) return aStart.localeCompare(bStart);
    if (aStart) return -1;
    if (bStart) return 1;
    return (b.journeys[0]?.updatedAt ?? '').localeCompare(a.journeys[0]?.updatedAt ?? '');
  });
  const primaryFestival = upcomingFestivals.find((item) => item.journeys.length > 0)
    ?? upcomingFestivals.find((item) => item.squad)
    ?? upcomingFestivals[0]
    ?? festivalJourneys.find((item) => item.journeys.length > 0)
    ?? festivalJourneys.find((item) => item.squad)
    ?? festivalJourneys[0]
    ?? null;
  const remainingFestivals = primaryFestival
    ? festivalJourneys.filter((item) => item.eventId !== primaryFestival.eventId)
    : [];

  async function deleteAccount() {
    if (confirmation !== 'DELETE') return;
    setDeleting(true);
    setError(null);
    try {
      const csrf = await ensureAuthCsrf();
      const response = await fetch('/api/me/account', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({ confirmation }),
      });
      if (!response.ok) throw new Error();
      await submitLogout();
      router.replace('/');
    } catch {
      setError(narrative.deleteError);
    } finally {
      setDeleting(false);
    }
  }

  if (view !== 'profile') {
    return null;
  }

  const primaryActivity = primaryFestival?.activity ?? null;
  const primaryJourney = primaryFestival?.journeys[0] ?? null;
  const primaryImage = primaryActivity ? getActivityImage(primaryActivity) : null;
  const primaryAtmosphere = primaryActivity ? getFestivalAtmosphere(primaryActivity) : 'violet';
  const primaryIsPast = primaryActivity ? isActivityExpired(primaryActivity) : false;
  const primaryTiming = primaryActivity ? journeyTiming(primaryActivity, locale) : null;
  const primaryLineupArtists = primaryActivity ? lineupMatches(primaryActivity, favoriteArtists) : [];
  const primaryRequestSummary = primaryFestival
    ? overview?.pendingSquadRequestsByEvent?.[String(primaryFestival.eventId)]
    : undefined;
  const copy = locale === 'zh' ? {
    next: '下一次相聚', carried: '你珍藏的一场音乐节', continue: '继续旅程', enter: '进入音乐节', people: '寻找同行的人', squad: '查看你的 Squad', sound: '你的声音', soundTitle: '那些带你出发的名字。', other: '仍在空气里的', otherTitle: '这一季的其他音乐节', explore: '探索更多', profile: '个人与隐私', terms: '由你决定', lineup: '这次阵容中的你的声音', lineupEmpty: '把喜欢的艺人留在身边，Raven 会在阵容出现时把他们带回你眼前。', viewLineup: '查看阵容', account: '登录只用于让你选择的音乐节、计划与同行者跨设备保持同步。', privacy: '出发地与音乐偏好始终可选；除非你主动记住，它们只属于当前计划。', accountLabel: '账户', privacyLabel: '隐私', threads: '音乐节篇章', pastThreads: '你带走的音乐节篇章', noMore: '暂时没有其他保存的音乐节。', happening: '正在发生的旅程', saved: '已为以后保存', squadActive: 'Squad 已开启', squadPaused: 'Squad 匹配已暂停', open: '打开', meet: '遇见同行的人', return: '回到旅程', squadTitle: '去往 {festival} 的人。', squadOpen: '打开 Festival Squad', squadWaiting: (count: number) => `${count} 个新的连接请求正在等待你`, squadVisible: '你的资料已经开放给同一场音乐节的人；阵容、计划与新的连接会在同一个世界里相遇。', squadPausedCopy: '你的资料暂时暂停。想重新遇见同路的人时，再回到这里。', squadHidden: '你的 Squad 资料目前隐藏。何时被看见，由你决定。',
  } : {
    next: 'YOUR NEXT GATHERING', carried: 'A FESTIVAL YOU CARRIED', continue: 'Continue your journey', enter: 'Enter festival', people: 'Find your people', squad: 'See your Squad', sound: 'YOUR SOUND', soundTitle: 'The names that bring you there.', other: 'STILL IN THE AIR', otherTitle: 'Elsewhere in your season', explore: 'Explore more', profile: 'Account & privacy', terms: 'ON YOUR TERMS', lineup: 'Your sound in this lineup', lineupEmpty: 'Keep artists close and Raven will bring them back to you when they appear in a lineup.', viewLineup: 'View lineup', account: 'Sign-in only keeps the festivals, plans and people you choose close across devices.', privacy: 'Home airport, city and music preferences stay optional. A starting point belongs to a plan unless you choose to remember it.', accountLabel: 'Account', privacyLabel: 'Privacy', threads: 'Festival threads', pastThreads: 'Festivals you carried', noMore: 'No other saved festivals for now.', happening: 'A journey in motion', saved: 'Saved for later', squadActive: 'Squad profile active', squadPaused: 'Squad matching paused', open: 'Open', meet: 'Meet people', return: 'Return to the festival', squadTitle: 'The people on the way to {festival}.', squadOpen: 'Open Festival Squad', squadWaiting: (count: number) => `${count} new connection request${count === 1 ? '' : 's'} waiting`, squadVisible: 'Your profile is open to people heading to the same festival. The lineup, plans and new connections belong in the same world.', squadPausedCopy: 'Your profile is paused for now. Return when you want to meet people heading to the same place.', squadHidden: 'Your Squad profile is hidden. You decide when this festival can see you.',
  };
  const narrative = locale === 'zh' ? {
    story: '你的音乐节故事', loading: '正在找回你珍藏的片段…', signInTitle: '把下一次相聚留在身边。', signInLead: '当你想把音乐节、计划或同行的人带到其他设备时，再登录即可。', exploreFestivals: '探索音乐节', errorTitle: '你的珍藏世界正在休息。', errorLead: '暂时无法加载，但没有任何内容丢失。', retry: '再试一次', emptyTitle: '找到让你想出发的周末。', emptyLead: '当阵容让你心动时，保存它。计划与 Squad 会一直留在同一个地方。', browseFestivals: '浏览音乐节', upcomingJourney: '你的旅程已经在成形。准备好时，随时接上这条线。', pastJourney: '这一场永远属于你。音乐再次响起时，随时回来看看。', squadJourney: '这场音乐节在召唤你。你的同行者已经是故事的一部分。', savedJourney: '你选择留在身边的一场音乐节。想出发时，让它成为一段旅程。', savedArtists: (count: number) => `已收藏 ${count} 位艺人`, savedFestival: '已保存的音乐节', unavailableFestival: '这场音乐节已无法打开', deleteTitle: '删除账号', deleteLead: '这会永久删除你的资料、计划、日程、收藏与 Festival Squad 数据，且无法撤销。', deleteConfirm: '输入 DELETE 以确认', deleting: '正在删除…', delete: '删除账号', deleteError: '暂时无法删除账号。请重试或联系 [Contact email]。',
  } : {
    story: 'YOUR FESTIVAL STORY', loading: 'Gathering the moments you kept close…', signInTitle: 'Keep the next one close.', signInLead: 'Sign in when you want a festival, a plan or the people going with you to travel across devices.', exploreFestivals: 'Explore festivals', errorTitle: 'Your saved world is taking a breath.', errorLead: 'We couldn’t load it just now. Nothing has been lost.', retry: 'Try again', emptyTitle: 'Find the weekend that pulls you forward.', emptyLead: 'Save a festival when a lineup catches your ear. Your plan and Squad will always stay with that place.', browseFestivals: 'Browse festivals', upcomingJourney: 'Your journey is already taking shape. Pick up the thread whenever you are ready.', pastJourney: 'This one is yours to revisit whenever the music calls you back.', squadJourney: 'The festival is calling. Your people are already part of the story.', savedJourney: 'A festival you chose to keep close—let it become a journey when the time feels right.', savedArtists: (count: number) => `${count} saved artist${count === 1 ? '' : 's'}`, savedFestival: 'Saved festival', unavailableFestival: 'Festival no longer available', deleteTitle: 'Delete account', deleteLead: 'This permanently removes your profile, saved plans, schedules, favorites, and Festival Squad data. It cannot be undone.', deleteConfirm: 'Type DELETE to confirm', deleting: 'Deleting…', delete: 'Delete account', deleteError: 'Your account could not be deleted. Please try again or contact [Contact email].',
  };

  return (
    <main className="raven-settings raven-settings--profile">
      <section className="raven-profile">
        {authLoading || (signedIn && overview === null && !overviewError) ? (
          <section className="raven-profile__loading" aria-live="polite"><p className="raven-settings__kicker">{narrative.story}</p><h1>{narrative.loading}</h1></section>
        ) : null}

        {!authLoading && !signedIn ? (
          <section className="raven-profile__empty" aria-labelledby="profile-empty-title">
            <p className="raven-settings__kicker">{narrative.story}</p>
            <h1 id="profile-empty-title">{narrative.signInTitle}</h1>
            <p>{narrative.signInLead}</p>
            <Link className="raven-profile__cta" href={localizedPath(locale, '/events')}>{narrative.exploreFestivals}</Link>
          </section>
        ) : null}

        {overviewError ? <section className="raven-profile__empty" aria-labelledby="profile-error-title"><p className="raven-settings__kicker">{narrative.story}</p><h1 id="profile-error-title">{narrative.errorTitle}</h1><p>{narrative.errorLead}</p><button type="button" onClick={() => window.location.reload()}>{narrative.retry}</button></section> : null}

        {overview && !overviewError ? <>
          {primaryFestival && primaryActivity ? <section className="raven-profile__hero" data-atmosphere={primaryAtmosphere} aria-labelledby="profile-hero-title">
            <div className="raven-profile__hero-media" aria-hidden="true">
              {primaryImage ? <EventImage src={primaryImage} alt="" className="raven-profile__hero-image" priority sizes="(max-width: 760px) 100vw, 720px" /> : null}
              <div className="raven-profile__hero-scrim" />
            </div>
            <div className="raven-profile__hero-content">
              <p className="raven-settings__kicker">{primaryIsPast ? copy.carried : copy.next}</p>
              <p className="raven-profile__hero-meta">{activityMetaLine(primaryActivity)}</p>
              <h1 id="profile-hero-title">{activityTitle(primaryActivity)}</h1>
              <p className="raven-profile__hero-copy">{primaryTiming ? <span className="raven-profile__hero-timing">{primaryTiming}</span> : null}{primaryJourney ? (primaryIsPast ? ` ${narrative.pastJourney}` : ` ${narrative.upcomingJourney}`) : primaryFestival.squad ? ` ${narrative.squadJourney}` : ` ${narrative.savedJourney}`}</p>
              <div className="raven-profile__hero-actions">
                <Link className="raven-profile__cta" href={primaryJourney && !primaryIsPast ? eventPlanPath(locale, primaryActivity, { guideId: primaryJourney.guideId }) : eventPath(locale, primaryActivity)}>{primaryJourney && !primaryIsPast ? copy.continue : primaryIsPast ? copy.return : copy.enter}</Link>
                {!primaryIsPast ? <Link className="raven-profile__quiet-action" href={primaryFestival.squad ? `${eventSquadPath(locale, primaryActivity)}?view=connections` : `${eventSquadPath(locale, primaryActivity)}?view=create`}>{primaryFestival.squad ? `${copy.squad}${primaryRequestSummary?.received ? ` · ${primaryRequestSummary.received}` : ''}` : copy.people}</Link> : null}
              </div>
            </div>
          </section> : <section className="raven-profile__empty" aria-labelledby="profile-first-festival-title"><p className="raven-settings__kicker">{narrative.story}</p><h1 id="profile-first-festival-title">{narrative.emptyTitle}</h1><p>{narrative.emptyLead}</p><Link className="raven-profile__cta" href={localizedPath(locale, '/events')}>{narrative.browseFestivals}</Link></section>}

          <section className="raven-profile__sound" aria-labelledby="profile-sound-title">
            <div><p className="raven-settings__kicker">{copy.sound}</p><h2 id="profile-sound-title">{primaryLineupArtists.length ? copy.lineup : copy.soundTitle}</h2></div>
            {primaryLineupArtists.length ? <div className="raven-profile__sound-signals"><p className="raven-profile__artists" aria-label="Favorite artists in this lineup">{primaryLineupArtists.map((artist) => <span key={artist.id}>{artist.name}</span>)}</p>{primaryActivity ? <Link className="raven-profile__quiet-action" href={eventLineupPath(locale, primaryActivity)}>{copy.viewLineup}</Link> : null}</div> : favoriteGenres.length || favoriteArtists.length ? <div className="raven-profile__sound-signals">{favoriteGenres.length ? <div className="raven-settings__genres">{favoriteGenres.map((genre) => <span key={genre}>{genre}</span>)}</div> : null}{favoriteArtists.length ? <p className="raven-profile__artists" aria-label="Favorite artists">{favoriteArtists.map((artist) => <span key={artist.id}>{artist.name}</span>)}</p> : null}</div> : <p className="raven-profile__muted">{copy.lineupEmpty}</p>}
            {favoriteArtistCount ? <p className="raven-profile__count">{narrative.savedArtists(favoriteArtistCount)}</p> : null}
          </section>

          {remainingFestivals.length ? <section className="raven-profile__collection" aria-labelledby="profile-collection-title">
            <div className="raven-profile__section-heading"><div><p className="raven-settings__kicker">{copy.other}</p><h2 id="profile-collection-title">{primaryIsPast ? copy.pastThreads : copy.otherTitle}</h2></div><Link href={localizedPath(locale, '/events')}>{copy.explore}</Link></div>
            <div className="raven-profile__thread-list">{remainingFestivals.map((item) => {
              const activity = item.activity;
              const savedJourney = savedPlanJourney(item.journeys);
              const requestSummary = overview.pendingSquadRequestsByEvent?.[String(item.eventId)];
              return <article className={`raven-profile__thread${activity && getActivityImage(activity) ? ' raven-profile__thread--visual' : ''}`} key={item.eventId} data-atmosphere={activity ? getFestivalAtmosphere(activity) : 'violet'}>
                {activity && getActivityImage(activity) ? <div className="raven-profile__thread-poster" aria-hidden="true"><EventImage src={getActivityImage(activity)!} alt="" className="raven-profile__thread-image" sizes="96px" /></div> : null}
                <div><p className="raven-profile__thread-meta">{activity ? activityMetaLine(activity) : narrative.savedFestival}</p><h3>{activity ? activityTitle(activity) : narrative.unavailableFestival}</h3><p>{item.journeys.length ? copy.happening : item.squad ? (item.squad.matchingPaused ? copy.squadPaused : copy.squadActive) : item.favorite ? copy.saved : copy.threads}</p></div>
                {activity ? <div className="raven-profile__thread-actions"><Link href={savedJourney ? eventPlanPath(locale, activity, { guideId: savedJourney.guideId }) : eventPath(locale, activity)}>{savedJourney ? copy.continue : copy.open}</Link>{!isActivityExpired(activity) ? <Link href={item.squad ? `${eventSquadPath(locale, activity)}?view=connections` : `${eventSquadPath(locale, activity)}?view=create`}>{item.squad ? `${copy.squad}${requestSummary?.received ? ` · ${requestSummary.received}` : ''}` : copy.meet}</Link> : null}</div> : null}
              </article>;
            })}</div>
          </section> : null}

        </> : null}

        <details className="raven-profile__account">
          <summary><span><p className="raven-settings__kicker">{copy.terms}</p><h2>{copy.profile}</h2></span><span className="raven-profile__account-toggle" aria-hidden="true">+</span></summary>
          <div className="raven-profile__account-notes"><p><strong>{copy.accountLabel}</strong> {copy.account}</p><p><strong>{copy.privacyLabel}</strong> {copy.privacy}</p></div>
          <div className="raven-settings__danger"><h3>{narrative.deleteTitle}</h3><p>{narrative.deleteLead}</p><label htmlFor="delete-confirm">{narrative.deleteConfirm}</label><input id="delete-confirm" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /><button type="button" onClick={() => void deleteAccount()} disabled={confirmation !== 'DELETE' || deleting}>{deleting ? narrative.deleting : narrative.delete}</button>{error ? <p role="alert">{error}</p> : null}</div>
        </details>
      </section>
    </main>
  );
}
