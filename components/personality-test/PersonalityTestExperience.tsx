"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getLineupPersonalizationCopy,
  localizePersonalityQuestion,
  type Locale,
} from "../../lib/i18n";
import {
  isFestivalAtmosphere,
  PERSONALITY_SESSION_KEY,
} from "../../lib/lineup-personality";
import type { FestivalAtmosphere } from "../../lib/festival-atmosphere";

type Question = {
  id: string;
  prompt: string;
  media?: { type: "audio"; assetKey: string; caption?: string };
  options: Array<{
    id: string;
    label: string;
    weights?: Record<string, number>;
  }>;
};
type TestResult = { version: 1; score: { primaryType: string } };

function unwrap<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null;
  return ("data" in payload ? (payload as { data: T }).data : payload) as T;
}

function safeReturnTo(value: string | null, locale: Locale): string {
  if (!value?.startsWith(`/${locale}/`)) return `/${locale}/events`;
  return value;
}

/**
 * Soft chapter continuation of lineup — festival atmosphere travels with the test.
 */
export function PersonalityTestExperience({
  locale,
}: {
  locale: Locale;
  fallbackLocale: Locale;
}) {
  const params = useSearchParams();
  const atmosphereParam = params.get("atmosphere");
  const atmosphere: FestivalAtmosphere = isFestivalAtmosphere(atmosphereParam)
    ? atmosphereParam
    : "violet";
  const festival = params.get("festival")?.trim() || "";
  const returnTo = safeReturnTo(params.get("returnTo"), locale);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaError, setMediaError] = useState(false);
  const copy = getLineupPersonalizationCopy(locale).test;

  useEffect(() => {
    setError("");
    fetch("/api/personality-test/questions", { cache: "no-store" })
      .then(async (response) =>
        response.ok
          ? unwrap<{ questions: Question[] }>(await response.json())
          : null,
      )
      .then((payload) => {
        if (!payload?.questions?.length) {
          setQuestions([]);
          setError(copy.loadError);
          return;
        }
        setQuestions(
          payload.questions.map((question) =>
            localizePersonalityQuestion(question, locale),
          ),
        );
      })
      .catch(() => setError(copy.loadError));
  }, [locale, copy.loadError]);

  const question = questions[index];
  const selected = question ? answers[question.id] : undefined;
  const progress = questions.length
    ? ((index + 1) / questions.length) * 100
    : 0;

  useEffect(() => {
    const assetKey = question?.media?.assetKey;
    setMediaUrl("");
    setMediaError(false);
    if (!assetKey) return;
    let cancelled = false;
    fetch(
      `/api/personality-test/media-urls?keys=${encodeURIComponent(assetKey)}`,
      {
        cache: "no-store",
      },
    )
      .then(async (response) =>
        response.ok
          ? unwrap<{ urls: Record<string, string> }>(await response.json())
          : null,
      )
      .then((payload) => {
        if (cancelled) return;
        const url = payload?.urls?.[assetKey];
        if (url) setMediaUrl(url);
        else setMediaError(true);
      })
      .catch(() => {
        if (!cancelled) setMediaError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [question?.media?.assetKey]);

  async function next() {
    if (!question || !selected) return;
    if (index < questions.length - 1) {
      setIndex((value) => value + 1);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/personality-test/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionIds: questions.map((item) => item.id),
          answers,
        }),
      });
      const result = unwrap<TestResult>(await response.json());
      if (!response.ok || !result) throw new Error("submit_failed");
      window.sessionStorage.setItem(
        PERSONALITY_SESSION_KEY,
        JSON.stringify(result),
      );
      window.location.assign(returnTo);
    } catch {
      setError(copy.submitError);
      setSubmitting(false);
    }
  }

  return (
    <main
      className="personality-test-page detail-page--experience"
      data-atmosphere={atmosphere}
    >
      <section
        className="personality-test-page__scene"
        aria-labelledby="personality-test-heading"
      >
        <div className="container personality-test-page__inner">
          {festival ? (
            <a
              className="personality-test-page__return"
              href={returnTo.split("#")[0]}
            >
              {copy.chapterReturn.replace("{festival}", festival)}
            </a>
          ) : null}
          <p className="lineup-scene__eyebrow">{copy.eyebrow}</p>
          <h1 id="personality-test-heading">{copy.title}</h1>
          <p>{copy.description}</p>
          {questions.length ? (
            <div
              className="personality-test-page__progress"
              aria-label={copy.progress}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          ) : null}
          {question ? (
            <div className="personality-test-page__question">
              <p>{question.prompt}</p>
              {question.media?.type === "audio" ? (
                <div
                  className="personality-test-page__audio"
                  aria-live="polite"
                >
                  <span>{question.media.caption || copy.audioLabel}</span>
                  {mediaUrl ? (
                    <audio
                      controls
                      preload="metadata"
                      src={mediaUrl}
                      aria-label={copy.audioLabel}
                    />
                  ) : mediaError ? (
                    <small>{copy.audioUnavailable}</small>
                  ) : (
                    <small>{copy.audioLoading}</small>
                  )}
                </div>
              ) : null}
              <div role="radiogroup" aria-label={question.prompt}>
                {question.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected === option.id}
                    className={selected === option.id ? "is-selected" : ""}
                    onClick={() =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: option.id,
                      }))
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="button"
                disabled={!selected || submitting}
                onClick={next}
              >
                {submitting
                  ? copy.mapping
                  : index === questions.length - 1
                    ? copy.reveal
                    : copy.next}
              </button>
            </div>
          ) : !error ? (
            <p className="personality-test-page__loading">{copy.loading}</p>
          ) : null}
          {error ? (
            <p className="personality-test-page__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
