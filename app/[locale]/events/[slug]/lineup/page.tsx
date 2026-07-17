import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { EventImage } from "../../../../../components/EventImage";
import { LineupExperience } from "../../../../../components/lineup/LineupExperience";
import { EventLoadError } from "../../../../../components/states/EventLoadError";
import { LineupEmptyState } from "../../../../../components/states/LineupEmptyState";
import { LineupErrorState } from "../../../../../components/states/LineupErrorState";
import { getActivityImage } from "../../../../../lib/api";
import { loadEventPageData } from "../../../../../lib/event-page";
import { getFestivalAtmosphere } from "../../../../../lib/festival-atmosphere";
import { buildFestivalFlow } from "../../../../../lib/lineup-flow";
import { buildLineupChapterVoice } from "../../../../../lib/lineup-voice";
import {
  eventLineupPath,
  eventSlug,
  eventPath,
  eventPlanPath,
  eventSlugMatches,
  resolveActivityBySlug,
} from "../../../../../lib/event-slug";
import { resolveFestivalTimeZone } from "../../../../../lib/lineup-schedule-export";
import { buildLineupJsonLd, buildLineupMetadata } from "../../../../../lib/seo";
import { getSiteUrl } from "../../../../../lib/site";
import {
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  localizedPath,
  type Locale,
} from "../../../../../lib/i18n";

type LineupPageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ weekend?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: LineupPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const activityResult = await resolveActivityBySlug(slug, locale);
  if (!activityResult.activity) return {};

  return buildLineupMetadata(activityResult.activity, locale);
}

export default async function EventLineupPage({
  params,
  searchParams,
}: LineupPageProps) {
  const { locale: rawLocale, slug } = await params;
  const { weekend: rawWeekend } = await searchParams;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  const t = getMessages(locale);
  const weekend =
    rawWeekend === "w1" || rawWeekend === "w2" ? rawWeekend : undefined;
  const activityResult = await resolveActivityBySlug(slug, locale);
  if (activityResult.status === "error") return <EventLoadError locale={locale} />;
  if (activityResult.status === "not_found" || !activityResult.activity) notFound();
  if (!eventSlugMatches(slug, activityResult.activity, locale)) {
    const canonical = eventLineupPath(locale, activityResult.activity);
    permanentRedirect(weekend ? `${canonical}?weekend=${weekend}` : canonical);
  }
  const pageData = await loadEventPageData(locale, slug, { weekend });

  if (pageData === "error") return <EventLoadError locale={locale} />;
  if (pageData === "not_found") notFound();

  const {
    activity,
    eventTitle,
    djs,
    lineupFetchFailed,
    showTimetable,
    timetableDays,
    timetableStats,
    genreGroupData,
    aiSummary,
    stageLabels,
    schedulePublished,
    performances,
  } = pageData;

  const siteUrl = getSiteUrl();
  const planHref = eventPlanPath(locale, activity, { from: "lineup" });
  const eventHref = eventPath(locale, activity);
  const lineupHref = eventLineupPath(locale, activity);
  const image = getActivityImage(activity);
  const atmosphere = getFestivalAtmosphere(activity, aiSummary.genres[0]);
  const voice = buildLineupChapterVoice(
    activity,
    locale,
    atmosphere,
    aiSummary.genres,
  );
  const subscribeEventProperties = {
    event: String(activity.legacyId),
    sourcePath: lineupHref,
    locale,
  };
  const breadcrumbItems = [
    { name: t.breadcrumbs.home, url: `${siteUrl}${localizedPath(locale)}` },
    {
      name: t.breadcrumbs.events,
      url: `${siteUrl}${localizedPath(locale, "/events")}`,
    },
    { name: eventTitle, url: `${siteUrl}${eventHref}` },
    { name: t.eventDetail.lineupPage.title, url: `${siteUrl}${lineupHref}` },
  ];
  const jsonLd = buildLineupJsonLd(activity, djs, locale, breadcrumbItems);

  const stageCount =
    timetableStats?.stageCount ??
    (stageLabels.length > 0 ? stageLabels.length : 0);
  const flowDays =
    showTimetable && timetableDays.length > 0
      ? buildFestivalFlow(timetableDays, locale)
      : [];
  const hasLineupContent =
    (showTimetable && timetableDays.length > 0) || djs.length > 0;

  const breadcrumbs = [
    { label: t.breadcrumbs.home, href: localizedPath(locale) },
    { label: t.breadcrumbs.events, href: localizedPath(locale, "/events") },
    { label: eventTitle, href: eventHref },
    { label: t.eventDetail.lineupPage.title },
  ];

  const requiresWeekendChoice = activity.code === "tomorrowland-belgium";
  const weekendOptions =
    locale === "zh"
      ? [
          {
            value: "w1" as const,
            gate: "初启之门",
            weekend: "W1",
            dates: "7 月 17–19 日",
            invitation: "第一段盛夏故事，由此展开",
            afterglow: "第一道门已开，先听见属于你的那一段。",
          },
          {
            value: "w2" as const,
            gate: "余晖之门",
            weekend: "W2",
            dates: "7 月 24–26 日",
            invitation: "第二段盛夏故事，向夜更深处",
            afterglow: "余晖未散，第二段故事正等你抵达。",
          },
        ]
      : [
          {
            value: "w1" as const,
            gate: "Gate of first light",
            weekend: "W1",
            dates: "July 17–19",
            invitation: "The first summer story begins here",
            afterglow: "The first gate is open. Your chapter starts in sound.",
          },
          {
            value: "w2" as const,
            gate: "Gate of afterglow",
            weekend: "W2",
            dates: "July 24–26",
            invitation: "The second story goes deeper into the night",
            afterglow: "The afterglow remains. The next chapter is waiting.",
          },
        ];
  const selectedWeekend = weekend
    ? weekendOptions.find((option) => option.value === weekend)
    : undefined;

  if (requiresWeekendChoice && !weekend) {
    return (
      <main
        className="detail-page detail-page--experience detail-page--lineup"
        data-atmosphere={atmosphere}
      >
        <section
          className="lineup-weekend-choice"
          aria-labelledby="lineup-weekend-heading"
        >
          <div className="container lineup-weekend-choice__inner">
            <p className="lineup-weekend-choice__eyebrow">
              {locale === "zh"
                ? "Tomorrowland Belgium 2026"
                : "Tomorrowland Belgium 2026"}
            </p>
            <h1
              id="lineup-weekend-heading"
              className="lineup-weekend-choice__title"
            >
              {locale === "zh"
                ? "你会进入哪个周末？"
                : "Which weekend are you entering?"}
            </h1>
            <p className="lineup-weekend-choice__lead">
              {locale === "zh"
                ? "De Schorre 的盛夏，被写成两个周末。选定你的日期，让这一场的音乐先向你展开。"
                : "One midsummer at De Schorre is written across two weekends. Choose your dates, then let its sound unfold."}
            </p>
            <div className="lineup-weekend-choice__options">
              {weekendOptions.map((option) => (
                <Link
                  key={option.value}
                  href={`${lineupHref}?weekend=${option.value}`}
                  className={`lineup-weekend-choice__option lineup-weekend-choice__option--${option.value}`}
                >
                  <span
                    className="lineup-weekend-choice__portal-image"
                    aria-hidden="true"
                  >
                    {image ? (
                      <EventImage
                        src={image}
                        alt=""
                        priority={option.value === "w1"}
                        sizes="(max-width: 620px) 100vw, 42vw"
                      />
                    ) : null}
                  </span>
                  <span
                    className="lineup-weekend-choice__light"
                    aria-hidden="true"
                  />
                  <span className="lineup-weekend-choice__content">
                    <small>{option.weekend}</small>
                    <strong>{option.dates}</strong>
                    <span>{option.gate}</span>
                    <em>{option.invitation}</em>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  const lineupBody = lineupFetchFailed ? (
    <section className="lineup-scene" data-reveal>
      <div className="container">
        <LineupErrorState
          locale={locale}
          labels={{
            title: t.eventDetail.lineupErrorTitle,
            lead: t.eventDetail.lineupErrorLead,
            retry: t.eventDetail.lineupErrorRetry,
            browse: t.eventDetail.lineupEmptyBrowse,
          }}
        />
      </div>
    </section>
  ) : hasLineupContent ? (
    <LineupExperience
      locale={locale}
      activityLegacyId={activity.legacyId}
      weekend={weekend}
      eventTitle={eventTitle}
      atmosphere={atmosphere}
      invite={aiSummary.vibe}
      image={image}
      artistCount={aiSummary.artistCount}
      stageCount={stageCount}
      genreCount={aiSummary.genreCount}
      djs={djs}
      showTimetable={showTimetable && flowDays.length > 0}
      flowDays={flowDays}
      genreGroups={genreGroupData}
      genres={aiSummary.genres}
      stageLabels={stageLabels}
      stagesPublished={schedulePublished}
      performances={performances}
      scheduleMeta={{
        festivalName: eventTitle,
        festivalSlug: eventSlug(activity, locale),
        venue: activity.location ?? activity.city,
        timeZone: resolveFestivalTimeZone(activity),
        festivalDate: activity.startDate ?? activity.date,
      }}
      schedulePublished={schedulePublished}
      voice={voice}
      planHref={planHref}
      subscribeEventProperties={subscribeEventProperties}
      breadcrumbsAriaLabel={t.breadcrumbs.ariaLabel}
      breadcrumbs={breadcrumbs}
      weekendContext={
        selectedWeekend
          ? {
              label: `${selectedWeekend.weekend} · ${selectedWeekend.dates}`,
              story: selectedWeekend.afterglow,
              switchHref: lineupHref,
              switchLabel:
                locale === "zh" ? "回到两道门" : "Return to the gates",
            }
          : undefined
      }
      labels={{
        map: t.eventDetail.lineupPage.map,
        planner: t.eventDetail.lineupPage.planner,
        selection: {
          hint: t.eventDetail.lineupPickHint,
          count: t.eventDetail.lineupPickCount,
          clear: t.eventDetail.lineupPickClear,
        },
        hero: {
          artistsUnit: t.eventDetail.lineupStatsArtists,
          stagesUnit: t.eventDetail.lineupTimetableStages,
          genresUnit: t.eventDetail.lineupStatsGenres,
        },
      }}
    />
  ) : (
    <section className="lineup-scene" data-reveal>
      <div className="container">
        <LineupEmptyState
          locale={locale}
          labels={{
            title: t.eventDetail.lineupEmptyTitle,
            lead: t.eventDetail.lineupEmptyLead,
            browseAction: t.eventDetail.lineupEmptyBrowse,
          }}
        />
      </div>
    </section>
  );

  return (
    <main
      className="detail-page detail-page--experience detail-page--lineup"
      data-atmosphere={atmosphere}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {lineupBody}
    </main>
  );
}
