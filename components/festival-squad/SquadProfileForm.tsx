'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  type AccommodationStatus,
  type AccommodationType,
  type BudgetLevel,
  DEFAULT_VISIBILITY,
  type FestivalSquadProfile,
  type LookingForIntent,
} from '../../lib/festival-squad';
import type { Locale } from '../../lib/i18n';
import { journeyPathParts, lookingLabel, type SquadCopy } from './squad-labels';

type SquadProfileFormProps = {
  copy: SquadCopy;
  locale: Locale;
  existing: FestivalSquadProfile | null;
  prefill: Partial<FestivalSquadProfile>;
  errorMessage?: string;
  onClose: () => void;
  onSave: (draft: Partial<FestivalSquadProfile>) => void | Promise<void>;
};

/** Two beats: who you are on this journey, then optional details. */
export function SquadProfileForm({
  copy,
  locale,
  existing,
  prefill,
  errorMessage,
  onClose,
  onSave,
}: SquadProfileFormProps) {
  const titleId = useId();
  const sceneRef = useRef<HTMLDivElement>(null);
  const seed = existing ?? prefill;
  const visibility = seed.visibility ?? DEFAULT_VISIBILITY;

  const [displayName, setDisplayName] = useState(seed.displayName ?? '');
  const [originCity, setOriginCity] = useState(seed.originCity ?? '');
  const [originCountry, setOriginCountry] = useState(seed.originCountry ?? '');
  const [arrivalDate, setArrivalDate] = useState(seed.arrivalDate ?? '');
  const [departureDate, setDepartureDate] = useState(seed.departureDate ?? '');
  const [lookingFor, setLookingFor] = useState<LookingForIntent[]>(
    seed.lookingFor?.length ? seed.lookingFor : ['festival_buddy'],
  );
  const [accommodationStatus, setAccommodationStatus] = useState<AccommodationStatus>(
    seed.accommodationStatus ?? 'not_decided',
  );
  const [accommodationType, setAccommodationType] = useState<AccommodationType>(
    seed.accommodationType ?? 'not_decided',
  );
  const [accommodationName, setAccommodationName] = useState(seed.accommodationName ?? '');
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>(seed.budgetLevel ?? 'comfort');
  const [favoriteArtists] = useState((seed.favoriteArtists ?? []).join(', '));
  const [shortNote, setShortNote] = useState(seed.shortNote ?? '');
  const [allowRequests, setAllowRequests] = useState(
    seed.visibility?.allowConnectionRequests !== false,
  );
  const [saving, setSaving] = useState(false);
  const [displayNameError, setDisplayNameError] = useState(false);

  const journeyPreview = useMemo(
    () =>
      journeyPathParts(
        {
          originCity,
          originCountry,
          arrivalDate,
          departureDate,
          accommodationType,
          accommodationName,
          budgetLevel,
          favoriteArtists: favoriteArtists
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          visibility: {
            ...visibility,
            allowConnectionRequests: allowRequests,
          },
        },
        locale,
        copy,
      ).join(' · '),
    [
      originCity,
      originCountry,
      arrivalDate,
      departureDate,
      accommodationType,
      accommodationName,
      budgetLevel,
      favoriteArtists,
      allowRequests,
      visibility,
      locale,
      copy,
    ],
  );

  const hasPrefillJourney = Boolean(
    !existing &&
    (prefill.originCity || prefill.arrivalDate || (prefill.favoriteArtists?.length ?? 0) > 0),
  );

  const needsOrigin = !originCity.trim();
  const needsDates = !arrivalDate || !departureDate;

  const canSave =
    originCity.trim().length > 0 &&
    arrivalDate &&
    departureDate &&
    lookingFor.length > 0;

  useEffect(() => {
    sceneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggleLooking(intent: LookingForIntent) {
    setLookingFor((current) => {
      if (current.includes(intent)) {
        if (current.length <= 1) return current;
        return current.filter((item) => item !== intent);
      }
      return [...current, intent];
    });
  }

  return (
    <div ref={sceneRef} className="squad-profile-scene" tabIndex={-1}>
      <header className="squad-profile-scene__header">
        <p className="squad-profile-scene__kicker">{copy.hero.kicker}</p>
        <h2 id={titleId}>{existing ? copy.profile.editTitle : copy.profile.title}</h2>
        <p className="squad-profile-scene__lead">{copy.profile.lead}</p>
        {!existing && hasPrefillJourney ? (
          <p className="squad-form__hint">{copy.profile.prefillNote}</p>
        ) : null}
      </header>

      <form
        className="squad-form"
        aria-labelledby={titleId}
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave || saving) return;
          if (!displayName.trim()) {
            setDisplayNameError(true);
            return;
          }
          setDisplayNameError(false);
          setSaving(true);
          void Promise.resolve(
            onSave({
              displayName: displayName.trim(),
              originCity: originCity.trim(),
              originCountry: originCountry.trim() || undefined,
              arrivalDate,
              departureDate,
              lookingFor,
              accommodationStatus,
              accommodationType,
              accommodationName: accommodationName.trim() || undefined,
              budgetLevel,
              favoriteArtists: favoriteArtists
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
              favoriteGenres: seed.favoriteGenres ?? [],
              firstTimeAttendee: Boolean(seed.firstTimeAttendee),
              shortNote: shortNote.trim() || undefined,
              groupSize: seed.groupSize ?? 1,
              visibility: {
                ...visibility,
                allowConnectionRequests: allowRequests,
              },
            }),
          )
            .catch(() => undefined)
            .finally(() => setSaving(false));
        }}
      >
        {journeyPreview ? (
          <div className="squad-form__journey">
            <p className="squad-form__journey-kicker">{copy.profile.journeySoFar}</p>
            <p className="squad-form__journey-path">{journeyPreview}</p>
          </div>
        ) : null}

        <label className="squad-form__label">
          {copy.profile.displayName}
          <input
            className="squad-form__input"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              if (event.target.value.trim()) setDisplayNameError(false);
            }}
            aria-required="true"
            aria-invalid={displayNameError}
            aria-describedby={displayNameError ? `${titleId}-display-name-error` : undefined}
            autoComplete="nickname"
          />
          {displayNameError ? (
            <p id={`${titleId}-display-name-error`} className="squad-form__error" role="alert">
              {copy.profile.displayNameRequired}
            </p>
          ) : null}
        </label>

        <fieldset className="squad-filter-group">
          <legend>{copy.profile.lookingFor}</legend>
          <div className="squad-filters__chips">
            {(['festival_buddy', 'roommate', 'ride_share'] as LookingForIntent[]).map((intent) => (
              <button
                key={intent}
                type="button"
                className={`squad-chip${lookingFor.includes(intent) ? ' is-active' : ''}`}
                aria-pressed={lookingFor.includes(intent)}
                onClick={() => toggleLooking(intent)}
              >
                {lookingLabel(intent, copy)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="squad-profile-artists">
          <p className="squad-profile-artists__label">{copy.profile.favoriteArtists}</p>
          {favoriteArtists ? (
            <p className="squad-profile-artists__names">
              {favoriteArtists
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : (
            <p className="squad-profile-artists__empty">{copy.profile.artistsEmpty}</p>
          )}
        </div>

        <details className="squad-form__disclosure" open={needsOrigin || needsDates}>
          <summary>{copy.profile.adjustJourney}</summary>
          <div className="squad-form__disclosure-body">
            <div className="squad-form__row">
              <label className="squad-form__label">
                {copy.profile.originCity}
                <input
                  className="squad-form__input"
                  value={originCity}
                  onChange={(event) => setOriginCity(event.target.value)}
                  required
                />
              </label>
              <label className="squad-form__label">
                {copy.profile.originCountry}
                <input
                  className="squad-form__input"
                  value={originCountry}
                  onChange={(event) => setOriginCountry(event.target.value)}
                />
              </label>
            </div>
            <div className="squad-form__row">
              <label className="squad-form__label">
                {copy.profile.arrivalDate}
                <input
                  className="squad-form__input"
                  type="date"
                  value={arrivalDate}
                  onChange={(event) => setArrivalDate(event.target.value)}
                  required
                />
              </label>
              <label className="squad-form__label">
                {copy.profile.departureDate}
                <input
                  className="squad-form__input"
                  type="date"
                  value={departureDate}
                  onChange={(event) => setDepartureDate(event.target.value)}
                  required
                />
              </label>
            </div>
          </div>
        </details>

        <details className="squad-form__disclosure">
          <summary>{copy.profile.moreDetails}</summary>
          <div className="squad-form__disclosure-body">
            <label className="squad-form__label">
              {copy.profile.accommodationType}
              <select
                className="squad-form__input"
                value={accommodationType}
                onChange={(event) => setAccommodationType(event.target.value as AccommodationType)}
              >
                <option value="dreamville">{copy.filters.dreamville}</option>
                <option value="camping">{copy.filters.dreamville}</option>
                <option value="hotel">{copy.filters.hotel}</option>
                <option value="hostel">{copy.filters.hostel}</option>
                <option value="not_decided">{copy.filters.notDecided}</option>
              </select>
            </label>
            <label className="squad-form__label">
              {copy.profile.accommodationName}
              <input
                className="squad-form__input"
                value={accommodationName}
                onChange={(event) => setAccommodationName(event.target.value)}
              />
            </label>
            <label className="squad-form__label">
              {copy.profile.shortNote}
              <input
                className="squad-form__input"
                value={shortNote}
                onChange={(event) => setShortNote(event.target.value)}
                maxLength={120}
              />
            </label>
            <label className="squad-form__check">
              <input
                type="checkbox"
                checked={allowRequests}
                onChange={(event) => setAllowRequests(event.target.checked)}
              />
              <span>{copy.profile.allowRequests}</span>
            </label>
          </div>
        </details>

        <footer className="squad-profile-scene__footer">
          <button type="button" className="squad-text-action" onClick={onClose}>
            {copy.profile.cancel}
          </button>
          <button type="submit" className="button" disabled={!canSave || saving}>
            {saving ? copy.profile.saving : copy.profile.save}
          </button>
        </footer>
        {errorMessage ? (
          <p className="squad-form__error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </form>
    </div>
  );
}
