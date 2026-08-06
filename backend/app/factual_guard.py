from __future__ import annotations

import asyncio
import json
import re
from typing import Any, TypeVar

from pydantic import BaseModel

from .model_client import ModelClient, ModelOutputError
from .prompts import factual_audit_prompt, factual_correction_prompt
from .schemas import DirectorScript, FactualAudit, FactualIssue, TopicBatchModel

SchemaT = TypeVar("SchemaT", bound=BaseModel)

_NUMBER_PATTERN = re.compile(r"\d+(?:\.\d+)?(?:%|万|千|百|元|块|小时|分钟|秒|年|月|天|碗|公里|倍|成)?")
_EVENT_PATTERN = re.compile(
    r"去年|上周|昨天|之前|曾经|前几年|最近|有(?:人|朋友|同行|顾客|游客|网友|亲戚|员工|老板|供应商)|"
    r"朋友.{0,12}(?:劝|说|建议)|同行.{0,12}(?:劝|说)|顾客.{0,12}(?:说|反馈|吐槽)|"
    r"私信|找我|问我|劝我|拒绝了?|没答应|不同意|碰到|遇到"
)
_ABSOLUTE_PATTERN = re.compile(
    r"从来不|从来没|一直没|绝不|全部|全都|每天.{0,20}(?:不|都|必须)|"
    r"不用(?:预制|成品|半成品)|不放(?:香精|添加剂|增香剂)|不卖隔夜|当天.{0,12}(?:做|卖|用)|"
    r"现点现做|完全一样|没有.{0,10}添加"
)
_COMPARISON_PATTERN = re.compile(
    r"很多店|好多店|周边店|其他店|普通.{0,6}店|连锁.{0,6}店|同行|网红店|大半|一半以上|"
    r"好多人|很多人|好多(?:顾客|游客|老客|网友|朋友)"
)
_TEXT_NOISE_PATTERN = re.compile(r"[^0-9A-Za-z\u4e00-\u9fff]+")


def _compact_text(value: str) -> str:
    return _TEXT_NOISE_PATTERN.sub("", value)


def _supported_phrase(source: str, phrase: str) -> bool:
    """Accept a short paraphrase when its meaningful characters occur in the source.

    The guard still rejects new facts, but does not require an entire generated
    sentence to be an exact substring of the profile.
    """
    compact_source = _compact_text(source)
    compact_phrase = _compact_text(phrase)
    if not compact_phrase:
        return True
    if compact_phrase in compact_source:
        return True
    cursor = 0
    for character in compact_phrase:
        position = compact_source.find(character, cursor)
        if position < 0 or position - cursor > 6:
            return False
        cursor = position + 1
    return True


def _review_fields(draft: BaseModel) -> list[tuple[str, str]]:
    if isinstance(draft, TopicBatchModel):
        return [
            (f"topics[{index}].{field}", str(getattr(topic, field)))
            for index, topic in enumerate(draft.topics)
            for field in ("title", "concept", "hook")
            if getattr(topic, field)
        ]
    if isinstance(draft, DirectorScript):
        fields = [
            ("videoIdea", draft.videoIdea),
            ("openingHook.line", draft.openingHook.line),
            ("openingHook.supportingCue", draft.openingHook.supportingCue),
            ("endingInteraction.endingLine", draft.endingInteraction.endingLine),
            ("endingInteraction.pinnedComment", draft.endingInteraction.pinnedComment),
            ("teleprompterCopy", draft.teleprompterCopy),
        ]
        fields.extend(
            (f"scriptRows[{index}].copy", row.spoken_copy)
            for index, row in enumerate(draft.scriptRows)
        )
        fields.extend(
            (f"endingInteraction.commentPrompts[{index}]", value)
            for index, value in enumerate(draft.endingInteraction.commentPrompts)
        )
        fields.extend(
            (f"endingInteraction.starterComments[{index}]", value)
            for index, value in enumerate(draft.endingInteraction.starterComments)
        )
        return [(path, value) for path, value in fields if value]
    return []


def _hard_fact_issues(profile: dict[str, Any], draft: BaseModel, topic: dict[str, Any] | None) -> list[FactualIssue]:
    source = json.dumps({"profile": profile, "topic": topic}, ensure_ascii=False)
    issues: list[FactualIssue] = []
    seen: set[tuple[str, str]] = set()
    for path, value in _review_fields(draft):
        reasons: list[str] = []
        unsupported_numbers = [token for token in _NUMBER_PATTERN.findall(value) if token not in source]
        if unsupported_numbers:
            reasons.append(f"出现资料中没有的数字：{'、'.join(dict.fromkeys(unsupported_numbers))}")
        event_match = _EVENT_PATTERN.search(value)
        if event_match and not _supported_phrase(source, event_match.group(0)):
            reasons.append("把资料中未明确提供的人物互动或历史事件写成了既有事实")
        absolute_match = _ABSOLUTE_PATTERN.search(value)
        if absolute_match and not _supported_phrase(source, absolute_match.group(0)):
            reasons.append("加入了资料中未明确提供的长期习惯、工艺细节或绝对承诺")
        if _COMPARISON_PATTERN.search(value) and value not in source:
            reasons.append("加入了资料中未明确提供的同行、顾客或市场比较")
        for reason in reasons:
            key = (path, reason)
            if key in seen:
                continue
            seen.add(key)
            issues.append(FactualIssue(path=path, claim=value, reason=reason))
    return issues[:60]


def _merge_audit(
    audit: FactualAudit,
    profile: dict[str, Any],
    result: BaseModel,
    topic: dict[str, Any] | None,
) -> FactualAudit:
    hard_issues = _hard_fact_issues(profile, result, topic)
    if not hard_issues:
        return audit
    existing = {(issue.path, issue.claim, issue.reason) for issue in audit.issues}
    merged = list(audit.issues)
    merged.extend(
        issue for issue in hard_issues
        if (issue.path, issue.claim, issue.reason) not in existing
    )
    return FactualAudit(passed=False, issues=merged)


async def factual_final(
    client: ModelClient,
    artifact_name: str,
    profile: dict[str, Any],
    draft: SchemaT,
    schema: type[SchemaT],
    *,
    topic: dict[str, Any] | None = None,
    max_output_tokens: int,
    max_corrections: int = 3,
    prompts: dict[str, str] | None = None,
) -> SchemaT:
    result = draft
    for _ in range(max_corrections):
        audit = await asyncio.to_thread(
            client.json,
            factual_audit_prompt(artifact_name, profile, result, topic, prompts),
            FactualAudit,
            max_output_tokens=12000,
        )
        audit = _merge_audit(audit, profile, result, topic)
        if audit.passed:
            return result
        result = await asyncio.to_thread(
            client.json,
            factual_correction_prompt(artifact_name, profile, result, audit, schema, topic, prompts),
            schema,
            max_output_tokens=max_output_tokens,
        )

    hard_issues = _hard_fact_issues(profile, result, topic)
    if hard_issues:
        result = await asyncio.to_thread(
            client.json,
            factual_correction_prompt(
                artifact_name,
                profile,
                result,
                FactualAudit(passed=False, issues=hard_issues),
                schema,
                topic,
                prompts,
            ),
            schema,
            max_output_tokens=max_output_tokens,
        )
        hard_issues = _hard_fact_issues(profile, result, topic)
    if not hard_issues:
        return result
    sample = "；".join(issue.claim for issue in hard_issues[:3])
    raise ModelOutputError(f"{artifact_name}事实审计未通过，未保存结果：{sample}")
