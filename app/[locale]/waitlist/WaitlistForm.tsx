'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, UserCheck } from 'lucide-react';
import { track } from '@vercel/analytics';
import { BrandLogo } from '../../../components/BrandLogo';
import { EventImage } from '../../../components/EventImage';
import { SuccessState } from '../../../components/states/SuccessState';
import { ThinkingDots } from '../../../components/states/ThinkingDots';
import {
  WaitlistFormError,
  type WaitlistErrorKind,
} from '../../../components/states/WaitlistFormError';
import type { FestivalAtmosphere } from '../../../lib/festival-atmosphere';
import {
  getMessages,
  localizedPath,
  type Locale,
} from '../../../lib/i18n';

export type WaitlistFestivalWorld = {
  name: string;
  date: string;
  location: string;
  imageSrc?: string;
  atmosphere: FestivalAtmosphere;
  fromQuery: boolean;
  matched: boolean;
};

type WaitlistFormProps = {
  initialEvent?: string;
  initialNote?: string;
  locale: Locale;
  festival: WaitlistFestivalWorld;
};

const WAITLIST_JOINED_KEY = 'sync_waitlist_joined';

function buildJourneyMoments(
  t: ReturnType<typeof getMessages>['waitlist'],
  festival: WaitlistFestivalWorld,
) {
  const place = festival.location || festival.name;
  const hasConcretePlace = Boolean(festival.matched && festival.location);

  return [
    {
      key: 'place',
      title: hasConcretePlace
        ? t.momentPlaceTitle.replace('{place}', place)
        : t.momentPlaceTitleFallback,
      line: hasConcretePlace ? t.momentPlaceLine : t.momentPlaceLineFallback,
      peak: false,
    },
    {
      key: 'sound',
      title: t.momentSoundTitle,
      line: festival.matched
        ? t.momentSoundLine.replace('{festival}', festival.name)
        : t.momentSoundLineFallback,
      peak: false,
    },
    {
      key: 'threshold',
      title: t.momentThresholdTitle,
      line: t.momentThresholdLine,
      peak: true,
    },
  ] as const;
}

export function WaitlistForm({
  initialEvent = '',
  initialNote = '',
  locale,
  festival,
}: WaitlistFormProps) {
  const t = getMessages(locale);
  const [sent, setSent] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorKind, setErrorKind] = useState<WaitlistErrorKind | null>(null);
  const [showDetails, setShowDetails] = useState(Boolean(initialEvent || initialNote));
  const [shareCopied, setShareCopied] = useState(false);

  const headingLine1 = festival.fromQuery
    ? t.waitlist.headingFestivalLine1
    : t.waitlist.headingLine1;
  const headingLine2 = festival.fromQuery
    ? t.waitlist.headingFestivalLine2
    : t.waitlist.headingLine2;
  const lead = festival.fromQuery
    ? t.waitlist.leadFestival.replace('{festival}', festival.name)
    : t.waitlist.lead;
  const momentsTitle = festival.matched
    ? t.waitlist.momentsTitle.replace('{festival}', festival.name)
    : festival.fromQuery
      ? t.waitlist.momentsTitleWish
      : t.waitlist.momentsTitle.replace('{festival}', festival.name);
  const formCue = festival.matched
    ? t.waitlist.formFestivalCue.replace('{festival}', festival.name)
    : festival.fromQuery
      ? t.waitlist.formWishCue
      : t.waitlist.formFestivalCue.replace('{festival}', festival.name);
  const moments = buildJourneyMoments(t.waitlist, festival);

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
      <section
        className="ai-hero ai-hero--statement waitlist-hero home-hero"
        aria-labelledby="waitlist-title"
        data-atmosphere={festival.atmosphere}
      >
        <div className="home-hero__media" aria-hidden={!festival.imageSrc}>
          {festival.imageSrc ? (
            <EventImage
              src={festival.imageSrc}
              alt={festival.name}
              className="home-hero__photo"
              priority
              sizes="100vw"
            />
          ) : (
            <Image
              className="home-hero__photo home-hero__photo--fallback"
              src="/images/home/squad-planner.png?v=20260705"
              alt=""
              fill
              priority
              sizes="100vw"
              unoptimized
            />
          )}
          <div className="home-hero__shade" aria-hidden />
        </div>

        <div className="ai-hero__atmosphere" aria-hidden="true">
          <div className="ai-hero__mesh" />
          <div className="ai-hero__glow ai-hero__glow--warm" />
          <div className="ai-hero__glow ai-hero__glow--cool" />
          <div className="ai-hero__spotlight" />
          <div className="ai-hero__stage">
            <span className="ai-hero__stage-light ai-hero__stage-light--left" />
            <span className="ai-hero__stage-light ai-hero__stage-light--right" />
            <span className="ai-hero__stage-arc" />
            <span className="ai-hero__crowd" />
          </div>
          <div className="ai-hero__grain" />
        </div>

        <div className="container ai-hero__grid">
          <div className="ai-hero__copy waitlist-hero__copy">
            <div className="ai-hero__head">
              <BrandLogo className="waitlist-hero__brand home-hero__brand" height={36} />

              <h1 className="ai-hero__title" id="waitlist-title">
                <span className="ai-hero__headline">{headingLine1}</span>
                <span className="ai-hero__headline ai-hero__headline--accent">
                  {headingLine2}
                </span>
              </h1>

              <p className="lead ai-hero__lead">{lead}</p>

              <p className="ai-hero__festival-meta">
                <span className="ai-hero__festival-name">{festival.name}</span>
                {festival.date ? (
                  <>
                    <span className="ai-hero__festival-sep" aria-hidden="true">
                      ·
                    </span>
                    <span>{festival.date}</span>
                  </>
                ) : null}
                {festival.location ? (
                  <>
                    <span className="ai-hero__festival-sep" aria-hidden="true">
                      ·
                    </span>
                    <span>{festival.location}</span>
                  </>
                ) : null}
              </p>
            </div>

            <div className="ai-hero__ctas">
              <a className="button button--glow ai-hero__cta-primary" href="#waitlist-join">
                {t.waitlist.joinCta}
              </a>
              <Link className="ai-hero__cta-text" href={localizedPath(locale, '/events')}>
                {t.waitlist.exploreCta}
                <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        className="section waitlist-scene waitlist-scene--moments"
        aria-labelledby="waitlist-moments-title"
        data-reveal
        data-atmosphere={festival.atmosphere}
      >
        <div className="container">
          <div className="waitlist-moments">
            <div className="waitlist-moments__intro">
              <h2 id="waitlist-moments-title" className="waitlist-moments__title">
                {momentsTitle}
              </h2>
            </div>

            <ol className="waitlist-moments__list" aria-label={t.waitlist.momentsLabel}>
              {moments.map((moment) => (
                <li
                  className={`waitlist-moments__item${moment.peak ? ' waitlist-moments__item--peak' : ''}`}
                  key={moment.key}
                >
                  <h3 className="waitlist-moments__item-title">{moment.title}</h3>
                  <p className="waitlist-moments__item-line">{moment.line}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section
        className="section waitlist-scene waitlist-scene--join"
        id="waitlist-join"
        aria-labelledby="waitlist-form-title"
        data-reveal
      >
        <div className="container">
          <div className="waitlist-join" data-atmosphere={festival.atmosphere}>
            <div className="waitlist-join__atmosphere" aria-hidden="true">
              <div className="waitlist-join__glow waitlist-join__glow--primary" />
              <div className="waitlist-join__glow waitlist-join__glow--accent" />
              <div className="waitlist-join__gate" />
            </div>

            <div className="waitlist-join__intro">
              <p className="waitlist-join__eyebrow">{t.waitlist.formEyebrow}</p>
              <h2 id="waitlist-form-title" className="waitlist-join__title">
                {t.waitlist.formTitle}
              </h2>
              <p className="waitlist-join__subtitle">{t.waitlist.formSubtitle}</p>
              <p className="waitlist-join__cue">{formCue}</p>
            </div>

            <form className="waitlist-form" onSubmit={handleSubmit} noValidate>
              <div className="waitlist-form__field">
                <label className="waitlist-form__label visually-hidden" htmlFor="waitlist-email">
                  {t.waitlist.contactLabel}
                </label>
                <input
                  className="field-input waitlist-form__signal"
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
                <span>
                  {t.waitlist.privacy}{' '}
                  <Link className="waitlist-form__privacy-link" href={localizedPath(locale, '/privacy')}>
                    {t.waitlist.privacyPolicy}
                  </Link>
                </span>
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
