'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  Calendar,
  MapPin,
  Music2,
  RefreshCw,
  Sparkles,
  Users,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { track } from '@vercel/analytics';
import { PlannerSuccessPanel } from './states/PlannerSuccessPanel';
import { ThinkingDots } from './states/ThinkingDots';
import { useTypingEffect } from '../hooks/useTypingEffect';
import { localizedPath, type Locale } from '../lib/i18n';

type Suggestion = {
  icon: 'music' | 'users' | 'wallet';
  title: string;
  prompt: string;
};

type PreviewContent = {
  badge: string;
  emptyGreeting: string;
  emptyHint: string;
  capabilities: readonly [string, string, string];
  prompt: string;
  thinking: string;
  replyIntro: string;
  days: readonly { label: string; detail: string }[];
  budget: { label: string; value: string };
  chips: readonly [string, string, string, string];
};

type AiPlannerExperienceProps = {
  locale: Locale;
  placeholder: string;
  enterHint: string;
  submitLabel: string;
  suggestions: readonly Suggestion[];
  suggestionsLabel: string;
  placeholderVariants: readonly string[];
  tryCta: string;
  followUpLabel: string;
  followUps: readonly string[];
  preview: PreviewContent;
  successLabels: {
    eyebrow: string;
    title: string;
    lead: string;
    nextLabel: string;
    nextSteps: readonly string[];
    viewPlan: string;
    exploreFestivals: string;
    share: string;
    waitlistCta: string;
    shareCopied: string;
    shareFailed: string;
  };
  errorLabels: {
    title: string;
    lead: string;
    retry: string;
    waitlist: string;
    browse: string;
  };
};

const suggestionIcons = {
  music: Music2,
  users: Users,
  wallet: Wallet,
};

const capabilityIcons = [Music2, MapPin, Wallet];
const chipIcons = [Calendar, MapPin, Users, Wallet];

type DemoStep = 'idle' | 'typing-prompt' | 'thinking' | 'typing-reply' | 'complete';
type UserStep = 'idle' | 'thinking' | 'typing-reply' | 'complete';

export function AiPlannerExperience({
  locale,
  placeholder,
  enterHint,
  submitLabel,
  suggestions,
  suggestionsLabel,
  placeholderVariants,
  tryCta,
  followUpLabel,
  followUps,
  preview,
  successLabels,
  errorLabels,
}: AiPlannerExperienceProps) {
  const router = useRouter();
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState('');
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [demoStep, setDemoStep] = useState<DemoStep>('idle');
  const [userStep, setUserStep] = useState<UserStep>('idle');
  const [userEngaged, setUserEngaged] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const showDemo = !userEngaged && !prompt.trim() && userStep === 'idle';
  const conversationActive = userEngaged || userStep !== 'idle' || (showDemo && demoStep !== 'idle');
  const showEmptyState = showDemo && demoStep === 'idle';
  const showUserFlow = userStep !== 'idle';
  const showThinking = (showDemo && demoStep === 'thinking') || userStep === 'thinking';
  const showReply =
    (showDemo && (demoStep === 'typing-reply' || demoStep === 'complete')) ||
    (showUserFlow && (userStep === 'typing-reply' || userStep === 'complete'));
  const showFollowUps = showDemo && demoStep === 'complete';
  const showPlannerSuccess = userStep === 'complete';

  const { text: typedPrompt, isComplete: promptTyped } = useTypingEffect(preview.prompt, {
    active: showDemo && (demoStep === 'typing-prompt' || demoStep === 'thinking' || demoStep === 'typing-reply' || demoStep === 'complete'),
    interval: 22,
  });

  const { text: typedReply, isComplete: replyTyped } = useTypingEffect(preview.replyIntro, {
    active:
      (showDemo && (demoStep === 'typing-reply' || demoStep === 'complete')) ||
      (showUserFlow && (userStep === 'typing-reply' || userStep === 'complete')),
    interval: 16,
  });

  const showCards =
    (showDemo && demoStep === 'complete' && replyTyped) ||
    (showUserFlow && userStep === 'complete' && replyTyped);

  useEffect(() => {
    if (!showDemo) {
      setDemoStep('idle');
      return;
    }

    const timer = window.setTimeout(() => setDemoStep('typing-prompt'), 1200);
    return () => clearTimeout(timer);
  }, [showDemo]);

  useEffect(() => {
    if (demoStep !== 'typing-prompt' || !promptTyped) return;
    const timer = window.setTimeout(() => setDemoStep('thinking'), 320);
    return () => clearTimeout(timer);
  }, [demoStep, promptTyped]);

  useEffect(() => {
    if (demoStep !== 'thinking') return;
    const timer = window.setTimeout(() => setDemoStep('typing-reply'), 1200);
    return () => clearTimeout(timer);
  }, [demoStep]);

  useEffect(() => {
    if (demoStep !== 'typing-reply' || !replyTyped) return;
    const timer = window.setTimeout(() => setDemoStep('complete'), 280);
    return () => clearTimeout(timer);
  }, [demoStep, replyTyped]);

  useEffect(() => {
    if (userStep !== 'typing-reply' || !replyTyped) return;
    const timer = window.setTimeout(() => setUserStep('complete'), 280);
    return () => clearTimeout(timer);
  }, [userStep, replyTyped]);

  useEffect(() => {
    if (!showDemo || isFocused || prompt.trim()) return;

    const interval = window.setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderVariants.length);
    }, 4200);

    return () => clearInterval(interval);
  }, [showDemo, isFocused, prompt, placeholderVariants.length]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [demoStep, userStep, prompt, userEngaged, typedPrompt, typedReply]);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [prompt, resizeTextarea]);

  const waitlistPath = `${localizedPath(locale, '/waitlist')}?${new URLSearchParams({
    note: submittedPrompt || prompt.trim() || preview.prompt,
  }).toString()}`;

  const startUserGeneration = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isSubmitting || userStep === 'thinking' || userStep === 'typing-reply') return;

      setIsSubmitting(true);
      setSubmitError(false);
      setShareNotice(null);
      setSubmittedPrompt(trimmed);
      setUserEngaged(true);
      setUserStep('thinking');

      track('home_prompt_submit', {
        locale,
        promptLength: trimmed.length,
        source: 'ai-planner',
      });

      window.setTimeout(() => {
        setUserStep('typing-reply');
        setIsSubmitting(false);
      }, 1400);
    },
    [isSubmitting, locale, preview.prompt, userStep],
  );

  const goToWaitlist = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isSubmitting) return;

      setIsSubmitting(true);
      setSubmitError(false);

      const params = new URLSearchParams({ note: trimmed });
      const url = `${localizedPath(locale, '/waitlist')}?${params.toString()}`;

      try {
        router.push(url);
        window.setTimeout(() => {
          setIsSubmitting((current) => {
            if (current) {
              setSubmitError(true);
              return false;
            }
            return current;
          });
        }, 4500);
      } catch {
        setSubmitError(true);
        setIsSubmitting(false);
      }
    },
    [isSubmitting, locale, router],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startUserGeneration(prompt);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      startUserGeneration(prompt);
    }
  }

  function handleViewPlan() {
    cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function handleShare() {
    const shareText = submittedPrompt || prompt.trim() || preview.prompt;
    const shareUrl = `${window.location.origin}${localizedPath(locale)}#ai-planner`;
    const payload = `${shareText}\n${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Raven', text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(payload);
      setShareNotice(successLabels.shareCopied);
    } catch {
      setShareNotice(successLabels.shareFailed);
    }

    window.setTimeout(() => setShareNotice(null), 3200);
  }

  function fillPrompt(value: string) {
    setUserEngaged(true);
    setPrompt(value);
    textareaRef.current?.focus();
  }

  function handlePromptChange(value: string) {
    setUserEngaged(true);
    setPrompt(value);
  }

  const displayPrompt =
    submittedPrompt ||
    prompt.trim() ||
    (showDemo && demoStep !== 'idle' ? typedPrompt : '');
  const isPromptTyping = showDemo && demoStep === 'typing-prompt' && !promptTyped;
  const isReplyTyping =
    (showDemo && demoStep === 'typing-reply' && !replyTyped) ||
    (showUserFlow && userStep === 'typing-reply' && !replyTyped);

  const activePlaceholder =
    showDemo && !isFocused && !prompt.trim()
      ? placeholderVariants[placeholderIndex] ?? placeholder
      : placeholder;

  return (
    <div className="ai-planner">
      <div className="ai-planner__panel">
        {conversationActive && (
          <header className="ai-planner__header">
            <span className="ai-planner__avatar" aria-hidden="true">
              <Sparkles size={14} strokeWidth={2.25} />
            </span>
            <div className="ai-planner__header-copy">
              <span className="ai-planner__header-title">{preview.badge}</span>
              <span className="ai-planner__header-status">
                {locale === 'zh' ? '在线' : 'Online'}
              </span>
            </div>
            <span className="ai-planner__live" aria-hidden="true" />
          </header>
        )}

        <div
          className={`ai-planner__thread${showEmptyState ? ' ai-planner__thread--idle' : ''}`}
          ref={threadRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {showEmptyState && (
            <div className="ai-planner__empty">
              <div className="ai-planner__empty-glow" aria-hidden="true" />
              <div className="ai-planner__empty-icon" aria-hidden="true">
                <Sparkles size={24} strokeWidth={1.75} />
              </div>
              <p className="ai-planner__empty-greeting">{preview.emptyGreeting}</p>
              <p className="ai-planner__empty-hint">{preview.emptyHint}</p>
              <ul className="ai-planner__capabilities">
                {preview.capabilities.map((label, index) => {
                  const Icon = capabilityIcons[index];
                  return (
                    <li className="ai-planner__capability" key={label}>
                      <Icon size={13} strokeWidth={2} aria-hidden />
                      {label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {displayPrompt && (
            <div className="ai-planner__message ai-planner__message--user is-visible">
              <p>
                {displayPrompt}
                {isPromptTyping ? <span className="ai-planner__typing-cursor" aria-hidden /> : null}
              </p>
            </div>
          )}

          {submitError ? (
            <div className="ai-planner__error state-enter" role="alert">
              <div className="ai-planner__error-glow" aria-hidden="true" />
              <div className="ai-planner__error-icon" aria-hidden="true">
                <WifiOff size={16} strokeWidth={2} />
              </div>
              <div className="ai-planner__error-copy">
                <p className="ai-planner__error-title">{errorLabels.title}</p>
                <p className="ai-planner__error-lead">{errorLabels.lead}</p>
              </div>
              <div className="ai-planner__error-actions">
                <button
                  className="ai-planner__error-action"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setSubmitError(false);
                    goToWaitlist(prompt);
                  }}
                >
                  <RefreshCw size={13} strokeWidth={2} aria-hidden />
                  <span>{errorLabels.retry}</span>
                </button>
                <button
                  className="ai-planner__error-action ai-planner__error-action--secondary"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setSubmitError(false);
                    goToWaitlist(prompt.trim() || preview.prompt);
                  }}
                >
                  {errorLabels.waitlist}
                  <ArrowRight size={13} strokeWidth={2.25} aria-hidden />
                </button>
                <Link className="ai-planner__error-link" href={localizedPath(locale, '/events')}>
                  {errorLabels.browse}
                </Link>
              </div>
            </div>
          ) : null}

          {showThinking && (
            <>
              <div className="ai-planner__thinking" aria-label={preview.thinking}>
                <span className="ai-planner__thinking-avatar" aria-hidden="true">
                  <Sparkles size={11} strokeWidth={2.25} />
                </span>
                <div className="ai-planner__thinking-body">
                  <span className="ai-planner__thinking-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="ai-planner__thinking-text">{preview.thinking}</span>
                </div>
              </div>
              <div className="ai-planner__skeleton" aria-hidden="true">
                <div className="ai-planner__skeleton-row">
                  <span className="ai-planner__skeleton-card" />
                  <span className="ai-planner__skeleton-card" />
                  <span className="ai-planner__skeleton-card" />
                </div>
                <span className="ai-planner__skeleton-bar" />
              </div>
            </>
          )}

          {showReply && (
            <div className="ai-planner__message ai-planner__message--ai is-visible">
              <p className="ai-planner__reply-intro">
                {(showDemo || showUserFlow) ? typedReply : preview.replyIntro}
                {isReplyTyping ? <span className="ai-planner__typing-cursor" aria-hidden /> : null}
              </p>

              <div
                className={`ai-planner__cards${showCards ? ' is-visible' : ''}`}
                ref={showUserFlow ? cardsRef : undefined}
              >
                {preview.days.map((day) => (
                  <article className="ai-planner__day-card" key={day.label}>
                    <span className="ai-planner__day-label">{day.label}</span>
                    <p>{day.detail}</p>
                  </article>
                ))}

                <article className="ai-planner__budget-card">
                  <Wallet size={14} strokeWidth={2} aria-hidden />
                  <div>
                    <span className="ai-planner__budget-label">{preview.budget.label}</span>
                    <span className="ai-planner__budget-value">{preview.budget.value}</span>
                  </div>
                </article>
              </div>

              {showCards && (
                <div className="ai-planner__tags">
                  {preview.chips.map((chip, index) => {
                    const Icon = chipIcons[index];
                    return (
                      <span className="ai-planner__tag" key={chip}>
                        <Icon size={12} strokeWidth={2} aria-hidden />
                        {chip}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {showPlannerSuccess ? (
            <PlannerSuccessPanel
              locale={locale}
              eventsPath={localizedPath(locale, '/events')}
              waitlistPath={waitlistPath}
              onViewPlan={handleViewPlan}
              onShare={handleShare}
              labels={successLabels}
            />
          ) : null}

          {shareNotice ? (
            <p className="ai-planner__share-notice state-enter" role="status">
              {shareNotice}
            </p>
          ) : null}
        </div>

        <div className="ai-planner__composer-zone">
          <form className="ai-planner__composer" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="ai-planner-prompt">
              {placeholder}
            </label>
            <div
              className={`ai-planner__composer-shell${prompt.trim() ? ' has-content' : ''}${isSubmitting ? ' is-submitting' : ''}${isFocused ? ' is-focused' : ''}`}
            >
              <textarea
                ref={textareaRef}
                id="ai-planner-prompt"
                className="ai-planner__input"
                name="prompt"
                rows={1}
                value={prompt}
                onChange={(event) => handlePromptChange(event.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={activePlaceholder}
                disabled={isSubmitting}
                autoComplete="off"
              />
              <div className="ai-planner__composer-actions">
                <button
                  className="ai-planner__send"
                  type="submit"
                  disabled={!prompt.trim() || isSubmitting}
                  aria-label={submitLabel}
                >
                  {isSubmitting ? (
                    <ThinkingDots size="sm" className="ai-planner__send-dots" />
                  ) : (
                    <ArrowUp size={18} strokeWidth={2.25} aria-hidden />
                  )}
                </button>
              </div>
            </div>
            <p className="ai-planner__enter-hint">{enterHint}</p>
          </form>

          {!userEngaged && !prompt.trim() && (
            <div className="ai-planner__starters" aria-label={suggestionsLabel}>
              <span className="ai-planner__starters-label">{suggestionsLabel}</span>
              <div className="ai-planner__chip-row">
                {suggestions.map((suggestion) => {
                  const Icon = suggestionIcons[suggestion.icon];
                  return (
                    <button
                      className="ai-planner__chip"
                      key={suggestion.title}
                      type="button"
                      onClick={() => fillPrompt(suggestion.prompt)}
                    >
                      <Icon size={14} strokeWidth={2} aria-hidden />
                      <span>{suggestion.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showFollowUps && !userEngaged && (
            <div className="ai-planner__followups">
              <span className="ai-planner__followups-label">{followUpLabel}</span>
              <div className="ai-planner__chip-row">
                {followUps.map((followUp) => (
                  <button
                    className="ai-planner__chip ai-planner__chip--followup"
                    key={followUp}
                    type="button"
                    onClick={() => fillPrompt(followUp)}
                  >
                    {followUp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(showFollowUps || (prompt.trim() && userStep === 'idle')) && (
            <div className="ai-planner__cta">
              <button
                className="ai-planner__cta-button"
                type="button"
                disabled={isSubmitting}
                onClick={() => startUserGeneration(prompt.trim() || preview.prompt)}
              >
                {tryCta}
                <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
