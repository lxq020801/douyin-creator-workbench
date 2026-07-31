from fastapi.testclient import TestClient
import asyncio
import json

import app.main as main_module
from app.db import Analysis, Profile, Script, SessionLocal, Topic, TopicBatch
from app.jobs import _update_analysis
from app.settings_service import get_runtime_settings


def test_analysis_requires_complete_runtime_settings(monkeypatch):
    async def incomplete_settings(_db):
        from app.schemas import RuntimeSettingsIn
        return RuntimeSettingsIn()

    monkeypatch.setattr(main_module, "get_runtime_settings", incomplete_settings)
    with TestClient(main_module.app) as client:
        response = client.post("/api/analyses/video", json={"source": "https://v.douyin.com/example/"})
        assert response.status_code == 409
        assert response.json()["detail"] == "请先在设置页配置：API Key、模型名称、抖音 Cookie"


def test_settings_hide_secrets_and_profile_crud(monkeypatch):
    monkeypatch.setattr(main_module, "enqueue", lambda *args, **kwargs: "job-test")
    with TestClient(main_module.app) as client:
        settings = client.get("/api/settings")
        assert settings.status_code == 200
        payload = settings.json()
        assert len(payload["prompts"]["videoBreakdown"]) > 300
        assert "爆款骨架" in payload["prompts"]["videoBreakdown"]
        assert len(payload["prompts"]["common"]) > 200
        assert payload["promptPackVersion"] == "external-rtf-v3"
        assert set(payload["prompts"]) == {
            "common", "videoBreakdown", "accountSummary", "profileIntake",
            "videoTopics", "accountTopics", "scriptGeneration",
        }
        defaults = client.get("/api/settings/prompts/defaults")
        assert defaults.status_code == 200
        assert defaults.json()["version"] == "external-rtf-v3"
        payload.update({"apiKey": "sk-test-secret", "model": "doubao-test", "douyinCookie": "sessionid=test-cookie-value"})
        saved = client.put("/api/settings", json=payload)
        assert saved.status_code == 200
        assert saved.json()["apiKey"] == ""
        assert saved.json()["douyinCookie"] == ""
        assert saved.json()["apiKeyConfigured"] is True
        assert saved.json()["douyinCookieConfigured"] is True

        saved_payload = saved.json()
        saved_payload["model"] = "doubao-test-updated"
        preserved = client.put("/api/settings", json=saved_payload)
        assert preserved.status_code == 200

        async def read_runtime():
            async with SessionLocal() as session:
                return await get_runtime_settings(session)

        runtime = asyncio.run(read_runtime())
        assert runtime.apiKey == "sk-test-secret"
        assert runtime.douyinCookie == "sessionid=test-cookie-value"
        assert runtime.model == "doubao-test-updated"

        profile_payload = {
            "name": "测试账号", "creatorAndAccount": "编导运营的内容账号",
            "businessAndGoals": "两个月涨粉一千", "audienceAndAction": "内容创作者关注账号",
            "availableMaterials": "真人、录屏和动画", "productionConditions": "单人制作",
            "toneAndBoundaries": "专业直接，不编造案例", "originalDescription": "我是编导，做AI内容",
        }
        created = client.post("/api/profiles", json=profile_payload)
        assert created.status_code == 200
        profile_id = created.json()["id"]
        assert client.get("/api/profiles").json()[0]["id"] == profile_id

        analysis = client.post("/api/analyses/video", json={"source": "https://v.douyin.com/example/"})
        assert analysis.status_code == 200
        assert analysis.json()["status"] == "queued"

        assert client.delete(f"/api/profiles/{profile_id}").status_code == 204


def test_scripts_can_be_filtered_by_analysis_and_delete_cascades(monkeypatch):
    monkeypatch.setattr(main_module, "enqueue", lambda *args, **kwargs: "job-test")

    async def seed() -> tuple[str, str, str]:
        async with SessionLocal() as session:
            profile = Profile(name="筛选资料", data_json=json.dumps({
                "name": "筛选资料", "creatorAndAccount": "AI编导账号",
                "businessAndGoals": "提高效率", "audienceAndAction": "创作者关注",
                "availableMaterials": "录屏", "productionConditions": "单人",
                "toneAndBoundaries": "真实", "originalDescription": "测试",
            }, ensure_ascii=False))
            first = Analysis(kind="video", source="https://v.douyin.com/first/", status="completed")
            second = Analysis(kind="video", source="https://v.douyin.com/second/", status="completed")
            session.add_all([profile, first, second])
            await session.flush()
            first_batch = TopicBatch(
                analysis_id=first.id, profile_id=profile.id, kind="video",
                direction="方向一", spread_summary="发散一",
            )
            second_batch = TopicBatch(
                analysis_id=second.id, profile_id=profile.id, kind="video",
                direction="方向二", spread_summary="发散二",
            )
            session.add_all([first_batch, second_batch])
            await session.flush()
            first_topic = Topic(batch_id=first_batch.id, analysis_id=first.id, profile_id=profile.id, position=1, data_json=json.dumps({
                "title": "选题一", "concept": "角度", "hook": "钩子", "fitReason": "理由",
                "inheritedValue": "机制", "profileConnection": "迁移", "accountRole": "",
            }, ensure_ascii=False))
            second_topic = Topic(batch_id=second_batch.id, analysis_id=second.id, profile_id=profile.id, position=1, data_json=json.dumps({
                "title": "选题二", "concept": "角度", "hook": "钩子", "fitReason": "理由",
                "inheritedValue": "机制", "profileConnection": "迁移", "accountRole": "",
            }, ensure_ascii=False))
            session.add_all([first_topic, second_topic])
            await session.flush()
            session.add_all([Script(topic_id=first_topic.id), Script(topic_id=second_topic.id)])
            await session.commit()
            return first.id, first_topic.id, second.id

    with TestClient(main_module.app) as client:
        first_id, first_topic_id, second_id = asyncio.run(seed())
        filtered = client.get(f"/api/scripts?analysisId={first_id}")
        assert filtered.status_code == 200
        assert [item["topicId"] for item in filtered.json()] == [first_topic_id]
        assert client.delete(f"/api/analyses/{first_id}").status_code == 204
        assert client.get(f"/api/scripts?analysisId={first_id}").json() == []
        assert len(client.get(f"/api/scripts?analysisId={second_id}").json()) == 1


def test_cancelled_analysis_cannot_be_overwritten():
    async def run() -> str:
        async with SessionLocal() as session:
            row = Analysis(kind="video", source="https://v.douyin.com/cancelled/", status="cancelled")
            session.add(row)
            await session.commit()
            analysis_id = row.id
        await _update_analysis(analysis_id, status="completed", progress=100, detail="不应写入")
        async with SessionLocal() as session:
            saved = await session.get(Analysis, analysis_id)
            assert saved is not None
            return saved.status

    assert asyncio.run(run()) == "cancelled"


def test_batch_enqueue_failure_is_isolated_and_retryable(monkeypatch):
    async def seed() -> list[str]:
        async with SessionLocal() as session:
            profile = Profile(name="批量资料", data_json=json.dumps({
                "name": "批量资料", "creatorAndAccount": "AI编导账号",
                "businessAndGoals": "提高效率", "audienceAndAction": "创作者关注",
                "availableMaterials": "录屏", "productionConditions": "单人",
                "toneAndBoundaries": "真实", "originalDescription": "测试",
            }, ensure_ascii=False))
            analysis = Analysis(kind="video", source="https://v.douyin.com/batch/", status="completed")
            session.add_all([profile, analysis])
            await session.flush()
            batch = TopicBatch(
                analysis_id=analysis.id, profile_id=profile.id, kind="video",
                direction="批量方向", spread_summary="批量发散",
            )
            session.add(batch)
            await session.flush()
            topics = [
                Topic(batch_id=batch.id, analysis_id=analysis.id, profile_id=profile.id, position=index, data_json=json.dumps({
                    "title": f"选题 {index}", "concept": "角度", "hook": "钩子", "fitReason": "理由",
                    "inheritedValue": "机制", "profileConnection": "迁移", "accountRole": "",
                }, ensure_ascii=False))
                for index in range(1, 3)
            ]
            session.add_all(topics)
            await session.commit()
            return [topic.id for topic in topics]

    attempts = 0

    def partial_enqueue(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise RuntimeError("queue unavailable")
        return f"job-{attempts}"

    with TestClient(main_module.app) as client:
        topic_ids = asyncio.run(seed())
        monkeypatch.setattr(main_module, "enqueue", partial_enqueue)
        response = client.post("/api/scripts/batch", json={"topicIds": topic_ids})
        assert response.status_code == 200
        scripts = response.json()
        assert sorted(script["status"] for script in scripts) == ["failed", "queued"]

        failed_id = next(script["id"] for script in scripts if script["status"] == "failed")

        def still_unavailable(*args, **kwargs):
            raise RuntimeError("still unavailable")

        monkeypatch.setattr(main_module, "enqueue", still_unavailable)
        still_failed = client.post(f"/api/scripts/{failed_id}/retry")
        assert still_failed.status_code == 200
        assert still_failed.json()["status"] == "failed"

        monkeypatch.setattr(main_module, "enqueue", lambda *args, **kwargs: "retry-job")
        retried = client.post(f"/api/scripts/{failed_id}/retry")
        assert retried.status_code == 200
        assert retried.json()["status"] == "queued"


def test_analysis_retry_stays_retryable_when_queue_is_unavailable(monkeypatch):
    async def seed() -> str:
        async with SessionLocal() as session:
            row = Analysis(kind="account", source="https://www.douyin.com/user/test", status="failed")
            session.add(row)
            await session.commit()
            return row.id

    with TestClient(main_module.app) as client:
        analysis_id = asyncio.run(seed())

        def unavailable(*args, **kwargs):
            raise RuntimeError("queue unavailable")

        monkeypatch.setattr(main_module, "enqueue", unavailable)
        response = client.post(f"/api/analyses/{analysis_id}/retry")
        assert response.status_code == 200
        assert response.json()["status"] == "failed"
        assert "任务队列不可用" in response.json()["error"]
