'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Shield, Sparkles, UserCheck } from 'lucide-react';
import { track } from '@vercel/analytics';
import { SuccessState } from '../../../components/states/SuccessState';
import { ThinkingDots } from '../../../components/states/ThinkingDots';
import {
  WaitlistFormError,
  type WaitlistErrorKind,
} from '../../../components/states/WaitlistFormError';
import { WaitlistAccessCard } from '../../../components/WaitlistAccessCard';
import {
  getMessages,
  localizedPath,
  type Locale,
} from '../../../lib/i18n';

type WaitlistFormProps = {
  initialEvent?: string;
  initialNote?: string;
  locale: Locale;
};

const WAITLIST_JOINED_KEY = 'sync_waitlist_joined';

export function WaitlistForm({ initialEvent = '', initialNote = '', locale }: WaitlistFormProps) {
  const t = getMessages(locale);
  const [sent, setSent] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorKind, setErrorKind] = useState<WaitlistErrorKind | null>(null);
  const [showDetails, setShowDetails] = useState(Boolean(initialEvent || initialNote));
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(WAITLIST_JOINED_KEY) === '1') {
        setAlreadyJoined(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorKind(null);
    setSending(true);

    const form = new FormData(e.currentTarget);
    const email = (form.get('email') as string)?.trim() || '';
    const body = {
      email,
      event: (form.get('event') as string)?.trim() || '',
      note: (form.get('note') as string)?.trim() || '',
      sourcePath: `${window.location.pathname}${window.location.search}`,
      locale,
    };

    if (!email && !body.note) {
      setErrorKind('validation');
      setSending(false);
      return;
    }

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; code?: WaitlistErrorKind };

      if (!res.ok) {
        const kind: WaitlistErrorKind =
          data.code === 'duplicate' ||
          data.code === 'validation' ||
          data.code === 'network' ||
          data.code === 'server'
            ? data.code
            : 'server';
        track('waitlist_submit_error', {
          event: body.event || 'none',
          sourcePath: body.sourcePath,
          reason: data.error || kind,
          locale,
        });
        if (kind === 'duplicate') {
          try {
            window.localStorage.setItem(WAITLIST_JOINED_KEY, '1');
          } catch {
            // localStorage unavailable
          }
          setAlreadyJoined(true);
          return;
        }
        setErrorKind(kind);
        return;
      }

      track('waitlist_submit_success', {
        event: body.event || 'none',
        sourcePath: body.sourcePath,
        locale,
      });
      try {
        window.localStorage.setItem(WAITLIST_JOINED_KEY, '1');
      } catch {
        // localStorage unavailable
      }
      setAlreadyJoined(true);
      setSent(true);
    } catch {
      track('waitlist_submit_error', {
        event: body.event || 'none',
        sourcePath: body.sourcePath,
        reason: 'network',
        locale,
      });
      setErrorKind('network');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <main className="waitlist-page">
        <SuccessState
          id="waitlist-success-title"
          variant="page"
          icon={Check}
          title={t.waitlist.doneTitle}
          lead={t.waitlist.doneLead}
          eyebrow={
            <div className="ai-badge">
              <Sparkles size={13} strokeWidth={2.25} aria-hidden />
              <span>{t.waitlist.doneEyebrow}</span>
            </div>
          }
          nextLabel={t.waitlist.doneNextLabel}
          nextSteps={t.waitlist.doneNext}
          actions={
            <>
              <Link className="button button--glow" href={localizedPath(locale, '/events')}>
                {t.waitlist.eventsCta}
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
              </Link>
              <Link className="waitlist-success__secondary" href={localizedPath(locale)}>
                {t.waitlist.homeCta}
              </Link>
              <button
                className="waitlist-success__secondary"
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(window.location.href).then(() => {
                    setShareCopied(true);
                    window.setTimeout(() => setShareCopied(false), 2800);
                  });
                }}
              >
                {shareCopied ? t.waitlist.shareCopied : t.waitlist.shareCta}
              </button>
            </>
          }
        />
      </main>
    );
  }

  if (alreadyJoined && !showResubmit) {
    return (
      <main className="waitlist-page">
        <SuccessState
          id="waitlist-joined-title"
          variant="page"
          icon={UserCheck}
          iconTone="accent"
          title={t.waitlist.alreadyTitle}
          lead={t.waitlist.alreadyLead}
          className="success-state--joined"
          eyebrow={
            <div className="ai-badge">
              <Sparkles size={13} strokeWidth={2.25} aria-hidden />
              <span>{t.waitlist.alreadyEyebrow}</span>
            </div>
          }
          nextLabel={t.waitlist.alreadyNextLabel}
          nextSteps={t.waitlist.alreadyNext}
          actions={
            <>
              <Link className="button button--glow" href={localizedPath(locale, '/events')}>
                {t.waitlist.alreadyBrowse}
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
              </Link>
              <button
                className="waitlist-success__secondary"
                type="button"
                onClick={() => setShowResubmit(true)}
              >
                {t.waitlist.alreadyResubmit}
              </button>
              <Link className="waitlist-success__secondary" href={localizedPath(locale)}>
                {t.waitlist.alreadyHome}
              </Link>
            </>
          }
        />
      </main>
    );
  }

  return (
    <main className="waitlist-page">
      <section className="waitlist-hero ai-hero ai-hero--split" aria-labelledby="waitlist-title">
        <div className="ai-hero__atmosphere" aria-hidden="true">
          <div className="ai-hero__mesh" />
          <div className="ai-hero__glow ai-hero__glow--warm" />
          <div className="ai-hero__glow ai-hero__glow--cool" />
          <div className="ai-hero__spotlight" />
          <div className="ai-hero__grain" />
        </div>

        <div className="container ai-hero__grid waitlist-hero__grid">
          <div className="waitlist-hero__copy">
            <div className="ai-badge">
              <Sparkles size={13} strokeWidth={2.25} aria-hidden />
              <span>{t.waitlist.badge}</span>
            </div>

            <h1 className="ai-hero__title" id="waitlist-title">
              <span className="ai-hero__headline">{t.waitlist.headingLine1}</span>
              <span className="ai-hero__headline ai-hero__headline--accent">{t.waitlist.headingLine2}</span>
            </h1>

            <p className="lead ai-hero__lead">{t.waitlist.lead}</p>

            <ul className="waitlist-benefits" aria-label={t.waitlist.benefitsLabel}>
              {t.waitlist.benefits.map((benefit) => (
                <li className="waitlist-benefits__item" key={benefit.title}>
                  <span className="waitlist-benefits__marker" aria-hidden="true" />
                  <div>
                    <strong>{benefit.title}</strong>
                    <p>{benefit.description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="waitlist-trust" aria-label={t.waitlist.trustLabel}>
              {t.waitlist.trust.map((item) => (
                <span className="waitlist-trust__item" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="waitlist-hero__panel">
            <WaitlistAccessCard
              badge={t.waitlist.card.badge}
              status={t.waitlist.card.status}
              perks={t.waitlist.card.perks}
            />

            <div className="waitlist-panel surface-panel">
              <div className="waitlist-panel__head">
                <h2 className="waitlist-panel__title">{t.waitlist.formTitle}</h2>
                <p className="waitlist-panel__subtitle">{t.waitlist.formSubtitle}</p>
              </div>

              <form className="waitlist-form" onSubmit={handleSubmit} noValidate>
                <div className="waitlist-form__field">
                  <label className="waitlist-form__label" htmlFor="waitlist-email">
                    {t.waitlist.contactLabel}
                  </label>
                  <input
                    className="field-input"
                    id="waitlist-email"
                    name="email"
                    type="text"
                    autoComplete="email"
                    placeholder={t.waitlist.contactPlaceholder}
                    required
                  />
                </div>

                {showDetails ? (
                  <div className="waitlist-form__details is-expanded">
                    <div className="waitlist-form__details-inner">
                    <div className="waitlist-form__field">
                      <label className="waitlist-form__label" htmlFor="waitlist-event">
                        {t.waitlist.eventLabel}
                        <span className="waitlist-form__optional">{t.waitlist.optional}</span>
                      </label>
                      <input
                        className="field-input"
                        id="waitlist-event"
                        name="event"
                        placeholder={t.waitlist.eventPlaceholder}
                        defaultValue={initialEvent}
                      />
                    </div>
                    <div className="waitlist-form__field">
                      <label className="waitlist-form__label" htmlFor="waitlist-note">
                        {t.waitlist.noteLabel}
                        <span className="waitlist-form__optional">{t.waitlist.optional}</span>
                      </label>
                      <textarea
                        className="field-input"
                        id="waitlist-note"
                        name="note"
                        placeholder={t.waitlist.notePlaceholder}
                        defaultValue={initialNote}
                        rows={3}
                      />
                    </div>
                    </div>
                  </div>
                ) : (
                  <button
                    className="waitlist-form__expand"
                    type="button"
                    onClick={() => setShowDetails(true)}
                  >
                    {t.waitlist.expandDetails}
                  </button>
                )}

                {errorKind ? (
                  <WaitlistFormError
                    kind={errorKind}
                    title={t.waitlist.errors[errorKind].title}
                    lead={t.waitlist.errors[errorKind].lead}
                    retryLabel={t.waitlist.errorRetry}
                    onRetry={
                      errorKind === 'duplicate'
                        ? undefined
                        : () => setErrorKind(null)
                    }
                  />
                ) : null}

                <button
                  className={`button button--glow waitlist-form__submit${sending ? ' is-loading is-shimmer-loading' : ''}`}
                  type="submit"
                  disabled={sending}
                  aria-busy={sending}
                >
                  {sending ? (
                    <>
                      <ThinkingDots size="sm" className="button-loading-dots" />
                      <span>{t.waitlist.sending}</span>
                    </>
                  ) : (
                    <>
                      {t.waitlist.submit}
                      <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
                    </>
                  )}
                </button>

                <p className="waitlist-form__privacy">
                  <Shield size={13} strokeWidth={2} aria-hidden />
                  <span>{t.waitlist.privacy}</span>
                </p>
              </form>

              <Link className="waitlist-panel__browse" href={localizedPath(locale, '/events')}>
                {t.waitlist.browseEvents}
                <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
