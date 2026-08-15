import asyncio

from app.factual_guard import factual_final
from app.model_client import parse_json_text
from app.prompts import factual_audit_prompt, topics_prompt
from app.schemas import FactualAudit, FactualIssue, IntakeResponse, TopicBatchModel
from pydantic import ValidationError
import pytest


def test_json_parser_accepts_fenced_model_output():
    assert parse_json_text('```json\n{"ok": true}\n```') == {"ok": True}


def test_topic_contract_requires_exactly_ten_items():
    topic = {
        "title": "选题", "concept": "角度", "hook": "钩子", "fitReason": "理由",
        "inheritedValue": "机制", "profileConnection": "迁移", "accountRole": "拉新",
    }
    value = TopicBatchModel.model_validate({"direction": "杂交方向", "spreadSummary": "发散说明", "topics": [topic] * 10})
    assert len(value.topics) == 10


def test_topic_contract_rejects_wrong_item_count():
    topic = {
        "title": "选题", "concept": "角度", "hook": "钩子", "fitReason": "理由",
        "inheritedValue": "机制", "profileConnection": "迁移", "accountRole": "拉新",
    }
    with pytest.raises(ValidationError):
        TopicBatchModel.model_validate({"direction": "方向", "spreadSummary": "说明", "topics": [topic] * 19})


def test_intake_status_requires_matching_payload():
    with pytest.raises(ValidationError):
        IntakeResponse.model_validate({"status": "followup", "question": ""})
    with pytest.raises(ValidationError):
        IntakeResponse.model_validate({"status": "complete", "draft": None})


def test_topic_stage_hides_source_metadata_from_video_prompt():
    prompt = topics_prompt(
        "video",
        {"source": {"title": "不应传递的标题", "metrics": {"likes": 100}}, "replicableMethods": []},
        {"name": "测试资料"},
        {},
    )
    assert "不应传递的标题" not in prompt
    assert "replicableMethods" in prompt


def test_video_topic_prompt_requires_diverse_creative_engines():
    prompt = topics_prompt("video", {}, {"name": "测试资料"}, {})
    assert "至少覆盖6种不同的内容发动机" in prompt
    assert "禁止整体换皮" in prompt
    assert "同一发动机最多2条" in prompt


def test_topic_review_reuses_external_prompt_and_checks_unsupported_facts():
    topic = {
        "title": "选题", "concept": "角度", "hook": "钩子", "fitReason": "理由",
        "inheritedValue": "机制", "profileConnection": "迁移", "accountRole": "拉新",
    }
    draft = TopicBatchModel.model_validate({
        "direction": "杂交方向", "spreadSummary": "发散说明", "topics": [topic] * 10,
    })
    prompt = factual_audit_prompt("对标选题", {"name": "测试资料"}, draft)
    assert "不负责创意策划" in prompt
    assert "待校验初稿" in prompt
    assert "事实依据输入中明确出现" in prompt
    assert "杂交方向" in prompt


def test_factual_guard_corrects_then_requires_a_clean_audit():
    topic = {
        "title": "选题", "concept": "角度", "hook": "钩子", "fitReason": "理由",
        "inheritedValue": "机制", "profileConnection": "迁移", "accountRole": "拉新",
    }
    draft = TopicBatchModel.model_validate({
        "direction": "初稿", "spreadSummary": "发散", "topics": [topic] * 10,
    })
    corrected = draft.model_copy(update={"direction": "已校正"})

    class FakeClient:
        def __init__(self):
            self.responses = [
                FactualAudit(passed=False, issues=[FactualIssue(path="direction", claim="初稿", reason="无依据")]),
                corrected,
                FactualAudit(passed=True),
            ]

        def json(self, *args, **kwargs):
            return self.responses.pop(0)

    result = asyncio.run(factual_final(
        FakeClient(), "对标选题", {"name": "资料"}, draft, TopicBatchModel, max_output_tokens=20000,
    ))
    assert result.direction == "已校正"


def test_factual_guard_rejects_events_even_when_model_audit_misses_them():
    unsafe_topic = {
        "title": "去年朋友劝我省成本", "concept": "去年朋友劝我换便宜材料",
        "hook": "上周同行说我太傻", "fitReason": "理由", "inheritedValue": "机制",
        "profileConnection": "迁移", "accountRole": "拉新",
    }
    safe_topic = {
        "title": "把制作过程拍明白", "concept": "聊自己做账号的真实运营思路，记录已有制作过程",
        "hook": "今天把制作过程完整拍给你看", "fitReason": "理由", "inheritedValue": "机制",
        "profileConnection": "迁移", "accountRole": "拉新",
    }
    draft = TopicBatchModel.model_validate({
        "direction": "方向", "spreadSummary": "发散", "topics": [unsafe_topic] * 10,
    })
    corrected = TopicBatchModel.model_validate({
        "direction": "方向", "spreadSummary": "发散", "topics": [safe_topic] * 10,
    })

    class FakeClient:
        def __init__(self):
            self.responses = [FactualAudit(passed=True), corrected, FactualAudit(passed=True)]

        def json(self, *args, **kwargs):
            return self.responses.pop(0)

    result = asyncio.run(factual_final(
        FakeClient(), "对标选题", {"availableMaterials": "制作过程"}, draft,
        TopicBatchModel, max_output_tokens=20000,
    ))
    assert result.topics[0].title == "把制作过程拍明白"
