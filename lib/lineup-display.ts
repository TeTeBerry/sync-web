import { getMessages, type Locale } from './i18n';

const SESSION_LABEL_PATTERN = /^(\d{1,2})月(\d{1,2})日$/;

const SESSION_MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const GENRE_PLACEHOLDER_ZH = '风格待补充';

export function localizeStageLabel(
  locale: Locale,
  label?: string | null,
): string | undefined {
  const trimmed = label?.trim();
  if (!trimmed) {
    return undefined;
  }

  const mainStageZh = '主舞台';
  const mainStageEn = getMessages('en').eventDetail.lineupMainStage;

  if (locale === 'en' && trimmed === mainStageZh) {
    return mainStageEn;
  }

  if (locale === 'zh' && trimmed.toLowerCase() === mainStageEn.toLowerCase()) {
    return mainStageZh;
  }

  return trimmed;
}

export function resolveLineupStageLabel(
  locale: Locale,
  input: {
    stage?: string | null;
    stageLabel?: string | null;
  },
  options?: {
    stagesPublished?: boolean;
  },
): string | undefined {
  if (options?.stagesPublished === false) {
    return undefined;
  }

  const stageLabel = input.stageLabel?.trim();
  if (!stageLabel) {
    return undefined;
  }

  return localizeStageLabel(locale, stageLabel);
}

export function localizeSessionLabel(locale: Locale, label?: string | null): string {
  const trimmed = label?.trim();
  if (!trimmed) {
    return '';
  }

  if (locale === 'zh') {
    return trimmed;
  }

  const match = trimmed.match(SESSION_LABEL_PATTERN);
  if (!match) {
    return trimmed;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const monthLabel = SESSION_MONTHS_EN[month - 1];
  if (!monthLabel) {
    return trimmed;
  }

  return `${monthLabel} ${day}`;
}

export function genrePendingLabel(locale: Locale): string {
  return getMessages(locale).eventDetail.lineupGenrePending;
}

export function isGenrePlaceholder(value?: string | null): boolean {
  const trimmed = value?.trim();
  if (!trimmed) {
    return false;
  }
  return trimmed === GENRE_PLACEHOLDER_ZH || trimmed === genrePendingLabel('en');
}
