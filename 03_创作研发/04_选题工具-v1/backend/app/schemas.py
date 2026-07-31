from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class SourceMetrics(BaseModel):
    views: int | None = None
    likes: int | None = None
    comments: int | None = None
    shares: int | None = None
    collects: int | None = None
    publishedAt: str | None = None


class VideoSource(BaseModel):
    id: str
    url: str
    title: str
    author: str = ""
    duration: str = ""
    coverUrl: str = ""
    metrics: SourceMetrics


class BreakoutJudgment(BaseModel):
    entryPoint: str = ""
    viewerSituation: str = ""
    emotionalValue: str = ""
    coreAttraction: str = ""


class SkeletonStage(BaseModel):
    timeRange: str = ""
    name: str = ""
    function: str = ""


class ViralSkeleton(BaseModel):
    formula: str = ""
    stages: list[SkeletonStage] = Field(default_factory=list)


class OpeningHook(BaseModel):
    firstFrame: str = ""
    openingLine: str = ""
    supportingElements: list[str] = Field(default_factory=list)
    audienceTrigger: str = ""
    viewingExpectation: str = ""


class CopyRetentionPoint(BaseModel):
    excerpt: str = ""
    function: str = ""
    bridge: str = ""


class AudiovisualPoint(BaseModel):
    element: str = ""
    design: str = ""
    function: str = ""


class ReplicableMethod(BaseModel):
    name: str = ""
    originalUse: str = ""
    mustKeep: str = ""
    replaceable: list[str] = Field(default_factory=list)


class VideoBreakdownModel(BaseModel):
    breakoutJudgment: BreakoutJudgment
    viralSkeleton: ViralSkeleton
    openingHook: OpeningHook
    copyRetention: list[CopyRetentionPoint] = Field(min_length=3, max_length=5)
    audiovisual: list[AudiovisualPoint] = Field(default_factory=list)
    replicableMethods: list[ReplicableMethod] = Field(min_length=3, max_length=5)


class VideoBreakdown(VideoBreakdownModel):
    source: VideoSource


class AccountStrategyOverview(BaseModel):
    coreAudience: str = ""
    coreValue: str = ""
    attentionModel: str = ""
    positioning: str = ""
    monetizationLogic: str = ""


class ContentArea(BaseModel):
    name: str = ""
    role: str = ""
    recurringPattern: str = ""


class TopicEngine(BaseModel):
    source: str = ""
    recurringTension: str = ""
    generationLogic: str = ""


class RepeatableMethod(BaseModel):
    name: str = ""
    method: str = ""
    evidence: str = ""


class AccountExpressionSystem(BaseModel):
    characterRole: str = ""
    copyTone: str = ""
    onCameraState: str = ""
    visualLanguage: str = ""
    combinedEffect: str = ""


class AccountTransferAsset(BaseModel):
    name: str = ""
    transferableMechanism: str = ""
    dependencies: str = ""


class AccountReportModel(BaseModel):
    strategyOverview: AccountStrategyOverview
    contentMap: list[ContentArea] = Field(min_length=1)
    topicEngine: list[TopicEngine] = Field(min_length=1)
    repeatableMethods: list[RepeatableMethod] = Field(min_length=5, max_length=6)
    expressionSystem: AccountExpressionSystem
    transferableAssets: list[AccountTransferAsset] = Field(min_length=4, max_length=5)


class AccountReport(AccountReportModel):
    account: dict[str, Any]


class RuntimeSettingsIn(BaseModel):
    apiKey: str = ""
    baseUrl: str = "https://ark.cn-beijing.volces.com/api/v3"
    model: str = ""
    timeout: int = Field(default=900, ge=30, le=3600)
    videoFps: float = Field(default=1, ge=0.1, le=5)
    maxConcurrent: int = Field(default=3, ge=1, le=3)
    douyinCookie: str = ""
    prompts: dict[str, str] = Field(default_factory=dict)


class RuntimeSettingsOut(RuntimeSettingsIn):
    apiKeyConfigured: bool = False
    douyinCookieConfigured: bool = False
    promptPackVersion: str = "external-rtf-v3"


class ProfileData(BaseModel):
    name: str
    creatorAndAccount: str
    businessAndGoals: str
    audienceAndAction: str
    availableMaterials: str
    productionConditions: str
    toneAndBoundaries: str
    originalDescription: str = ""


class ProfileOut(ProfileData):
    id: str
    updatedAt: str


class IntakeAnswer(BaseModel):
    question: str
    answer: str


class IntakeRequest(BaseModel):
    description: str = Field(min_length=4, max_length=6000)
    answers: list[IntakeAnswer] = Field(default_factory=list, max_length=8)


class IntakeResponse(BaseModel):
    status: Literal["followup", "complete"]
    question: str = ""
    draft: ProfileData | None = None

    @model_validator(mode="after")
    def response_matches_status(self):
        if self.status == "followup" and not self.question.strip():
            raise ValueError("需要追问时必须返回一个具体问题")
        if self.status == "complete" and self.draft is None:
            raise ValueError("信息足够时必须返回完整资料卡")
        return self


class AnalysisCreate(BaseModel):
    source: str = Field(min_length=8, max_length=3000)


class AnalysisOut(BaseModel):
    id: str
    kind: Literal["video", "account"]
    source: str
    title: str
    status: Literal["queued", "running", "completed", "failed", "cancelled"]
    progress: int
    step: str
    detail: str
    metadata: dict[str, Any] | None = None
    report: dict[str, Any] | None = None
    coverage: dict[str, Any] | None = None
    error: str | None = None
    promptVersion: str = "external-rtf-v3"
    createdAt: datetime
    updatedAt: datetime


class TopicGenerateRequest(BaseModel):
    profileId: str


class TopicData(BaseModel):
    title: str
    concept: str
    hook: str
    inheritedValue: str
    profileConnection: str
    fitReason: str = ""
    accountRole: str = ""


class TopicBatchModel(BaseModel):
    direction: str
    spreadSummary: str
    topics: list[TopicData] = Field(min_length=20, max_length=20)


class FactualIssue(BaseModel):
    path: str
    claim: str
    reason: str


class FactualAudit(BaseModel):
    passed: bool
    issues: list[FactualIssue] = Field(default_factory=list)

    @model_validator(mode="after")
    def result_matches_issues(self):
        if self.passed and self.issues:
            raise ValueError("审计通过时不能同时返回事实问题")
        if not self.passed and not self.issues:
            raise ValueError("审计未通过时必须返回具体事实问题")
        return self


class TopicOut(TopicData):
    id: str
    analysisId: str
    profileId: str
    batchId: str
    position: int


class TopicBatchOut(BaseModel):
    id: str
    analysisId: str
    profileId: str
    kind: Literal["video", "account"]
    direction: str
    spreadSummary: str
    promptVersion: str
    createdAt: datetime
    topics: list[TopicOut]


class TopicUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    concept: str = ""
    hook: str = ""
    inheritedValue: str = ""
    profileConnection: str = ""
    fitReason: str = ""
    accountRole: str = ""


class ScriptBatchRequest(BaseModel):
    topicIds: list[str] = Field(min_length=1, max_length=20)

    @field_validator("topicIds")
    @classmethod
    def unique_topics(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(value))


class OpeningHookScript(BaseModel):
    line: str = ""
    type: str = ""
    viewerTrigger: str = ""
    supportingCue: str = ""


class ScriptRow(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    section: str = ""
    spoken_copy: str = Field(default="", alias="copy")
    purpose: str = ""
    keyCue: str = ""


class CaptionSoundCue(BaseModel):
    content: str = ""
    usage: str = ""


class EndingInteraction(BaseModel):
    endingLine: str = ""
    commentPrompts: list[str] = Field(default_factory=list)
    pinnedComment: str = ""
    starterComments: list[str] = Field(default_factory=list)


class DirectorScript(BaseModel):
    videoIdea: str
    openingHook: OpeningHookScript
    scriptRows: list[ScriptRow] = Field(min_length=1)
    captionAndSound: list[CaptionSoundCue] = Field(default_factory=list)
    endingInteraction: EndingInteraction = Field(default_factory=EndingInteraction)
    teleprompterCopy: str


class ScriptOut(BaseModel):
    id: str
    topicId: str
    status: Literal["queued", "running", "completed", "failed"]
    data: DirectorScript | None = None
    error: str | None = None
    promptVersion: str = "external-rtf-v3"


class ConnectionTestResult(BaseModel):
    ok: bool
    message: str
    detail: dict[str, Any] = Field(default_factory=dict)
