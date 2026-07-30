export type TaskKind = 'video' | 'account' | 'remake';
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface SourceMetrics {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  collects: number | null;
  publishedAt: string | null;
}

export interface VideoSource {
  id: string;
  url: string;
  title: string;
  author: string;
  duration: string;
  coverTone?: 'red' | 'green' | 'blue';
  coverUrl?: string;
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

export interface AudienceSignal {
  summary: string;
  basis: string[];
  confidence: '高' | '中' | '待验证';
}

export interface VideoMetadataLayer {
  category: string;
  format: string;
  visualStyle: string;
  bgmStyle: string;
  captionStyle: string;
  tags: string[];
  location: string;
  keywords: string[];
  audience: AudienceSignal;
}

export interface HookAnalysis {
  copy: string;
  type: string;
  emotion: string;
  viewerTask: string;
  evidence: string;
}

export interface NarrativeStage {
  timeRange: string;
  function: string;
  content: string;
  evidence: string;
}

export interface EmotionPoint {
  point: string;
  emotion: string;
  trigger: string;
  effect: string;
}

export interface InteractionAnalysis {
  prompts: string[];
  commentTriggers: string[];
  observedComments: string[];
  note: string;
}

export interface TrafficLogicLayer {
  hook: HookAnalysis;
  narrativeSummary: string;
  narrativeStages: NarrativeStage[];
  emotionCurve: EmotionPoint[];
  interaction: InteractionAnalysis;
}

export interface CommercialLayer {
  valueType: string;
  valueSupply: string;
  conversionPath: string;
  placement: string;
  callToAction: string;
  platformSignals: string[];
  availabilityNote: string;
}

export interface ReviewLayer {
  strengths: string[];
  shortcomings: string[];
  improvements: string[];
  formula: string;
  transferable: string[];
  nonCopyable: string[];
  boundary: string;
}

export interface VideoBreakdown {
  source: VideoSource;
  summary: string;
  theme: string;
  metadata?: VideoMetadataLayer;
  trafficLogic?: TrafficLogicLayer;
  commercial?: CommercialLayer;
  review?: ReviewLayer;
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
  promise: string;
  pillars: Array<{ name: string; ratio: number; note: string }>;
  timeline: Array<{ phase: string; range: string; action: string; signal: string }>;
  hookPatterns: string[];
  viralVsNormal: Array<{ dimension: string; viral: string; normal: string; conclusion: string }>;
  transferable: Array<{ rule: string; evidence: string; boundary: string }>;
  risks: string[];
  testTopics: Array<{ title: string; reason: string; priority: '优先' | '备选' }>;
  boundary?: string;
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
  apiKeyConfigured?: boolean;
  douyinCookieConfigured?: boolean;
}

export interface AnalysisRecord {
  id: string;
  kind: 'video' | 'account';
  source: string;
  title: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  step: string;
  detail: string;
  metadata: Record<string, unknown> | null;
  report: VideoBreakdown | AccountReport | null;
  coverage: Record<string, number> | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedTopic {
  id: string;
  analysisId: string;
  profileId: string;
  position: number;
  title: string;
  angle: string;
  hook: string;
  reason: string;
  inheritedMechanism: string;
  adaptation: string;
}

export interface DirectorScript {
  title: string;
  openingHook: string;
  duration: string;
  fullCopy: string;
  segments: Array<{ time: string; task: string; copy: string; shooting: string; rhythm: string }>;
  cta: string;
  productionNotes: string[];
}

export interface GeneratedScript {
  id: string;
  topicId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  data: DirectorScript | null;
  error: string | null;
}
