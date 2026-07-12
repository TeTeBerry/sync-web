'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { track } from '@vercel/analytics';
import {
  getConnectionRequests,
  localizeMatchReasonCodes,
  respondToConnectionRequest,
  type SquadConnectionRequest,
} from '../../lib/festival-squad';
import type { Locale } from '../../lib/i18n';
import { formatSquadDate, lookingLabel, type SquadCopy } from './squad-labels';

type InboxState = {
  sent: SquadConnectionRequest[];
  received: SquadConnectionRequest[];
};

type SquadRequestInboxProps = {
  eventId: number;
  eventTitle: string;
  locale: Locale;
  copy: SquadCopy;
  refreshTick?: number;
};

export function SquadRequestInbox({
  eventId,
  eventTitle,
  locale,
  copy,
  refreshTick = 0,
}: SquadRequestInboxProps) {
  const [data, setData] = useState<InboxState | null>(null);
  const [error, setError] = useState(false);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(() => {
    void getConnectionRequests()
      .then((next) => {
        const localize = (items: SquadConnectionRequest[]) =>
          items.map((item) => ({
            ...item,
            reasons: item.reasons
              ? localizeMatchReasonCodes(item.reasons, copy.matchReasons, {
                  artists: item.sharedArtistIds?.length,
                })
              : item.reasons,
          }));
        setData({
          sent: localize(next.sent),
          received: localize(next.received),
        });
        setError(false);
      })
      .catch(() => setError(true));
  }, [copy.matchReasons]);

  useEffect(() => {
    load();
    track('squad_request_inbox_viewed', { event: String(eventId), locale });
  }, [eventId, load, locale, refreshTick]);

  const received = useMemo(
    () => data?.received.filter((item) => item.eventId === eventId) ?? [],
    [data, eventId],
  );
  const sent = useMemo(
    () => data?.sent.filter((item) => item.eventId === eventId) ?? [],
    [data, eventId],
  );
  const connected = [...received, ...sent].filter(
    (item, index, all) =>
      item.status === 'accepted' &&
      all.findIndex((candidate) => candidate.id === item.id) === index,
  );
  const pendingReceived = received.filter((item) => item.status === 'pending').length;

  useEffect(() => {
    if (received.length) {
      track('squad_request_received_viewed', {
        event: String(eventId),
        locale,
        count: received.length,
      });
    }
    if (connected.length) {
      track('squad_connection_viewed', {
        event: String(eventId),
        locale,
        count: connected.length,
      });
    }
  }, [connected.length, eventId, locale, received.length]);

  async function act(
    request: SquadConnectionRequest,
    status: 'accepted' | 'declined' | 'cancelled',
  ) {
    setFeedback('');
    try {
      await respondToConnectionRequest(request.id, status);
      track(`squad_request_${status}`, { event: String(eventId), locale });
      setFeedback(copy.inbox.feedback[status]);
      load();
    } catch {
      track('squad_request_action_failed', { event: String(eventId), locale });
      setFeedback(copy.inbox.actionFailed);
    }
  }

  if (error && !data) {
    return (
      <section
        className="squad-connections squad-connections--state"
        aria-labelledby="squad-connections-title"
      >
        <p className="squad-connections__kicker">{copy.inbox.kicker}</p>
        <h2 id="squad-connections-title" className="squad-connections__title">
          {copy.inbox.errorTitle}
        </h2>
        <p className="squad-connections__lead">{copy.inbox.errorLead}</p>
        <button className="squad-text-action" type="button" onClick={load}>
          {copy.inbox.retry}
        </button>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="squad-connections squad-connections--state" role="status">
        <p className="squad-connections__kicker">{copy.inbox.kicker}</p>
        <p className="squad-connections__lead">{copy.inbox.loading}</p>
      </section>
    );
  }

  return (
    <section className="squad-connections" aria-labelledby="squad-connections-title">
      <header className="squad-connections__header">
        <div>
          <p className="squad-connections__kicker">{copy.inbox.kicker}</p>
          <h2 id="squad-connections-title" className="squad-connections__title">
            {copy.inbox.title}
          </h2>
        </div>
        {pendingReceived ? (
          <p
            className="squad-connections__pulse"
            aria-label={copy.inbox.pendingCount.replace('{count}', String(pendingReceived))}
          >
            <span aria-hidden />
            {copy.inbox.pendingCount.replace('{count}', String(pendingReceived))}
          </p>
        ) : null}
      </header>
      <p className="squad-connections__lead">{copy.inbox.lead}</p>
      {feedback ? (
        <p className="squad-connections__feedback" role="status">
          {feedback}
        </p>
      ) : null}

      {connected.length ? (
        <div className="squad-connections__connected">
          <p className="squad-connections__chapter-label">{copy.inbox.connectedTitle}</p>
          {connected.map((request) => (
            <AcceptedConnection
              key={request.id}
              request={request}
              eventTitle={eventTitle}
              locale={locale}
              copy={copy}
            />
          ))}
        </div>
      ) : null}

      <div className="squad-connections__threads">
        <RequestThread
          title={copy.inbox.receivedTitle}
          empty={copy.inbox.receivedEmpty}
          items={received.filter((item) => item.status !== 'accepted')}
          direction="received"
          eventTitle={eventTitle}
          locale={locale}
          copy={copy}
          onAction={act}
        />
        <RequestThread
          title={copy.inbox.sentTitle}
          empty={copy.inbox.sentEmpty}
          items={sent.filter((item) => item.status !== 'accepted')}
          direction="sent"
          eventTitle={eventTitle}
          locale={locale}
          copy={copy}
          onAction={act}
        />
      </div>
    </section>
  );
}

function RequestThread({
  title,
  empty,
  items,
  direction,
  eventTitle,
  locale,
  copy,
  onAction,
}: {
  title: string;
  empty: string;
  items: SquadConnectionRequest[];
  direction: 'received' | 'sent';
  eventTitle: string;
  locale: Locale;
  copy: SquadCopy;
  onAction: (
    request: SquadConnectionRequest,
    status: 'accepted' | 'declined' | 'cancelled',
  ) => void;
}) {
  return (
    <details
      className="squad-connection-thread"
      open={direction === 'received' && items.length > 0}
    >
      <summary>
        <span>{title}</span>
        <span className="squad-connection-thread__count">{items.length}</span>
      </summary>
      <div className="squad-connection-thread__body">
        {items.length ? (
          items.map((item) => (
            <RequestMoment
              key={item.id}
              request={item}
              direction={direction}
              eventTitle={eventTitle}
              locale={locale}
              copy={copy}
              onAction={onAction}
            />
          ))
        ) : (
          <p className="squad-connection-thread__empty">{empty}</p>
        )}
      </div>
    </details>
  );
}

function RequestMoment({
  request,
  direction,
  eventTitle,
  locale,
  copy,
  onAction,
}: {
  request: SquadConnectionRequest;
  direction: 'received' | 'sent';
  eventTitle: string;
  locale: Locale;
  copy: SquadCopy;
  onAction: (
    request: SquadConnectionRequest,
    status: 'accepted' | 'declined' | 'cancelled',
  ) => void;
}) {
  const traveler = request.counterpart;
  const created = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(request.createdAt));

  return (
    <article className="squad-request-moment">
      <div className="squad-request-moment__marker" aria-hidden />
      <div className="squad-request-moment__content">
        <div className="squad-request-moment__heading">
          <h3>{traveler?.displayName ?? copy.inbox.travelerFallback}</h3>
          <p>{copy.inbox.status[request.status] ?? request.status}</p>
        </div>
        <p className="squad-request-moment__path">
          {[
            eventTitle,
            traveler?.originCity || copy.inbox.originPrivate,
            traveler?.arrivalDate
              ? copy.card.arriving.replace('{date}', formatSquadDate(traveler.arrivalDate, locale))
              : null,
            lookingLabel(request.intent, copy),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {request.reasons?.length ? (
          <p className="squad-request-moment__reasons">{request.reasons.slice(0, 2).join(' · ')}</p>
        ) : null}
        <blockquote>{request.message}</blockquote>
        <p className="squad-request-moment__time">{created}</p>
        {request.status === 'pending' ? (
          <div className="squad-request-moment__actions">
            {direction === 'received' ? (
              <>
                <button
                  className="button"
                  type="button"
                  onClick={() => onAction(request, 'accepted')}
                >
                  {copy.inbox.accept}
                </button>
                <button
                  className="squad-text-action"
                  type="button"
                  onClick={() => onAction(request, 'declined')}
                >
                  {copy.inbox.decline}
                </button>
              </>
            ) : (
              <button
                className="squad-text-action"
                type="button"
                onClick={() => onAction(request, 'cancelled')}
              >
                {copy.inbox.cancel}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function AcceptedConnection({
  request,
  eventTitle,
  locale,
  copy,
}: {
  request: SquadConnectionRequest;
  eventTitle: string;
  locale: Locale;
  copy: SquadCopy;
}) {
  const traveler = request.counterpart;

  return (
    <article className="squad-connection">
      <p className="squad-connection__eyebrow">{copy.inbox.connectedEyebrow}</p>
      <h3>
        {copy.inbox.connectedWith.replace(
          '{name}',
          traveler?.displayName ?? copy.inbox.travelerFallback,
        )}
      </h3>
      <p className="squad-connection__festival">{eventTitle}</p>
      <p className="squad-connection__path">
        {[
          traveler?.originCity || copy.inbox.originPrivate,
          traveler?.arrivalDate
            ? copy.card.arriving.replace('{date}', formatSquadDate(traveler.arrivalDate, locale))
            : null,
          traveler?.accommodationType
            ? copy.card.staying.replace('{place}', traveler.accommodationType)
            : null,
          lookingLabel(request.intent, copy),
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {request.reasons?.length ? (
        <ul className="squad-connection__reasons">
          {request.reasons.slice(0, 3).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {traveler?.shortNote ? (
        <p className="squad-connection__note">“{traveler.shortNote}”</p>
      ) : null}
      <div className="squad-connection__unavailable">
        <p>{copy.inbox.messagingUnavailable}</p>
      </div>
      <p className="squad-connection__safety">{copy.inbox.safety}</p>
    </article>
  );
}
