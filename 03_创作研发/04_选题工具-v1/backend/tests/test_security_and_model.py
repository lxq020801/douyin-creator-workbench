import json

from app.model_client import parse_json_text
from app.schemas import TopicBatchModel


def test_json_parser_accepts_fenced_model_output():
    assert parse_json_text('```json\n{"ok": true}\n```') == {"ok": True}


def test_topic_contract_requires_exactly_twenty_items():
    topic = {
        "title": "选题", "angle": "角度", "hook": "钩子", "reason": "理由",
        "inheritedMechanism": "机制", "adaptation": "迁移",
    }
    value = TopicBatchModel.model_validate({"topics": [topic] * 20})
    assert len(value.topics) == 20
