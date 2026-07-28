import json

from app.model_client import parse_json_text
from app.schemas import TopicBatchModel
from app.security import decrypt_secret, encrypt_secret, mask_secret


def test_secret_roundtrip_and_masking():
    encrypted = encrypt_secret("sk-a-real-secret-value")
    assert "sk-a-real-secret-value" not in encrypted
    assert decrypt_secret(encrypted) == "sk-a-real-secret-value"
    assert mask_secret("sk-a-real-secret-value").startswith("sk-")
    assert "real-secret" not in mask_secret("sk-a-real-secret-value")


def test_json_parser_accepts_fenced_model_output():
    assert parse_json_text('```json\n{"ok": true}\n```') == {"ok": True}


def test_topic_contract_requires_exactly_twenty_items():
    topic = {
        "title": "选题", "angle": "角度", "hook": "钩子", "reason": "理由",
        "inheritedMechanism": "机制", "adaptation": "迁移",
    }
    value = TopicBatchModel.model_validate({"topics": [topic] * 20})
    assert len(value.topics) == 20
