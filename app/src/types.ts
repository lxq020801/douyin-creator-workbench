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
  coverUrl?: string;
  metrics: SourceMetrics;
}

export interface AccountProfile {
  id: string;
  name: string;
  color: 'red' | 'green' | 'blue';
  creatorAndAccount: string;
  businessAndGoals: string;
  audienceAndAction: string;
  availableMaterials: string;
  productionConditions: string;
  toneAndBoundaries: string;
  originalDescription: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'user';
  workspaceId: string;
  createdAt: string;
}

export interface CreateUserInput {
  username: string;
  displayName: string;
  password: string;
  role: 'admin' | 'user';
}

export interface ExternalBreakoutJudgment {
  entryPoint: string;
  viewerSituation: string;
  emotionalValue: string;
  coreAttraction: string;
}

export interface ExternalSkeletonStage {
  timeRange: string;
  name: string;
  function: string;
}

export interface ExternalViralSkeleton {
  formula: string;
  stages: ExternalSkeletonStage[];
}

export interface ExternalOpeningHook {
  firstFrame: string;
  openingLine: string;
  supportingElements: string[];
  audienceTrigger: string;
  viewingExpectation: string;
}

export interface ExternalCopyRetentionPoint {
  excerpt: string;
  function: string;
  bridge: string;
}

export interface ExternalAudiovisualPoint {
  element: string;
  design: string;
  function: string;
}

export interface ExternalReplicableMethod {
  name: string;
  originalUse: string;
  mustKeep: string;
  replaceable: string[];
}

export interface ExternalVideoBreakdown {
  source: VideoSource;
  breakoutJudgment: ExternalBreakoutJudgment;
  viralSkeleton: ExternalViralSkeleton;
  openingHook: ExternalOpeningHook;
  copyRetention: ExternalCopyRetentionPoint[];
  audiovisual: ExternalAudiovisualPoint[];
  replicableMethods: ExternalReplicableMethod[];
}

export interface ExternalAccountStrategyOverview {
  coreAudience: string;
  coreValue: string;
  attentionModel: string;
  positioning: string;
  monetizationLogic: string;
}

export interface ExternalContentArea {
  name: string;
  role: string;
  recurringPattern: string;
}

export interface ExternalTopicEngine {
  source: string;
  recurringTension: string;
  generationLogic: string;
}

export interface ExternalRepeatableMethod {
  name: string;
  method: string;
  evidence: string;
}

export interface ExternalAccountExpressionSystem {
  characterRole: string;
  copyTone: string;
  onCameraState: string;
  visualLanguage: string;
  combinedEffect: string;
}

export interface ExternalAccountTransferAsset {
  name: string;
  transferableMechanism: string;
  dependencies: string;
}

export interface ExternalAccountReport {
  account: Record<string, unknown>;
  strategyOverview: ExternalAccountStrategyOverview;
  contentMap: ExternalContentArea[];
  topicEngine: ExternalTopicEngine[];
  repeatableMethods: ExternalRepeatableMethod[];
  expressionSystem: ExternalAccountExpressionSystem;
  transferableAssets: ExternalAccountTransferAsset[];
}

export interface RuntimeSettings {
  apiKey: string;
  baseUrl: string;
  /** Legacy shared model field retained for older saved settings. */
  model: string;
  analysisModel: string;
  replicationModel: string;
  timeout: number;
  videoFps: number;
  maxConcurrent: number;
  /** Generate a creative-seed plan before producing topics. */
  topicSeedEnabled: boolean;
  /** Keep creative-seed review as an explicit, configurable stage. */
  topicSeedReviewEnabled: boolean;
  /** Optional audit for generated topics; disabled by default for the fast flow. */
  topicFactualAuditEnabled: boolean;
  /** Keep the final script fact audit enabled by default. */
  scriptFactualAuditEnabled: boolean;
  douyinCookie: string;
  prompts: Record<string, string>;
  apiKeyConfigured?: boolean;
  douyinCookieConfigured?: boolean;
  promptPackVersion?: string;
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
  report: ExternalVideoBreakdown | ExternalAccountReport | null;
  coverage: Record<string, number> | null;
  error: string | null;
  promptVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedTopic {
  id: string;
  analysisId: string;
  profileId: string;
  batchId: string;
  position: number;
  title: string;
  concept: string;
  hook: string;
  inheritedValue: string;
  profileConnection: string;
  fitReason: string;
  accountRole: string;
}

export interface TopicBatch {
  id: string;
  analysisId: string;
  profileId: string;
  kind: 'video' | 'account';
  direction: string;
  spreadSummary: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  step: string;
  detail: string;
  error?: string | null;
  pipeline?: string[];
  promptVersion: string;
  createdAt: string;
  topics: GeneratedTopic[];
}

export interface IntakeAnswer {
  question: string;
  answer: string;
}

export interface DirectorScript {
  videoIdea: string;
  openingHook: {
    line: string;
    type: string;
    viewerTrigger: string;
    supportingCue: string;
  };
  scriptRows: Array<{
    section: string;
    copy: string;
    purpose: string;
    keyCue: string;
  }>;
  captionAndSound: Array<{
    content: string;
    usage: string;
  }>;
  endingInteraction: {
    endingLine: string;
    commentPrompts: string[];
    pinnedComment: string;
    starterComments: string[];
  };
  teleprompterCopy: string;
}

export interface GeneratedScript {
  id: string;
  topicId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  data: DirectorScript | null;
  error: string | null;
  promptVersion: string;
  activeVersion: number;
  versionCount: number;
}

export interface ScriptVersionSummary {
  version: number;
  promptVersion: string;
  createdAt: string;
}
