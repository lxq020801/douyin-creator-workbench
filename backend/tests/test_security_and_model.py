import asyncio

from app.factual_guard import _hard_fact_issues, factual_final
from app.model_client import parse_json_text
from app.prompts import factual_audit_prompt, topic_seed_prompt, topic_seed_review_prompt, topics_prompt
from app.schemas import FactualAudit, FactualIssue, IntakeResponse, TopicBatchModel, TopicSeedPlan
from pydantic import ValidationError
import pytest


def test_json_parser_accepts_fenced_model_output():
    assert parse_json_text('```json\n{"ok": true}\n```') == {"ok": True}


def test_topic_contract_requires_exactly_twenty_items():
    topic = {
        "title": "选题", "concept": "角度", "hook": "钩子", "fitReason": "理由",
        "inheritedValue": "机制", "profileConnection": "迁移", "accountRole": "拉新",
    }
    value = TopicBatchModel.model_validate({"direction": "杂交方向", "spreadSummary": "发散说明", "topics": [topic] * 20})
    assert len(value.topics) == 20


def test_topic_contract_rejects_wrong_item_count():
    topic = {
        "title": "选题", "concept": "角度", "hook": "钩子", "fitReason": "理由",
        "inheritedValue": "机制", "profileConnection": "迁移", "accountRole": "拉新",
    }
    with pytest.raises(ValidationError):
        TopicBatchModel.model_validate({"direction": "方向", "spreadSummary": "说明", "topics": [topic] * 19})


def test_topic_seed_contract_requires_exactly_twenty_items():
    seed = {
        "sourceValue": "方法", "profileMaterial": "门店", "audienceProblem": "问题",
        "contentTask": "任务", "expressionForm": "形式", "distinction": "区别",
    }
    value = TopicSeedPlan.model_validate({"planningDirection": "方向", "seeds": [seed] * 20})
    assert len(value.seeds) == 20
    with pytest.raises(ValidationError):
        TopicSeedPlan.model_validate({"planningDirection": "方向", "seeds": [seed] * 19})


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


def test_reviewed_seed_plan_is_passed_to_topic_prompt():
    seed = {
        "sourceValue": "反常识开头", "profileMaterial": "门店实拍", "audienceProblem": "选择困难",
        "contentTask": "建立判断标准", "expressionForm": "现场演示", "distinction": "以过程为证",
    }
    plan = {"planningDirection": "测试方向", "seeds": [seed] * 20}
    prompt = topics_prompt("video", {"replicableMethods": []}, {"name": "资料"}, {}, seed_plan=plan)
    assert "已审核创意种子" in prompt
    assert "反常识开头" in prompt


def test_seed_prompts_keep_video_report_and_profile_context():
    seed_prompt = topic_seed_prompt("video", {"replicableMethods": [{"name": "方法"}]}, {"name": "资料"}, {})
    plan = TopicSeedPlan.model_validate({
        "planningDirection": "方向",
        "seeds": [{
            "sourceValue": "方法", "profileMaterial": "门店", "audienceProblem": "问题",
            "contentTask": "任务", "expressionForm": "形式", "distinction": "区别",
        }] * 20,
    })
    review_prompt = topic_seed_review_prompt("video", {"replicableMethods": [{"name": "方法"}]}, {"name": "资料"}, plan, {})
    assert "方法" in seed_prompt and "资料" in seed_prompt
    assert "待审核创意种子" in review_prompt


def test_topic_review_reuses_external_prompt_and_checks_unsupported_facts():
    topic = {
        "title": "选题", "concept": "角度", "hook": "钩子", "fitReason": "理由",
        "inheritedValue": "机制", "profileConnection": "迁移", "accountRole": "拉新",
    }
    draft = TopicBatchModel.model_validate({
        "direction": "杂交方向", "spreadSummary": "发散说明", "topics": [topic] * 20,
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
        "direction": "初稿", "spreadSummary": "发散", "topics": [topic] * 20,
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
        "direction": "方向", "spreadSummary": "发散", "topics": [unsafe_topic] * 20,
    })
    corrected = TopicBatchModel.model_validate({
        "direction": "方向", "spreadSummary": "发散", "topics": [safe_topic] * 20,
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


def test_factual_guard_accepts_supported_customer_feedback_paraphrase():
    topic = {
        "title": "分享门店的真实顾客反馈日常", "concept": "记录顾客反馈内容",
        "hook": "今天聊聊门店日常", "fitReason": "理由", "inheritedValue": "机制",
        "profileConnection": "迁移", "accountRole": "建立信任",
    }
    draft = TopicBatchModel.model_validate({
        "direction": "方向", "spreadSummary": "说明", "topics": [topic] * 20,
    })
    issues = _hard_fact_issues(
        {"availableMaterials": "可拍摄真实顾客反馈内容和门店日常"}, draft, None,
    )
    assert not issues
