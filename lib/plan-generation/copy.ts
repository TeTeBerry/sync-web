import type { Locale } from '../i18n';
import type { PlanGenerationCopy, PlanGenerationNarrative, PlanGenerationStage } from './types';

function fill(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

const COPY: Record<Locale, PlanGenerationCopy> = {
  en: {
    mission: {
      eyebrow: 'Raven',
      title: 'Mission accepted.',
      lead: 'Raven is preparing your journey.',
    },
    festival: {
      eyebrow: 'Festival world',
      title: 'Entering the world of {festivalName}.',
      lead: 'Reading the rhythm of the festival.',
    },
    lineup: {
      eyebrow: 'Your sound',
      title: 'Following your sound.',
      lead: 'Mapping the artists that matter to you.',
    },
    lineupFallback: {
      eyebrow: 'Your sound',
      title: 'Following your sound.',
      lead: 'Tuning into the festival lineup.',
    },
    route: {
      eyebrow: 'Journey',
      title: 'Tracing the journey from {originCity} to {destinationCity}.',
      lead: 'Connecting the route to the festival.',
    },
    assembly: {
      eyebrow: 'Assembly',
      title: 'Shaping the journey around your music.',
      lead: 'Balancing travel, stay, timing, and budget.',
    },
    assemblyLabels: ['Journey', 'Stay', 'Festival', 'Budget', 'Schedule'],
    guide: {
      eyebrow: 'Festival guide',
      title: 'Crafting your festival guide.',
      lead: 'Turning every detail into one clear journey.',
    },
    guideRotating: [
      'Structuring your festival days.',
      'Balancing travel and music.',
      'Adding local essentials.',
      'Preparing your arrival.',
      'Checking the journey from start to finish.',
      'Giving every day a rhythm.',
    ],
    completed: {
      eyebrow: 'Ready',
      title: 'Your journey is ready.',
      lead: 'Welcome to {festivalName}.',
    },
    failed: {
      eyebrow: 'Paused',
      title: 'We couldn’t finish this journey.',
      lead: 'Your details are safe. Try generating the plan again.',
    },
    retry: 'Try again',
    adjust: 'Adjust preferences',
    stageLabels: {
      mission: 'Mission',
      festival: 'Festival',
      lineup: 'Sound',
      route: 'Route',
      assembly: 'Assembly',
      guide: 'Guide',
      completed: 'Ready',
    },
  },
  zh: {
    mission: {
      eyebrow: 'Raven',
      title: '任务已接受。',
      lead: 'Raven 正在准备你的旅程。',
    },
    festival: {
      eyebrow: '节日世界',
      title: '正在进入 {festivalName} 的世界。',
      lead: '读取这场电音节的节奏。',
    },
    lineup: {
      eyebrow: '你的声音',
      title: '追随你的声音。',
      lead: '标出对你真正重要的艺人。',
    },
    lineupFallback: {
      eyebrow: '你的声音',
      title: '追随你的声音。',
      lead: '正在感受这场阵容的脉络。',
    },
    route: {
      eyebrow: '路线',
      title: '正在描绘从 {originCity} 到 {destinationCity} 的旅程。',
      lead: '把路线连接到会场。',
    },
    assembly: {
      eyebrow: '组装',
      title: '围绕你的音乐塑造旅程。',
      lead: '平衡出行、住宿、时间与预算。',
    },
    assemblyLabels: ['出行', '住宿', '现场', '预算', '日程'],
    guide: {
      eyebrow: '旅程指南',
      title: '正在撰写你的电音节指南。',
      lead: '把每个细节收成一条清晰旅程。',
    },
    guideRotating: [
      '正在整理你的节日日程。',
      '平衡出行与音乐。',
      '补充本地必要事项。',
      '准备你的抵达。',
      '从头到尾核对旅程。',
      '让每一天都有节奏。',
    ],
    completed: {
      eyebrow: '就绪',
      title: '你的旅程已准备好。',
      lead: '欢迎来到 {festivalName}。',
    },
    failed: {
      eyebrow: '暂缓',
      title: '这次旅程还没完成。',
      lead: '你的选择都还在。可以重新生成，或回到上一步调整。',
    },
    retry: '再次生成',
    adjust: '调整偏好',
    stageLabels: {
      mission: '任务',
      festival: '现场',
      lineup: '声音',
      route: '路线',
      assembly: '组装',
      guide: '指南',
      completed: '就绪',
    },
  },
};

export function getPlanGenerationCopy(locale: Locale): PlanGenerationCopy {
  return COPY[locale];
}

export function resolveSceneNarrative(
  stage: PlanGenerationStage,
  copy: PlanGenerationCopy,
  context: {
    festivalName: string;
    originCity: string;
    destinationCity: string;
    hasArtists: boolean;
  },
): PlanGenerationNarrative {
  const vars = {
    festivalName: context.festivalName,
    originCity: context.originCity || (copy.route.title.includes('{originCity}') ? '…' : ''),
    destinationCity: context.destinationCity || '…',
  };

  const source =
    stage === 'mission'
      ? copy.mission
      : stage === 'festival'
        ? copy.festival
        : stage === 'lineup'
          ? context.hasArtists
            ? copy.lineup
            : copy.lineupFallback
          : stage === 'route'
            ? copy.route
            : stage === 'assembly'
              ? copy.assembly
              : stage === 'guide'
                ? copy.guide
                : stage === 'completed'
                  ? copy.completed
                  : copy.failed;

  return {
    eyebrow: source.eyebrow,
    title: fill(source.title, vars),
    lead: fill(source.lead, vars),
  };
}
