'use client';

import { useState } from 'react';
import {
  deleteSquadProfile,
  updateSquadProfileSettings,
  type FestivalSquadProfile,
  type ProfileVisibility,
} from '../../lib/festival-squad';
import type { SquadCopy } from './squad-labels';

type SquadPresenceControlsProps = {
  profile: FestivalSquadProfile;
  copy: SquadCopy;
  onProfileChange: (profile: FestivalSquadProfile) => void;
  onProfileDeleted: () => void;
};

/** A quiet, event-scoped control surface for a traveler’s presence on this path. */
export function SquadPresenceControls({
  profile,
  copy,
  onProfileChange,
  onProfileDeleted,
}: SquadPresenceControlsProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [deleteArmed, setDeleteArmed] = useState(false);

  async function save(input: {
    visibility?: Partial<ProfileVisibility>;
    matchingPaused?: boolean;
  }) {
    setSaving(true);
    setMessage('');
    try {
      const next = await updateSquadProfileSettings(profile.eventId, input);
      onProfileChange(next);
      setMessage(copy.presence.saved);
    } catch {
      setMessage(copy.presence.error);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setMessage('');
    try {
      await deleteSquadProfile(profile.eventId);
      onProfileDeleted();
    } catch {
      setSaving(false);
      setMessage(copy.presence.error);
    }
  }

  const visibilityMode = profile.visibility.showExactCity
    ? 'city'
    : profile.visibility.showCountryOnly
      ? 'country'
      : 'journey';

  return (
    <section className="squad-presence" aria-labelledby="squad-presence-title">
      <details>
        <summary>
          <span>
            <span className="squad-presence__kicker">{copy.presence.kicker}</span>
            <span id="squad-presence-title" className="squad-presence__title">
              {copy.presence.title}
            </span>
          </span>
          <span className="squad-presence__summary">{copy.presence.open}</span>
        </summary>

        <div className="squad-presence__body">
          <fieldset className="squad-presence__field">
            <legend>{copy.presence.visibilityTitle}</legend>
            <p>{copy.presence.visibilityLead}</p>
            <div className="squad-presence__choices">
              {(
                [
                  ['city', copy.presence.city],
                  ['country', copy.presence.country],
                  ['journey', copy.presence.journeyOnly],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="squad-presence__choice">
                  <input
                    type="radio"
                    name={`squad-origin-${profile.id}`}
                    value={value}
                    checked={visibilityMode === value}
                    disabled={saving}
                    onChange={() =>
                      void save({
                        visibility: {
                          showExactCity: value === 'city',
                          showCountryOnly: value === 'country',
                        },
                      })
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="squad-presence__toggle">
            <input
              type="checkbox"
              checked={profile.visibility.showAccommodationName}
              disabled={saving}
              onChange={(event) =>
                void save({
                  visibility: { showAccommodationName: event.target.checked },
                })
              }
            />
            <span>
              <b>{copy.presence.stayTitle}</b>
              <small>{copy.presence.stayLead}</small>
            </span>
          </label>

          <label className="squad-presence__toggle">
            <input
              type="checkbox"
              checked={profile.visibility.allowConnectionRequests}
              disabled={saving}
              onChange={(event) =>
                void save({
                  visibility: { allowConnectionRequests: event.target.checked },
                })
              }
            />
            <span>
              <b>{copy.presence.hellosTitle}</b>
              <small>{copy.presence.hellosLead}</small>
            </span>
          </label>

          <label className="squad-presence__toggle">
            <input
              type="checkbox"
              checked={profile.matchingPaused === true}
              disabled={saving}
              onChange={(event) => void save({ matchingPaused: event.target.checked })}
            />
            <span>
              <b>{copy.presence.pauseTitle}</b>
              <small>{copy.presence.pauseLead}</small>
            </span>
          </label>

          <label className="squad-presence__toggle squad-presence__toggle--quiet">
            <input
              type="checkbox"
              checked={profile.visibility.hideProfile}
              disabled={saving}
              onChange={(event) => void save({ visibility: { hideProfile: event.target.checked } })}
            />
            <span>
              <b>{copy.presence.hideTitle}</b>
              <small>{copy.presence.hideLead}</small>
            </span>
          </label>

          <div className="squad-presence__delete">
            {deleteArmed ? (
              <>
                <p>{copy.presence.deleteConfirm}</p>
                <div>
                  <button
                    type="button"
                    className="squad-text-action"
                    disabled={saving}
                    onClick={() => setDeleteArmed(false)}
                  >
                    {copy.profile.cancel}
                  </button>
                  <button
                    type="button"
                    className="squad-text-action squad-text-action--danger"
                    disabled={saving}
                    onClick={() => void remove()}
                  >
                    {copy.presence.deleteConfirmCta}
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="squad-text-action squad-text-action--danger"
                disabled={saving}
                onClick={() => setDeleteArmed(true)}
              >
                {copy.presence.deleteTitle}
              </button>
            )}
          </div>
          {message ? (
            <p className="squad-presence__feedback" role="status">
              {message}
            </p>
          ) : null}
        </div>
      </details>
    </section>
  );
}
