'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import { Users } from 'lucide-react';
import { EmptyState } from '../states/EmptyState';
import { EmailLoginDialog } from '../auth/EmailLoginDialog';
import { UnverifiedEmailNotice } from '../auth/UnverifiedEmailNotice';
import { useAuthSession } from '../../hooks/useAuthSession';
import { trackAuthEvent } from '../../lib/auth/analytics';
import type { AuthIntendedAction } from '../../lib/auth/types';
import {
  applySquadFilters,
  createSquadProfileFromDraft,
  DEFAULT_SQUAD_FILTERS,
  getSquadMatches,
  getSquadProfile,
  getMockTravelers,
  localizeMatchReasonCodes,
  readLineupArtistNames,
  readLineupArtistIds,
  readPlannerPreferences,
  saveSquadProfile,
  type FestivalSquadProfile,
  type SquadFilterState,
  type SquadMatch,
} from '../../lib/festival-squad';
import { buildPrefillSquadProfile } from '../../lib/festival-squad/repository';
import { type Locale, type Messages } from '../../lib/i18n';
import { MatchDetailPanel } from './MatchDetailPanel';
import { SquadArrivalScene } from './SquadArrivalScene';
import { SquadFilterBar } from './SquadFilterBar';
import { SquadPresenceControls } from './SquadPresenceControls';
import { SquadProfileForm } from './SquadProfileForm';
import { SquadSafetyNotice } from './SquadSafetyNotice';
import { SquadRequestInbox } from './SquadRequestInbox';
import { SquadFestivalPrelude } from './SquadFestivalPrelude';
import { TravelerMatchCard } from './TravelerMatchCard';
import { formatSquadDate, journeyPathParts, originLabel, stayLabel } from './squad-labels';

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
  initialView?: 'create' | 'edit' | 'connections';
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
  initialView,
}: FestivalSquadExperienceProps) {
  const auth = useAuthSession();
  const [ready, setReady] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);
  const [error, setError] = useState(false);
  const [profile, setProfile] = useState<FestivalSquadProfile | null>(null);
  const [matches, setMatches] = useState<SquadMatch[]>([]);
  const [filters, setFilters] = useState<SquadFilterState>(DEFAULT_SQUAD_FILTERS);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [connectionTick, setConnectionTick] = useState(0);
  const [justJoined, setJustJoined] = useState(false);
  const [saveError, setSaveError] = useState('');
  const pathRef = useRef<HTMLElement | null>(null);
  const [prefill, setPrefill] = useState<Partial<FestivalSquadProfile>>({});
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<AuthIntendedAction | null>(null);
  const [resumeComposeMatchId, setResumeComposeMatchId] = useState<string | null>(null);
  const [loadNonce, setLoadNonce] = useState(0);
  const forceRemintRef = useRef(true);
  const developmentTravelers = useMemo(
    () =>
      process.env.NODE_ENV === 'development'
        ? getMockTravelers(eventId, festivalDateRange)
        : [],
    [eventId, festivalDateRange],
  );

  // After Auth.js finishes resolving, the first signed-in Squad fetch should
  // mint a fresh Nest bearer — production was stuck on stale post-login cookies.
  useEffect(() => {
    if (!auth.loading && auth.signedIn) {
      forceRemintRef.current = true;
    }
  }, [auth.loading, auth.signedIn]);

  useEffect(() => {
    if (auth.loading) {
      setReady(false);
      return;
    }

    let active = true;
    setReady(false);
    setProfileResolved(false);
    setError(false);
    setProfile(null);
    setMatches([]);
    const shouldRemint = forceRemintRef.current;

    void (async () => {
      try {
        if (auth.signedIn) {
          try {
            const current = await getSquadProfile(eventId, { forceRemint: shouldRemint });
            if (!active) return;
            setProfile(current);
          } catch (err) {
            const status = err && typeof err === 'object' && 'status' in err
              ? Number((err as { status?: unknown }).status)
              : 0;
            // Post-login Nest bearer races: remint once without touching Auth.js
            // loading state (refresh() would remount this effect mid-flight).
            if (status === 401 || status === 403) {
              const current = await getSquadProfile(eventId, { forceRemint: true });
              if (!active) return;
              setProfile(current);
            } else {
              throw err;
            }
          } finally {
            forceRemintRef.current = false;
          }
        }
        const preferences = readPlannerPreferences(eventId);
        const lineupArtists = readLineupArtistNames(eventId, artistNameById);
        const mergedArtists = [...lineupArtists];
        for (const name of artistNames) {
          if (!mergedArtists.includes(name)) mergedArtists.push(name);
        }
        if (!active) return;
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
        setProfileResolved(true);
        setReady(true);
        track('festival_squad_opened', { event: String(eventId), locale });
      } catch {
        if (!active) return;
        setError(true);
        setProfileResolved(true);
        setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    eventId,
    locale,
    festivalStartDate,
    festivalEndDate,
    festivalDateLabel,
    artistNames,
    artistNameById,
    auth.loading,
    auth.signedIn,
    loadNonce,
  ]);

  useEffect(() => {
    if (!ready || !profileResolved || error || !initialView) return;
    if (initialView === 'connections') {
      if (profile) requestAnimationFrame(scrollToPath);
      return;
    }
    if (!auth.signedIn) return;
    if (initialView === 'create' && !profile) openProfileForm('create');
    if (initialView === 'edit' && profile) openProfileForm('edit');
  }, [auth.signedIn, error, initialView, profile, profileResolved, ready]);

  function retryLoad() {
    forceRemintRef.current = true;
    setLoadNonce((value) => value + 1);
  }

  useEffect(() => {
    if (!profile || profile.matchingPaused || profile.visibility.hideProfile) {
      setMatches([]);
      return;
    }

    let active = true;
    void getSquadMatches(eventId)
      .then((next) => {
        if (!active) return;
        setMatches(
          next.map((match) => ({
            ...match,
            reasons: localizeMatchReasonCodes(match.reasons, copy.matchReasons, {
              artists: match.sharedArtists.length,
              genres: match.sharedGenres.length,
            }),
          })),
        );
      })
      .catch(() => {
        // Matches are additive — keep the profile experience usable when ranking fails.
        if (!active) return;
        setMatches([]);
      });

    return () => {
      active = false;
    };
  }, [
    eventId,
    profile?.id,
    profile?.matchingPaused,
    profile?.visibility.hideProfile,
    copy.matchReasons,
  ]);
  const travelers = matches.map((match) => match.profile);
  // Let the unsigned development view feel populated without masking live matches in production.
  const arrivalTravelers = !profile && developmentTravelers.length ? developmentTravelers : travelers;
  const ranked = matches;

  const filtered = useMemo(() => {
    if (!profile) return [];
    return applySquadFilters(ranked, profile, filters);
  }, [ranked, profile, filters]);

  const featuredMatch = filtered[0] ?? null;
  const echoMatches = useMemo(() => filtered.slice(1, 1 + ECHO_VISIBLE), [filtered]);

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
    trackAuthEvent('auth_returned_to_intended_action', {
      intendedAction: action,
    });
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

  async function handleSaveProfile(
    draft: Partial<FestivalSquadProfile>,
    existing?: FestivalSquadProfile | null,
  ) {
    if (!auth.user?.id) {
      requireAuth(existing ? 'edit_squad_profile' : 'create_squad_profile');
      return;
    }
    setSaveError('');
    const wasCreate = !existing;
    const lineup = readLineupArtistIds(eventId, artistNameById);
    try {
      const next = await saveSquadProfile(
        existing
          ? {
              ...existing,
              ...draft,
              userId: auth.user.id,
              displayName: draft.displayName?.trim() || existing.displayName,
              originCity: draft.originCity?.trim() || existing.originCity,
              lookingFor: draft.lookingFor?.length ? draft.lookingFor : existing.lookingFor,
            }
          : createSquadProfileFromDraft(eventId, draft, auth.user.id),
        lineup.ids,
        lineup.unresolved,
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
    } catch (error) {
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : copy.empty.errorLead,
      );
      throw error;
    }
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
          <button type="button" className="button" onClick={retryLoad}>
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
            <button type="button" className="squad-text-action" onClick={() => void auth.logout()}>
              Sign out
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={`squad-page${heroEmbedded ? ' squad-page--embedded' : ''}`}>
      <SquadFestivalPrelude
        eventTitle={eventTitle}
        metaLine={metaLine}
        artistNames={artistNames}
        copy={copy}
      />

      {actions}

      <UnverifiedEmailNotice
        locale={locale}
        signedIn={auth.signedIn}
        emailVerified={auth.user?.emailVerified === true}
        className="squad-auth-notice"
      />

      <EmailLoginDialog
        locale={locale}
        open={loginOpen}
        onClose={() => {
          setLoginOpen(false);
          setPendingAction(null);
        }}
        intendedAction={pendingAction}
      />

      {profileOpen ? (
        <SquadProfileForm
          copy={copy}
          locale={locale}
          existing={profile}
          prefill={prefill}
          errorMessage={saveError}
          onClose={() => {
            setSaveError('');
            setProfileOpen(false);
          }}
          onSave={(draft) => handleSaveProfile(draft, profile)}
        />
      ) : null}

      {!profileOpen && !profile ? (
        <SquadArrivalScene
          locale={locale}
          travelers={arrivalTravelers}
          copy={copy}
          onJoin={() => handleProtectedProfileOpen('create')}
        />
      ) : null}

      {!profileOpen && profile ? (
        <>
          <SquadPresenceControls
            profile={profile}
            copy={copy}
            onProfileChange={setProfile}
            onProfileDeleted={() => {
              setProfile(null);
              setMatches([]);
              setJustJoined(false);
            }}
          />

          {profile.matchingPaused || profile.visibility.hideProfile ? (
            <section className="squad-quiet-empty" aria-live="polite">
              <p className="squad-quiet-empty__title">
                {profile.visibility.hideProfile
                  ? copy.presence.hiddenTitle
                  : copy.presence.pausedTitle}
              </p>
              <p className="squad-quiet-empty__lead">
                {profile.visibility.hideProfile
                  ? copy.presence.hiddenLead
                  : copy.presence.pausedLead}
              </p>
            </section>
          ) : (
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
                        <li
                          key={match.profile.id}
                          className="squad-path__stop squad-path__stop--echo"
                        >
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
              <SquadRequestInbox
                eventId={eventId}
                eventTitle={eventTitle}
                locale={locale}
                copy={copy}
                refreshTick={connectionTick}
              />
            </>
          )}
        </>
      ) : null}

      {!profileOpen ? <SquadSafetyNotice copy={copy} lookingFor={profile?.lookingFor} /> : null}
    </div>
  );
}
