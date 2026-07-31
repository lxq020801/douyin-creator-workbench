import type { RuntimeSettings } from '../types';

export const defaultSettings: RuntimeSettings = {
  apiKey: '',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  model: 'doubao-seed-1-6-vision-250815',
  timeout: 900,
  videoFps: 1,
  maxConcurrent: 3,
  douyinCookie: '',
  prompts: {
    common: '',
    videoBreakdown: '',
    accountSummary: '',
    profileIntake: '',
    videoTopics: '',
    accountTopics: '',
    scriptGeneration: '',
  },
  apiKeyConfigured: false,
  douyinCookieConfigured: false,
  promptPackVersion: 'external-rtf-v3',
};

export function compactNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 1 : 2).replace(/\.0$/, '')}万`;
  return value.toLocaleString('zh-CN');
}
