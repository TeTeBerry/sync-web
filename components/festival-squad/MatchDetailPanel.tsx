'use client';

import { useEffect, useId, useState } from 'react';
import { track } from '@vercel/analytics';
import {
  createConnectionRequest,
  getConnectionRequests,
  type FestivalSquadProfile,
  type SquadMatch,
} from '../../lib/festival-squad';
import {
  isPrivateProfileDetail,
  recordConnectionRequestServer,
  recordPrivateProfileViewServer,
} from '../../lib/auth/client-limits';
import type { Locale } from '../../lib/i18n';
import {
  formatSquadDate,
  lookingLabel,
  matchAffinityText,
  type SquadCopy,
} from './squad-labels';

type MatchDetailPanelProps = {
  match: SquadMatch;
  viewer: FestivalSquadProfile;
  locale: Locale;
  copy: SquadCopy;
  eventTitle: string;
  onConnectionChange: () => void;
  authUserId?: string | null;
  signedIn?: boolean;
  canSendConnectionRequest?: boolean;
  canUseMessaging?: boolean;
  /** After login, resume the connection compose UI. */
  autoCompose?: boolean;
  onRequireAuth?: () => void;
  onAutoComposeConsumed?: () => void;
};

const REQUEST_MESSAGE_MAX = 140;

/** Inline journey reveal + one-line hello gesture. */
export function MatchDetailPanel({
  match,
  viewer,
  locale,
  copy,
  eventTitle,
  onConnectionChange,
  authUserId = null,
  signedIn = false,
  canSendConnectionRequest = false,
  autoCompose = false,
  onRequireAuth,
  onAutoComposeConsumed,
}: MatchDetailPanelProps) {
  const titleId = useId();
  const p = match.profile;
  const [existing, setExisting] = useState<import('../../lib/festival-squad').SquadConnectionRequest | null>(null);
  const acceptsRequests = p.visibility.allowConnectionRequests !== false;
  const intent =
    p.lookingFor.find((item) => viewer.lookingFor.includes(item)) ??
    viewer.lookingFor[0] ??
    'festival_buddy';

  const softHello = copy.request.intro
    .replace('{festival}', eventTitle)
    .replace('{city}', viewer.originCity)
    .replace('{date}', formatSquadDate(viewer.arrivalDate, locale))
    .slice(0, REQUEST_MESSAGE_MAX);

  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState(softHello);
  const [status, setStatus] = useState<'idle' | 'sending' | 'error' | 'limit' | 'view_limit'>(
    'idle',
  );
  const [viewBlocked, setViewBlocked] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    void getConnectionRequests().then(({ sent }) => {
      setExisting(sent.find((item) => item.senderProfileId === viewer.id && item.receiverProfileId === p.id) ?? null);
    }).catch(() => setExisting(null));
  }, [signedIn, viewer.id, p.id]);

  useEffect(() => {
    setComposing(false);
    setMessage(softHello);
    setStatus('idle');
    setViewBlocked(false);
  }, [match.profile.id, softHello]);

  useEffect(() => {
    if (!autoCompose || !signedIn || !acceptsRequests) return;
    if (existing && existing.status !== 'cancelled' && existing.status !== 'error') return;
    setComposing(true);
    onAutoComposeConsumed?.();
  }, [autoCompose, signedIn, acceptsRequests, existing?.status, existing?.id, onAutoComposeConsumed]);

  useEffect(() => {
    if (!signedIn || !authUserId) return;
    if (!isPrivateProfileDetail(p.visibility)) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await recordPrivateProfileViewServer();
        if (cancelled) return;
        if (!result.allowed) {
          setViewBlocked(true);
          setStatus('view_limit');
        }
      } catch {
        // Soft-fail: still show public affinity reasons if limit API errors.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, authUserId, p.id, p.visibility]);

  async function send() {
    if (!acceptsRequests || !message.trim() || viewBlocked) return;
    if (!signedIn) {
      onRequireAuth?.();
      return;
    }
    if (!canSendConnectionRequest) {
      setStatus('error');
      return;
    }

    setStatus('sending');
    try {
      const limit = await recordConnectionRequestServer();
      if (!limit.allowed) {
        setStatus('limit');
        track('squad_connection_request_failed', {
          event: String(viewer.eventId),
          locale,
          reason: 'daily_limit',
        });
        return;
      }

      const created = await createConnectionRequest({
        receiverProfileId: p.id,
        eventId: viewer.eventId,
        intent,
        message: message.trim().slice(0, REQUEST_MESSAGE_MAX),
      });
      setExisting(created);
      track('squad_connection_requested', {
        event: String(viewer.eventId),
        locale,
        intent,
      });
      setComposing(false);
      onConnectionChange();
      setStatus('idle');
    } catch {
      setStatus('error');
      track('squad_connection_request_failed', {
        event: String(viewer.eventId),
        locale,
      });
    }
  }

  function beginCompose() {
    if (!signedIn) {
      onRequireAuth?.();
      return;
    }
    if (viewBlocked) return;
    setComposing(true);
  }

  if (viewBlocked) {
    return (
      <div className="squad-journey-reveal" aria-labelledby={titleId}>
        <p id={titleId} className="squad-journey-reveal__kicker">
          {copy.detail.whyTitle}
        </p>
        <p className="squad-form__error" role="status">
          Hourly private profile view limit reached. Try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="squad-journey-reveal" aria-labelledby={titleId}>
      <p id={titleId} className="squad-journey-reveal__kicker">
        {copy.detail.whyTitle}
      </p>
      <p className="squad-journey-reveal__affinity">{matchAffinityText(match, copy)}</p>

      <ul className="squad-journey-reveal__reasons">
        {match.reasons.slice(0, featuredReasonCount(match)).map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      {p.shortNote ? <p className="squad-journey-reveal__note">{p.shortNote}</p> : null}

      <p className="squad-journey-reveal__looking">
        {p.lookingFor.map((item) => lookingLabel(item, copy)).join(' · ')}
      </p>

      {!acceptsRequests ? (
        <p className="squad-journey-reveal__status" role="status">
          {copy.detail.requestsClosed}
        </p>
      ) : existing && existing.status !== 'cancelled' && existing.status !== 'error' ? (
        <div className="squad-journey-reveal__status-row">
          <p className="squad-journey-reveal__status" role="status">
            {existing.status === 'accepted'
              ? copy.request.accepted
              : existing.status === 'declined'
                ? copy.request.declined
                : copy.request.sent}
          </p>
        </div>
      ) : composing ? (
        <div className="squad-hello">
          <label className="visually-hidden" htmlFor={`${titleId}-hello`}>
            {copy.request.messageLabel}
          </label>
          <input
            id={`${titleId}-hello`}
            className="squad-hello__line"
            type="text"
            value={message}
            maxLength={REQUEST_MESSAGE_MAX}
            onChange={(event) => setMessage(event.target.value.slice(0, REQUEST_MESSAGE_MAX))}
          />
          <p className="squad-hello__trust">{copy.request.safetyBefore}</p>
          {status === 'error' ? <p className="squad-form__error">{copy.request.error}</p> : null}
          {status === 'limit' ? (
            <p className="squad-form__error" role="status">
              Daily connection request limit reached. Try again tomorrow.
            </p>
          ) : null}
          <div className="squad-hello__actions">
            <button type="button" className="squad-text-action" onClick={() => setComposing(false)}>
              {copy.profile.cancel}
            </button>
            <button
              type="button"
              className="button"
              disabled={!message.trim() || status === 'sending'}
              onClick={send}
            >
              {status === 'sending' ? copy.request.sending : copy.request.send}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="squad-text-action squad-hello__invite"
          onClick={beginCompose}
        >
          {copy.detail.sendRequest}
        </button>
      )}
    </div>
  );
}

function featuredReasonCount(match: SquadMatch): number {
  return match.label === 'excellent' || match.label === 'strong' ? 4 : 3;
}
