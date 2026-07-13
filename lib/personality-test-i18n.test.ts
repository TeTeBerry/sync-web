import { describe, expect, it } from 'vitest';
import { localizePersonalityQuestion } from './i18n';

describe('web personality test localization', () => {
  it('presents English question and option copy without changing answer IDs', () => {
    const question = localizePersonalityQuestion({
      id: 'audio-drop-bigroom',
      prompt: '听到这段 drop，你的第一反应是？',
      options: [
        { id: 'a', label: '立刻甩头', weights: { rager: 3 } },
        { id: 'b', label: '冷静分析', weights: { connoisseur: 3 } },
      ],
    }, 'en');
    expect(question.prompt).not.toMatch(/[\u4e00-\u9fff]/);
    expect(question.options.map((option) => option.id)).toEqual(['a', 'b']);
    expect(question.options.map((option) => option.label)).toEqual(['Chase the peak', 'Listen for the craft']);
  });
});
