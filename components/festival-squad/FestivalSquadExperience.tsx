'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import { Users } from 'lucide-react';
import { EmptyState } from '../states/EmptyState';
import { TrackedLink } from '../TrackedLink';
import { EmailLoginDialog } from '../auth/EmailLoginDialog';
import { UnverifiedEmailNotice } from '../auth/UnverifiedEmailNotice';
import { useAuthSession } from '../../hooks/useAuthSession';
import { trackAuthEvent } from '../../lib/auth/analytics';
import type { AuthIntendedAction } from '../../lib/auth/types';
import {
  applySquadFilters,
  bindSquadProfileToAuthUser,
  createSquadProfileFromDraft,
  DEFAULT_SQUAD_FILTERS,
  getMockTravelers,
  matchReasonCopyFromMessages,
  rankSquadMatches,
  readLineupArtistNames,
  readPlannerPreferences,
  readSquadProfile,
  writeSquadProfile,
  type FestivalSquadProfile,
  type SquadFilterState,
  type SquadMatch,
} from '../../lib/festival-squad';
import { buildPrefillSquadProfile } from '../../lib/festival-squad/repository';
import { localizedPath, type Locale, type Messages } from '../../lib/i18n';
import { MatchDetailPanel } from './MatchDetailPanel';
import { SquadArrivalScene } from './SquadArrivalScene';
import { SquadFilterBar } from './SquadFilterBar';
import { SquadProfileForm } from './SquadProfileForm';
import { SquadSafetyNotice } from './SquadSafetyNotice';
import { TravelerMatchCard } from './TravelerMatchCard';
import {
  formatSquadDate,
  journeyPathParts,
  originLabel,
  stayLabel,
} from './squad-labels';

type SquadCopy = Messages['festivalSquad'];

type FestivalSquadExperienceProps = {
  locale: Locale;
  eventId: number;
  eventTitle: string;
  metaLine: string;
  festivalStartDate?: string;
  festivalEndDate?: string;
  festivalDateLabel?: string;
  festivalDateRange: { start: string; end: string } | null;
  artistNames: string[];
  artistNameById: Record<string, string>;
  copy: SquadCopy;
  heroEmbedded?: boolean;
};

const ECHO_VISIBLE = 4;

export function FestivalSquadExperience({
  locale,
  eventId,
  eventTitle,
  metaLine,
  festivalStartDate,
  festivalEndDate,
  festivalDateLabel,
  festivalDateRange,
  artistNames,
  artistNameById,
  copy,
  heroEmbedded = false,
}: FestivalSquadExperienceProps) {
  const reasonCopy = matchReasonCopyFromMessages(copy.matchReasons);
  const auth = useAuthSession();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [profile, setProfile] = useState<FestivalSquadProfile | null>(null);
  const [filters, setFilters] = useState<SquadFilterState>(DEFAULT_SQUAD_FILTERS);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [connectionTick, setConnectionTick] = useState(0);
  const [justJoined, setJustJoined] = useState(false);
  const pathRef = useRef<HTMLElement | null>(null);
  const [prefill, setPrefill] = useState<Partial<FestivalSquadProfile>>({});
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<AuthIntendedAction | null>(null);
  const [resumeComposeMatchId, setResumeComposeMatchId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setProfile(readSquadProfile(eventId));
      const preferences = readPlannerPreferences(eventId);
      const lineupArtists = readLineupArtistNames(eventId, artistNameById);
      const mergedArtists = [...lineupArtists];
      for (const name of artistNames) {
        if (!mergedArtists.includes(name)) mergedArtists.push(name);
      }
      setPrefill(
        buildPrefillSquadProfile({
          eventId,
          festivalStartDate,
          festivalEndDate,
          festivalDateLabel,
          preferences,
          favoriteArtists: mergedArtists,
        }),
      );
      setReady(true);
      track('festival_squad_opened', { event: String(eventId), locale });
    } catch {
      setError(true);
      setReady(true);
    }
  }, [
    eventId,
    locale,
    festivalStartDate,
    festivalEndDate,
    festivalDateLabel,
    artistNames,
    artistNameById,
  ]);

  // Rebind local Squad ownership when session is already signed in on load.
  useEffect(() => {
    if (!auth.signedIn || !auth.user?.id || !ready) return;
    const rebound = bindSquadProfileToAuthUser(eventId, auth.user.id);
    if (rebound) setProfile(rebound);
  }, [auth.signedIn, auth.user?.id, eventId, ready]);

  const travelers = useMemo(
    () => getMockTravelers(eventId, festivalDateRange),
    [eventId, festivalDateRange],
  );

  const ranked = useMemo(() => {
    if (!profile) return [];
    return rankSquadMatches(profile, travelers, reasonCopy);
  }, [profile, travelers, reasonCopy]);

  const filtered = useMemo(() => {
    if (!profile) return [];
    return applySquadFilters(ranked, profile, filters);
  }, [ranked, profile, filters]);

  const featuredMatch = filtered[0] ?? null;
  const echoMatches = useMemo(
    () => filtered.slice(1, 1 + ECHO_VISIBLE),
    [filtered],
  );

  const selectedMatch: SquadMatch | null = useMemo(() => {
    if (!selectedMatchId) return null;
    return filtered.find((item) => item.profile.id === selectedMatchId) ?? null;
  }, [filtered, selectedMatchId]);

  const yourPathLine = useMemo(() => {
    if (!profile) return '';
    return journeyPathParts(profile, locale, copy).join(' · ');
  }, [profile, locale, copy]);

  function scrollToPath() {
    pathRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function requireAuth(action: AuthIntendedAction) {
    if (auth.signedIn) {
      resumeAction(action);
      return;
    }
    if (action === 'send_connection_request' && selectedMatchId) {
      setResumeComposeMatchId(selectedMatchId);
    }
    setPendingAction(action);
    setLoginOpen(true);
  }

  function resumeAction(action: AuthIntendedAction) {
    trackAuthEvent('auth_returned_to_intended_action', { intendedAction: action });
    if (action === 'create_squad_profile') {
      openProfileForm('create');
      return;
    }
    if (action === 'edit_squad_profile' || action === 'manage_squad_visibility') {
      openProfileForm('edit');
      return;
    }
    if (action === 'send_connection_request') {
      if (resumeComposeMatchId) {
        setSelectedMatchId(resumeComposeMatchId);
      }
      return;
    }
  }

  function openProfileForm(mode: 'create' | 'edit') {
    setSelectedMatchId(null);
    setProfileOpen(true);
    track('squad_profile_started', { event: String(eventId), locale, mode });
  }

  function handleProtectedProfileOpen(mode: 'create' | 'edit') {
    const action: AuthIntendedAction =
      mode === 'create' ? 'create_squad_profile' : 'edit_squad_profile';
    if (!auth.signedIn) {
      requireAuth(action);
      return;
    }
    openProfileForm(mode);
  }

  function handleSaveProfile(
    draft: Partial<FestivalSquadProfile>,
    existing?: FestivalSquadProfile | null,
  ) {
    if (!auth.user?.id) {
      requireAuth(existing ? 'edit_squad_profile' : 'create_squad_profile');
      return;
    }
    const wasCreate = !existing;
    const next = existing
      ? writeSquadProfile({
          ...existing,
          ...draft,
          userId: auth.user.id,
          displayName: draft.displayName?.trim() || existing.displayName,
          originCity: draft.originCity?.trim() || existing.originCity,
          lookingFor: draft.lookingFor?.length ? draft.lookingFor : existing.lookingFor,
        })
      : writeSquadProfile(
          createSquadProfileFromDraft(eventId, draft, auth.user.id),
        );
    setProfile(next);
    setProfileOpen(false);
    if (wasCreate) setJustJoined(true);
    track('squad_profile_completed', {
      event: String(eventId),
      locale,
      mode: existing ? 'edit' : 'create',
    });
    requestAnimationFrame(() => {
      pathRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function handleEmailLogin(email: string) {
    const returnUrl =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}${window.location.hash}`
        : null;
    const result = await auth.login({
      email,
      returnUrl,
      intendedAction: pendingAction,
    });
    const authUserId = result.session.user.id;
    const rebound = bindSquadProfileToAuthUser(eventId, authUserId);
    if (rebound) setProfile(rebound);
    setLoginOpen(false);
    const action = result.intendedAction ?? pendingAction;
    setPendingAction(null);
    if (action) resumeAction(action);
  }

  if (!ready) {
    return (
      <div className="squad-page__state" role="status">
        <p>{copy.empty.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Users}
        title={copy.empty.errorTitle}
        lead={copy.empty.errorLead}
        tone="error"
        actions={
          <button type="button" className="button" onClick={() => window.location.reload()}>
            {copy.empty.errorCta}
          </button>
        }
      />
    );
  }

  const actions = heroEmbedded ? (
    profile && !profileOpen ? (
      <div className="squad-actions">
        <p className="squad-actions__whisper">{copy.hero.pathPresence}</p>
        <div className="squad-actions__buttons">
          <button type="button" className="squad-text-action" onClick={scrollToPath}>
            {copy.hero.viewMatches}
          </button>
          <button
            type="button"
            className="squad-text-action"
            onClick={() => handleProtectedProfileOpen('edit')}
          >
            {copy.hero.editProfile}
          </button>
        </div>
      </div>
    ) : null
  ) : (
    <div className="squad-actions">
      <div className="squad-hero__copy squad-actions__intro">
        <p className="squad-hero__kicker">{copy.hero.kicker}</p>
        <h1 id="squad-hero-title" className="squad-hero__title">
          {eventTitle}
        </h1>
        {metaLine ? <p className="squad-hero__meta">{metaLine}</p> : null}
        <p className="squad-hero__invite">{copy.hero.invite}</p>
      </div>
      {!profileOpen ? (
        <div className="squad-actions__buttons">
          {profile ? (
            <>
              <button type="button" className="squad-text-action" onClick={scrollToPath}>
                {copy.hero.viewMatches}
              </button>
              <button
                type="button"
                className="squad-text-action"
                onClick={() => handleProtectedProfileOpen('edit')}
              >
                {copy.hero.editProfile}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button"
              onClick={() => handleProtectedProfileOpen('create')}
            >
              {copy.hero.createProfile}
            </button>
          )}
          {auth.signedIn ? (
            <button
              type="button"
              className="squad-text-action"
              onClick={() => void auth.logout()}
            >
              Sign out
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={`squad-page${heroEmbedded ? ' squad-page--embedded' : ''}`}>
      {actions}

      <UnverifiedEmailNotice
        signedIn={auth.signedIn}
        emailVerified={auth.user?.emailVerified === true}
        className="squad-auth-notice"
      />

      <EmailLoginDialog
        open={loginOpen}
        onClose={() => {
          setLoginOpen(false);
          setPendingAction(null);
        }}
        onSubmitEmail={handleEmailLogin}
        intendedAction={pendingAction}
      />

      {profileOpen ? (
        <SquadProfileForm
          copy={copy}
          locale={locale}
          existing={profile}
          prefill={prefill}
          onClose={() => setProfileOpen(false)}
          onSave={(draft) => handleSaveProfile(draft, profile)}
        />
      ) : null}

      {!profileOpen && !profile ? (
        <SquadArrivalScene
          locale={locale}
          travelers={travelers}
          copy={copy}
          onJoin={() => handleProtectedProfileOpen('create')}
        />
      ) : null}

      {!profileOpen && profile ? (
        <>
          <section className="squad-chapter" aria-labelledby="squad-summary-title">
            <p className="squad-chapter__kicker">{copy.summary.chapterKicker}</p>
            <h2 id="squad-summary-title" className="squad-summary__title">
              {justJoined ? copy.summary.joinedTitle : copy.summary.title}
            </h2>
            <p className="squad-chapter__lead">
              {justJoined ? copy.summary.joinedLead : copy.summary.chapterLead}
            </p>
            <p className="squad-chapter__presence">{copy.summary.presence}</p>
          </section>

          <SquadFilterBar
            copy={copy}
            filters={filters}
            onChange={(next) => {
              setFilters(next);
              setSelectedMatchId(null);
              track('squad_filter_applied', { event: String(eventId), locale });
            }}
          />

          <section ref={pathRef} className="squad-path" aria-labelledby="squad-matches-title">
            <h2 id="squad-matches-title" className="visually-hidden">
              {copy.summary.title}
            </h2>
            <div className="squad-path__rail" aria-hidden />

            <article className="squad-you-stop">
              <p className="squad-you-stop__kicker">{copy.summary.youOnPath}</p>
              <h3 className="squad-you-stop__name">{profile.displayName}</h3>
              <p className="squad-you-stop__path">
                {yourPathLine ||
                  [
                    originLabel(profile),
                    copy.card.arriving.replace(
                      '{date}',
                      formatSquadDate(profile.arrivalDate, locale),
                    ),
                    copy.card.staying.replace('{place}', stayLabel(profile, copy)),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
              </p>
              {profile.favoriteArtists.length ? (
                <p className="squad-you-stop__artists">
                  {profile.favoriteArtists.slice(0, 3).join(' · ')}
                </p>
              ) : null}
            </article>

            {!travelers.length ? (
              <div className="squad-quiet-empty">
                <p className="squad-quiet-empty__title">{copy.empty.noTravelersTitle}</p>
                <p className="squad-quiet-empty__lead">{copy.empty.noTravelersLead}</p>
              </div>
            ) : !filtered.length ? (
              <div className="squad-quiet-empty">
                <p className="squad-quiet-empty__title">{copy.empty.noMatchesTitle}</p>
                <p className="squad-quiet-empty__lead">{copy.empty.noMatchesLead}</p>
                <button
                  type="button"
                  className="squad-text-action"
                  onClick={() => setFilters(DEFAULT_SQUAD_FILTERS)}
                >
                  {copy.empty.noMatchesCta}
                </button>
              </div>
            ) : (
              <ol className="squad-path__stops">
                {featuredMatch ? (
                  <li className="squad-path__stop squad-path__stop--featured">
                    <TravelerMatchCard
                      match={featuredMatch}
                      locale={locale}
                      copy={copy}
                      featured
                      open={selectedMatch?.profile.id === featuredMatch.profile.id}
                      onToggle={() => {
                        const open = selectedMatch?.profile.id === featuredMatch.profile.id;
                        setSelectedMatchId(open ? null : featuredMatch.profile.id);
                        if (!open) {
                          track('squad_match_viewed', {
                            event: String(eventId),
                            locale,
                            matchId: featuredMatch.profile.id,
                          });
                        }
                      }}
                    >
                      {selectedMatch?.profile.id === featuredMatch.profile.id ? (
                        <MatchDetailPanel
                          key={`${featuredMatch.profile.id}-${connectionTick}`}
                          match={featuredMatch}
                          viewer={profile}
                          locale={locale}
                          copy={copy}
                          eventTitle={eventTitle}
                          authUserId={auth.user?.id ?? null}
                          signedIn={auth.signedIn}
                          canSendConnectionRequest={
                            auth.capabilities?.canSendConnectionRequest === true
                          }
                          autoCompose={resumeComposeMatchId === featuredMatch.profile.id}
                          onAutoComposeConsumed={() => setResumeComposeMatchId(null)}
                          onRequireAuth={() => requireAuth('send_connection_request')}
                          onConnectionChange={() => setConnectionTick((n) => n + 1)}
                        />
                      ) : null}
                    </TravelerMatchCard>
                  </li>
                ) : null}

                {echoMatches.map((match) => {
                  const open = selectedMatch?.profile.id === match.profile.id;
                  return (
                    <li key={match.profile.id} className="squad-path__stop squad-path__stop--echo">
                      <TravelerMatchCard
                        match={match}
                        locale={locale}
                        copy={copy}
                        echo
                        open={open}
                        onToggle={() => {
                          setSelectedMatchId(open ? null : match.profile.id);
                          if (!open) {
                            track('squad_match_viewed', {
                              event: String(eventId),
                              locale,
                              matchId: match.profile.id,
                            });
                          }
                        }}
                      >
                        {open ? (
                          <MatchDetailPanel
                            key={`${match.profile.id}-${connectionTick}`}
                            match={match}
                            viewer={profile}
                            locale={locale}
                            copy={copy}
                            eventTitle={eventTitle}
                            authUserId={auth.user?.id ?? null}
                            signedIn={auth.signedIn}
                            canSendConnectionRequest={
                              auth.capabilities?.canSendConnectionRequest === true
                            }
                            autoCompose={resumeComposeMatchId === match.profile.id}
                            onAutoComposeConsumed={() => setResumeComposeMatchId(null)}
                            onRequireAuth={() => requireAuth('send_connection_request')}
                            onConnectionChange={() => setConnectionTick((n) => n + 1)}
                          />
                        ) : null}
                      </TravelerMatchCard>
                    </li>
                  );
                })}
              </ol>
            )}

            {filtered.length > 1 + ECHO_VISIBLE ? (
              <p className="squad-path__more">
                {copy.summary.moreOnPath.replace(
                  '{count}',
                  String(filtered.length - 1 - ECHO_VISIBLE),
                )}
              </p>
            ) : null}
          </section>
        </>
      ) : null}

      {!profileOpen ? (
        <>
          <SquadSafetyNotice copy={copy} lookingFor={profile?.lookingFor} />
          <aside className="squad-locked">
            <TrackedLink
              className="squad-text-action squad-locked__link"
              href={`${localizedPath(locale, '/waitlist')}?event=${encodeURIComponent(eventTitle)}`}
              eventName="festival_squad_waitlist_click"
              eventProperties={{ event: String(eventId), locale }}
            >
              {copy.locked.cta}
            </TrackedLink>
          </aside>
        </>
      ) : null}
    </div>
  );
}
