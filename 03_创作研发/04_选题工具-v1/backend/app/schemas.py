from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class VideoBeat(BaseModel):
    timecode: str = ""
    originalCopy: str = ""
    role: str = ""
    emotion: str = ""
    visual: str = ""
    transition: str = ""


class EvidencePoint(BaseModel):
    label: str = ""
    evidence: str = ""
    confidence: Literal["高", "中", "待验证"] = "待验证"


class Hook(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    copy_text: str = Field(default="", alias="copy")
    mechanism: str = ""
    visualAction: str = ""


class Craft(BaseModel):
    filming: list[str]
    editing: list[str]
    audio: list[str]
    captions: list[str]


class AudienceSignal(BaseModel):
    summary: str = ""
    basis: list[str] = Field(default_factory=list)
    confidence: Literal["高", "中", "待验证"] = "待验证"


class VideoMetadataLayer(BaseModel):
    category: str = ""
    format: str = ""
    visualStyle: str = ""
    bgmStyle: str = ""
    captionStyle: str = ""
    tags: list[str] = Field(default_factory=list)
    location: str = ""
    keywords: list[str] = Field(default_factory=list)
    audience: AudienceSignal = Field(default_factory=AudienceSignal)


class HookAnalysis(BaseModel):
    copy_text: str = Field(default="", alias="copy")
    type: str = ""
    emotion: str = ""
    viewerTask: str = ""
    evidence: str = ""


class NarrativeStage(BaseModel):
    timeRange: str = ""
    function: str = ""
    content: str = ""
    evidence: str = ""


class EmotionPoint(BaseModel):
    point: str = ""
    emotion: str = ""
    trigger: str = ""
    effect: str = ""


class InteractionAnalysis(BaseModel):
    prompts: list[str] = Field(default_factory=list)
    commentTriggers: list[str] = Field(default_factory=list)
    observedComments: list[str] = Field(default_factory=list)
    note: str = ""


class TrafficLogicLayer(BaseModel):
    hook: HookAnalysis = Field(default_factory=HookAnalysis)
    narrativeSummary: str = ""
    narrativeStages: list[NarrativeStage] = Field(default_factory=list)
    emotionCurve: list[EmotionPoint] = Field(default_factory=list)
    interaction: InteractionAnalysis = Field(default_factory=InteractionAnalysis)


class CommercialLayer(BaseModel):
    valueType: str = ""
    valueSupply: str = ""
    conversionPath: str = ""
    placement: str = ""
    callToAction: str = ""
    platformSignals: list[str] = Field(default_factory=list)
    availabilityNote: str = ""


class ReviewLayer(BaseModel):
    strengths: list[str] = Field(default_factory=list)
    shortcomings: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    formula: str = ""
    transferable: list[str] = Field(default_factory=list)
    nonCopyable: list[str] = Field(default_factory=list)
    boundary: str = ""


class VideoBreakdownModel(BaseModel):
    summary: str = ""
    theme: str = ""
    metadata: VideoMetadataLayer = Field(default_factory=VideoMetadataLayer)
    trafficLogic: TrafficLogicLayer = Field(default_factory=TrafficLogicLayer)
    commercial: CommercialLayer = Field(default_factory=CommercialLayer)
    review: ReviewLayer = Field(default_factory=ReviewLayer)
    # Legacy fields remain readable so reports created before the four-layer
    # contract can still be opened and exported from the workbench.
    hook: Hook = Field(default_factory=Hook)
    beats: list[VideoBeat] = Field(default_factory=list)
    craft: Craft = Field(default_factory=lambda: Craft(filming=[], editing=[], audio=[], captions=[]))
    evidence: list[EvidencePoint] = Field(default_factory=list)
    transferable: list[str] = Field(default_factory=list)
    avoidCopying: list[str] = Field(default_factory=list)
    boundary: str = ""


class VideoBreakdown(VideoBreakdownModel):
    source: VideoSource


class AccountPillar(BaseModel):
    name: str
    ratio: int = Field(ge=0, le=100)
    note: str


class AccountTimeline(BaseModel):
    phase: str
    range: str
    action: str
    signal: str


class AccountComparison(BaseModel):
    dimension: str
    viral: str
    normal: str
    conclusion: str


class TransferRule(BaseModel):
    rule: str
    evidence: str
    boundary: str


class TestTopic(BaseModel):
    title: str
    reason: str
    priority: Literal["优先", "备选"]


class AccountReportModel(BaseModel):
    promise: str
    pillars: list[AccountPillar]
    timeline: list[AccountTimeline]
    hookPatterns: list[str]
    viralVsNormal: list[AccountComparison]
    transferable: list[TransferRule]
    risks: list[str]
    testTopics: list[TestTopic]
    boundary: str


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


class ProfileData(BaseModel):
    name: str
    industry: str
    creatorIdentity: str
    audience: str
    valuePromise: str
    formatsAndResources: str
    constraints: str
    originalDescription: str = ""
    inferredFields: list[str] = Field(default_factory=list)


class ProfileOut(ProfileData):
    id: str
    updatedAt: str


class IntakeRequest(BaseModel):
    description: str = Field(min_length=4, max_length=3000)
    answers: list[str] = Field(default_factory=list, max_length=2)


class IntakeResponse(BaseModel):
    status: Literal["followup", "complete"]
    question: str = ""
    draft: ProfileData | None = None


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
    createdAt: datetime
    updatedAt: datetime


class TopicGenerateRequest(BaseModel):
    profileId: str


class TopicData(BaseModel):
    title: str
    angle: str
    hook: str
    reason: str
    inheritedMechanism: str
    adaptation: str


class TopicBatchModel(BaseModel):
    topics: list[TopicData] = Field(min_length=20, max_length=20)


class TopicOut(TopicData):
    id: str
    analysisId: str
    profileId: str
    position: int


class TopicUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    angle: str = ""
    hook: str = ""
    reason: str = ""
    inheritedMechanism: str = ""
    adaptation: str = ""


class ScriptBatchRequest(BaseModel):
    topicIds: list[str] = Field(min_length=1, max_length=20)

    @field_validator("topicIds")
    @classmethod
    def unique_topics(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(value))


class ScriptSegment(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    time: str
    task: str
    copy_text: str = Field(alias="copy")
    shooting: str
    rhythm: str


class DirectorScript(BaseModel):
    title: str
    openingHook: str
    duration: str
    fullCopy: str
    segments: list[ScriptSegment]
    cta: str
    productionNotes: list[str]


class ScriptOut(BaseModel):
    id: str
    topicId: str
    status: Literal["queued", "running", "completed", "failed"]
    data: DirectorScript | None = None
    error: str | None = None


class ConnectionTestResult(BaseModel):
    ok: bool
    message: str
    detail: dict[str, Any] = Field(default_factory=dict)
