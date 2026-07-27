export type TaskKind = 'video' | 'account' | 'remake';
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface SourceMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  collects: number;
  publishedAt: string;
}

export interface VideoSource {
  id: string;
  url: string;
  title: string;
  author: string;
  duration: string;
  coverTone: 'red' | 'green' | 'blue';
  metrics: SourceMetrics;
}

export interface VideoBeat {
  timecode: string;
  originalCopy: string;
  role: string;
  emotion: string;
  visual: string;
  transition: string;
}

export interface EvidencePoint {
  label: string;
  evidence: string;
  confidence: '高' | '中' | '待验证';
}

export interface VideoBreakdown {
  source: VideoSource;
  summary: string;
  theme: string;
  hook: {
    copy: string;
    mechanism: string;
    visualAction: string;
  };
  beats: VideoBeat[];
  craft: {
    filming: string[];
    editing: string[];
    audio: string[];
    captions: string[];
  };
  evidence: EvidencePoint[];
  transferable: string[];
  avoidCopying: string[];
  boundary: string;
}

export interface AccountProfile {
  id: string;
  name: string;
  color: 'red' | 'green' | 'blue';
  industry: string;
  creatorIdentity: string;
  audience: string;
  valuePromise: string;
  formatsAndResources: string;
  constraints: string;
  originalDescription: string;
  inferredFields: string[];
  updatedAt: string;
}

export interface RemakeResult {
  profileId: string;
  profileName: string;
  angle: string;
  titleOptions: string[];
  openingHook: string;
  fullScript: string;
  segments: Array<{
    time: string;
    task: string;
    copy: string;
    shooting: string;
  }>;
  cta: string;
  inheritedMechanisms: string[];
  adaptations: string[];
}

export interface ResearchVideo {
  id: string;
  title: string;
  publishedAt: string;
  likes: number;
  comments: number;
  shares: number;
  status: 'waiting' | 'downloading' | 'analyzing' | 'completed';
  sampleRole: '爆款' | '常态' | '早期' | '转折';
}

export interface AccountReport {
  account: {
    name: string;
    handle: string;
    followers: number;
    videos: number;
    promise: string;
  };
  pillars: Array<{ name: string; ratio: number; note: string }>;
  timeline: Array<{ phase: string; range: string; action: string; signal: string }>;
  hookPatterns: string[];
  viralVsNormal: Array<{ dimension: string; viral: string; normal: string; conclusion: string }>;
  transferable: Array<{ rule: string; evidence: string; boundary: string }>;
  risks: string[];
  testTopics: Array<{ title: string; reason: string; priority: '优先' | '备选' }>;
}

export interface TaskRecord {
  id: string;
  kind: TaskKind;
  title: string;
  source: string;
  status: TaskStatus;
  progress: number;
  createdAt: string;
  detail: string;
}

export interface RuntimeSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
  videoFps: number;
  maxConcurrent: number;
  douyinCookie: string;
  prompts: Record<string, string>;
}
