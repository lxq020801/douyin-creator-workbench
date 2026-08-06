import type { RuntimeSettings } from '../types';

export const defaultSettings: RuntimeSettings = {
  apiKey: '',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  model: 'doubao-seed-1-6-vision-250815',
  analysisModel: 'doubao-seed-1-6-vision-250815',
  replicationModel: 'doubao-seed-2-1-turbo-260628',
  timeout: 900,
  videoFps: 1,
  maxConcurrent: 3,
  topicSeedEnabled: true,
  topicSeedReviewEnabled: true,
  topicFactualAuditEnabled: false,
  scriptFactualAuditEnabled: true,
  douyinCookie: '',
  prompts: {
    common: '',
    videoBreakdown: '',
    accountSummary: '',
    profileIntake: '',
    topicSeed: '',
    topicSeedReview: '',
    videoTopics: '',
    accountTopics: '',
    scriptGeneration: '',
    factualAudit: '',
    factualCorrection: '',
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
