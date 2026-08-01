import type { RuntimeSettings } from '../types';

export const defaultSettings: RuntimeSettings = {
  apiKey: '',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  model: '',
  timeout: 900,
  videoFps: 1,
  maxConcurrent: 3,
  douyinCookie: '',
  prompts: {},
};

export function compactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '-';
  if (value >= 100000000) return (value / 100000000).toFixed(value >= 1000000000 ? 0 : 1).replace(/\.0$/, '') + '亿';
  if (value >= 10000) return (value / 10000).toFixed(value >= 100000 ? 0 : 1).replace(/\.0$/, '') + '万';
  return value.toLocaleString('zh-CN');
}
