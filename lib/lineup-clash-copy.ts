import type { Locale } from './i18n';
import type {
  ArtistScheduleStatus,
  ClashResolutionOptionType,
  LineupConflict,
  LineupConflictType,
} from './lineup-clash';

const zh = {
  myLineup: '今晚路线',
  artists: '{count} 位艺人',
  clashes: '{count} 个冲突',
  tightTransfers: '{count} 个紧张转场',
  pending: '{count} 个档期待定',
  routeCalm: '{count} 个名字已在今晚',
  routeTension: '今晚有 {count} 个时刻要留下',
  routePending: '{count} 个档期稍后对上',
  review: '走进今晚的决定',
  reviewQuiet: '看看今晚',
  resolveClash: '留下谁',
  keepForLater: '先留着',
  addedTitle: '已带进今晚',
  addedClash: '今晚多了 {count} 个需要留下的选择',
  addedOk: '和今晚的路线合得来',
  centerTitle: '今晚在这里分岔',
  centerLead: '选择此刻更牵引你的那一场。',
  centerEmpty: '今晚的路线还安静。',
  nightHolding: '这些名字，已经是今晚的样子。',
  editRoute: '轻轻调整',
  doneEditingRoute: '好了',
  clearRoute: '清除路线',
  clearRouteConfirm: '要清除今晚路线里的所有名字吗？',
  remainingMoments: '夜还长 · 还有 {count} 个',
  nextMoment: '下一个',
  showDetails: '看看时间',
  hideDetails: '收起时间',
  nightPhases: {
    dusk: '黄昏',
    peak: '高潮',
    late: '深夜',
    open: '',
  },
  suggested: 'Raven 建议',
  whySuggested: '为什么建议这条路',
  dayLabel: '日程 {date}',
  pendingDay: '档期未公布',
  types: {
    'hard-clash': '同一时刻',
    'partial-clash': '时间交错',
    'tight-transfer': '赶场',
    'schedule-pending': '档期待定',
  } satisfies Record<LineupConflictType, string>,
  status: {
    'fits-route': '贴合你的路线',
    'partial-clash': '需要切开时间',
    'hard-clash': '需要二选一',
    'tight-transfer': '转场很紧',
    'schedule-pending': '档期待定',
    'not-selected': '',
  } satisfies Record<ArtistScheduleStatus, string>,
  reasons: {
    'substantial-overlap': '两场有大幅时间重叠，很难完整兼顾。',
    'cannot-attend-both': '同一时段无法同时站在两个舞台。',
    'partial-overlap': '两场有部分重叠，或许可以切开时间。',
    'may-split': '若转场来得及，可以各看一段。',
    'transfer-impossible': '转场时间不够，几乎赶不上。',
    'transfer-tight': '转场很紧，风险偏高。',
    'stage-change': '需要更换舞台。',
    'schedule-unavailable': '官方时刻表尚未公布，冲突稍后核对。',
    'artist-schedule-pending': '这位艺人的具体档期还没公布。',
  },
  options: {
    'keep-artist-a': '留下 {name}',
    'keep-artist-b': '留下 {name}',
    'split-both': '两边各看一段',
    'decide-later': '稍后再决定',
  } satisfies Record<ClashResolutionOptionType, string>,
  suggestBecauseJourney: '你已把这位艺人放进今日旅程。',
  suggestBecausePreference: '这是你更明确标记过的选择。',
  suggestBecauseSplit: '转场可行，两边都还能留下有意义的一段。',
  suggestBecauseDefer: '信息或时间不够硬，先留在路线里也不迟。',
  overlapMeta: '重叠约 {minutes} 分钟',
  transferMeta: '转场约需 {needed} 分钟 · 可用 {available} 分钟',
  watchWindow: '{name}：{from}–{until}',
  missed: '可能错过约 {minutes} 分钟',
  moodConflict: '贴合这个心情，但与 {name} 冲突。',
  addAnyway: '仍然加入',
  reviewClash: '查看冲突',
  findAnother: '换一个选择',
  journeyImpact: '对旅程的影响',
  resolveInLineup: '在今晚里决定',
  filterFits: '贴合路线',
  filterConflicts: '需要留下选择',
  filterPending: '档期待定',
  filterAll: '全部',
  close: '离开今晚',
  confirm: '就这样',
  removeFromRoute: '放下',
  schedulePendingSave:
    '你可以先存下这位艺人。档期公布后，Raven 会再核对冲突。',
  a11yConflict: '{a} 与 {b} 存在{type}：{detail}',
  toastDismiss: '知道了',
  routeSection: '已在路线上',
  decisionsSection: '今晚需要拍板',
  routeEmpty: '还没有名字进入今晚。',
} as const;

const en = {
  myLineup: 'Tonight’s route',
  artists: '{count} artists',
  clashes: '{count} clashes',
  tightTransfers: '{count} tight transfers',
  pending: '{count} schedule pending',
  routeCalm: '{count} names already in the night',
  routeTension: '{count} moments ask to be kept',
  routePending: '{count} sets still waiting on time',
  review: 'Step into tonight’s choices',
  reviewQuiet: 'See the night',
  resolveClash: 'Who stays',
  keepForLater: 'Keep for Later',
  addedTitle: 'Brought into tonight',
  addedClash: '{count} more choices for the night',
  addedOk: 'It fits tonight’s route',
  centerTitle: 'Tonight splits here',
  centerLead: 'Choose the set that pulls you closer.',
  centerEmpty: 'Your night is holding still.',
  nightHolding: 'These names already shape the night.',
  editRoute: 'Tune lightly',
  doneEditingRoute: 'Done',
  clearRoute: 'Clear route',
  clearRouteConfirm: 'Clear every artist from tonight’s route?',
  remainingMoments: 'The night continues · {count} more',
  nextMoment: 'Next',
  showDetails: 'See the times',
  hideDetails: 'Hide times',
  nightPhases: {
    dusk: 'Dusk',
    peak: 'Peak',
    late: 'Late',
    open: '',
  },
  suggested: 'Raven suggests',
  whySuggested: 'Why this path',
  dayLabel: '{date}',
  pendingDay: 'Schedule pending',
  types: {
    'hard-clash': 'Same moment',
    'partial-clash': 'Overlapping time',
    'tight-transfer': 'Tight transfer',
    'schedule-pending': 'Schedule pending',
  } satisfies Record<LineupConflictType, string>,
  status: {
    'fits-route': 'Fits your route',
    'partial-clash': 'May need a split',
    'hard-clash': 'Needs a choice',
    'tight-transfer': 'Tight transfer',
    'schedule-pending': 'Schedule pending',
    'not-selected': '',
  } satisfies Record<ArtistScheduleStatus, string>,
  reasons: {
    'substantial-overlap': 'These sets overlap enough that both full sets are unlikely.',
    'cannot-attend-both': 'You cannot stand on two stages at once.',
    'partial-overlap': 'The sets overlap in part — a split may still work.',
    'may-split': 'If the transfer holds, you can catch a meaningful stretch of each.',
    'transfer-impossible': 'There is not enough time to move between stages.',
    'transfer-tight': 'The transfer is tight and carries risk.',
    'stage-change': 'This route needs a stage change.',
    'schedule-unavailable': 'Official set times are not published yet. Raven will re-check later.',
    'artist-schedule-pending': 'This artist’s set time is not announced yet.',
  },
  options: {
    'keep-artist-a': 'Keep {name}',
    'keep-artist-b': 'Keep {name}',
    'split-both': 'Split both',
    'decide-later': 'Decide later',
  } satisfies Record<ClashResolutionOptionType, string>,
  suggestBecauseJourney: 'You already placed this artist on Today’s Journey.',
  suggestBecausePreference: 'This is one of your clearer saved preferences.',
  suggestBecauseSplit: 'The transfer is feasible and both sets keep a meaningful window.',
  suggestBecauseDefer: 'The data or timing is soft — saving for later is honest.',
  overlapMeta: 'About {minutes} minutes of overlap',
  transferMeta: 'Transfer needs ~{needed} min · {available} min available',
  watchWindow: '{name}: {from}–{until}',
  missed: 'You may miss about {minutes} minutes',
  moodConflict: 'Fits the mood, but conflicts with {name}.',
  addAnyway: 'Add anyway',
  reviewClash: 'Review clash',
  findAnother: 'Find another option',
  journeyImpact: 'Journey Impact',
  resolveInLineup: 'Decide in tonight',
  filterFits: 'Fits route',
  filterConflicts: 'Needs a choice',
  filterPending: 'Schedule pending',
  filterAll: 'All',
  close: 'Leave the night',
  confirm: 'Lock this in',
  removeFromRoute: 'Let go',
  schedulePendingSave:
    'You can save this artist now. Raven will check for clashes when set times arrive.',
  a11yConflict: '{a} and {b}: {type}. {detail}',
  toastDismiss: 'Got it',
  routeSection: 'On your route',
  decisionsSection: 'Choices for tonight',
  routeEmpty: 'No artists on tonight’s route yet.',
} as const;

export type LineupClashCopy = {
  myLineup: string;
  artists: string;
  clashes: string;
  tightTransfers: string;
  pending: string;
  routeCalm: string;
  routeTension: string;
  routePending: string;
  review: string;
  reviewQuiet: string;
  resolveClash: string;
  keepForLater: string;
  addedTitle: string;
  addedClash: string;
  addedOk: string;
  centerTitle: string;
  centerLead: string;
  centerEmpty: string;
  nightHolding: string;
  editRoute: string;
  doneEditingRoute: string;
  clearRoute: string;
  clearRouteConfirm: string;
  remainingMoments: string;
  nextMoment: string;
  showDetails: string;
  hideDetails: string;
  nightPhases: Record<'dusk' | 'peak' | 'late' | 'open', string>;
  suggested: string;
  whySuggested: string;
  dayLabel: string;
  pendingDay: string;
  types: Record<LineupConflictType, string>;
  status: Record<ArtistScheduleStatus, string>;
  reasons: Record<string, string>;
  options: Record<ClashResolutionOptionType, string>;
  suggestBecauseJourney: string;
  suggestBecausePreference: string;
  suggestBecauseSplit: string;
  suggestBecauseDefer: string;
  overlapMeta: string;
  transferMeta: string;
  watchWindow: string;
  missed: string;
  moodConflict: string;
  addAnyway: string;
  reviewClash: string;
  findAnother: string;
  journeyImpact: string;
  resolveInLineup: string;
  filterFits: string;
  filterConflicts: string;
  filterPending: string;
  filterAll: string;
  close: string;
  confirm: string;
  schedulePendingSave: string;
  a11yConflict: string;
  toastDismiss: string;
  routeSection: string;
  decisionsSection: string;
  routeEmpty: string;
  removeFromRoute: string;
};

export function getLineupClashCopy(locale: Locale): LineupClashCopy {
  return locale === 'zh' ? zh : en;
}

export function formatClashTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function conflictReasonText(
  conflict: LineupConflict,
  locale: Locale,
): string[] {
  const copy = getLineupClashCopy(locale);
  return conflict.reasonKeys.map(
    (key) => copy.reasons[key as keyof typeof copy.reasons] ?? key,
  );
}

export function optionLabel(
  conflict: LineupConflict,
  optionType: ClashResolutionOptionType,
  locale: Locale,
): string {
  const copy = getLineupClashCopy(locale);
  if (optionType === 'keep-artist-a') {
    return formatClashTemplate(copy.options['keep-artist-a'], {
      name: conflict.artistAName,
    });
  }
  if (optionType === 'keep-artist-b') {
    return formatClashTemplate(copy.options['keep-artist-b'], {
      name: conflict.artistBName,
    });
  }
  return copy.options[optionType];
}
