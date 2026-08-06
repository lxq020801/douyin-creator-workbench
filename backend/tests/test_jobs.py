import asyncio
import json
from pathlib import Path

import pytest
from sqlalchemy import select

import app.jobs as jobs
from app.db import Analysis, Profile, Script, ScriptVersion, SessionLocal, Topic, TopicBatch, init_db
from app.media.scripts.analyzer import AnalyzeResult
from app.schemas import DirectorScript, RuntimeSettingsIn, TopicBatchModel, TopicSeedPlan


def test_remote_file_is_deleted_when_report_validation_fails(monkeypatch, tmp_path: Path):
    result = AnalyzeResult(
        text="invalid",
        file_id="file-test",
        fps_used=1,
        model="test-model",
        duration_sec=10,
        target_frames=10,
        actual_frames_estimate=10,
    )
    deleted: list[str] = []

    async def fake_analyze_video(*args, **kwargs):
        return result

    def fail_validation(*args, **kwargs):
        raise ValueError("invalid report")

    def record_delete(runtime, analysis_result):
        deleted.append(analysis_result.file_id)

    monkeypatch.setattr(jobs, "analyze_video", fake_analyze_video)
    monkeypatch.setattr(jobs, "_validated_video_output", fail_validation)
    monkeypatch.setattr(jobs, "_delete_remote_files", record_delete)

    runtime = RuntimeSettingsIn(apiKey="test-api-key", model="test-model")
    with pytest.raises(ValueError, match="invalid report"):
        asyncio.run(jobs._analyze_path(tmp_path / "video.mp4", "prompt", runtime, "source"))

    assert deleted == ["file-test"]


def test_script_worker_appends_versions_and_activates_the_latest(monkeypatch):
    generated = 0

    class FakeModelClient:
        def __init__(self, _runtime, model=None):
            pass

        def json(self, *_args, **_kwargs):
            nonlocal generated
            generated += 1
            return DirectorScript.model_validate({
                "videoIdea": f"第 {generated} 版思路",
                "openingHook": {"line": f"第 {generated} 版开头"},
                "scriptRows": [{"section": "开头", "copy": f"第 {generated} 版台词", "purpose": "留人"}],
                "teleprompterCopy": f"第 {generated} 版台词",
            })

    async def passthrough(_client, _label, _profile, draft, _schema, **_kwargs):
        return draft

    monkeypatch.setattr(jobs, "ModelClient", FakeModelClient)
    monkeypatch.setattr(jobs, "factual_final", passthrough)

    async def run() -> tuple[int, int, str, list[int]]:
        await init_db()
        async with SessionLocal() as session:
            profile = Profile(name="脚本版本", data_json=json.dumps({
                "name": "脚本版本", "creatorAndAccount": "本地商家",
                "businessAndGoals": "到店转化", "audienceAndAction": "附近顾客",
                "availableMaterials": "门店", "productionConditions": "手机",
                "toneAndBoundaries": "真实", "originalDescription": "测试",
            }, ensure_ascii=False))
            analysis = Analysis(kind="video", source="https://v.douyin.com/job-versions/", status="completed")
            session.add_all([profile, analysis])
            await session.flush()
            batch = TopicBatch(
                analysis_id=analysis.id, profile_id=profile.id, kind="video",
                direction="测试", spread_summary="测试",
            )
            session.add(batch)
            await session.flush()
            topic = Topic(
                batch_id=batch.id, analysis_id=analysis.id, profile_id=profile.id, position=1,
                data_json=json.dumps({
                    "title": "测试选题", "concept": "测试角度", "hook": "测试钩子",
                    "inheritedValue": "测试机制", "profileConnection": "测试迁移",
                    "fitReason": "测试理由", "accountRole": "",
                }, ensure_ascii=False),
            )
            session.add(topic)
            await session.flush()
            script = Script(topic_id=topic.id, status="queued")
            session.add(script)
            await session.commit()
            script_id = script.id

        await jobs._run_script(script_id)
        async with SessionLocal() as session:
            script = await session.get(Script, script_id)
            assert script is not None
            script.status = "queued"
            await session.commit()
        await jobs._run_script(script_id)

        async with SessionLocal() as session:
            script = await session.get(Script, script_id)
            assert script is not None
            versions = (
                await session.execute(
                    select(ScriptVersion).where(ScriptVersion.script_id == script_id).order_by(ScriptVersion.version)
                )
            ).scalars().all()
            return script.active_version, script.version_count, json.loads(script.data_json or "{}")["videoIdea"], [item.version for item in versions]

    assert asyncio.run(run()) == (2, 2, "第 2 版思路", [1, 2])


def test_topic_worker_saves_batch_after_seed_review(monkeypatch):
    calls: list[type] = []

    class FakeModelClient:
        def __init__(self, _runtime, model=None):
            pass

        def json(self, prompt, schema, **_kwargs):
            calls.append(schema)
            if schema is TopicSeedPlan:
                seeds = [{
                    "sourceValue": f"对标方法 {index}",
                    "profileMaterial": "门店实拍",
                    "audienceProblem": f"观众问题 {index}",
                    "contentTask": f"内容任务 {index}",
                    "expressionForm": f"表达形式 {index}",
                    "distinction": f"区别 {index}",
                } for index in range(1, 21)]
                return TopicSeedPlan.model_validate({"planningDirection": "测试种子方向", "seeds": seeds})
            topic = {
                "title": "可执行选题", "concept": "测试角度", "hook": "测试开头",
                "inheritedValue": "测试方法", "profileConnection": "测试结合", "fitReason": "测试理由",
            }
            assert "已审核创意种子" in prompt
            return TopicBatchModel.model_validate({
                "direction": "测试方向", "spreadSummary": "测试说明", "topics": [topic] * 20,
            })

    async def should_not_run(*_args, **_kwargs):
        raise AssertionError("topic generation must not run factual_final")

    monkeypatch.setattr(jobs, "ModelClient", FakeModelClient)
    monkeypatch.setattr(jobs, "factual_final", should_not_run)

    async def run() -> tuple[str, int, str]:
        await init_db()
        async with SessionLocal() as session:
            profile = Profile(name="异步选题资料", data_json=json.dumps({
                "name": "异步选题资料", "creatorAndAccount": "本地商家",
                "businessAndGoals": "提高转化", "audienceAndAction": "附近顾客",
                "availableMaterials": "门店实拍", "productionConditions": "手机拍摄",
                "toneAndBoundaries": "真实", "originalDescription": "测试",
            }, ensure_ascii=False))
            analysis = Analysis(
                kind="video", source="https://v.douyin.com/async-worker/",
                status="completed", report_json=json.dumps({"source": {}}, ensure_ascii=False),
            )
            session.add_all([profile, analysis])
            await session.flush()
            batch = TopicBatch(
                analysis_id=analysis.id, profile_id=profile.id, kind="video",
                direction="", spread_summary="", status="queued",
            )
            session.add(batch)
            await session.commit()
            batch_id = batch.id

        await jobs._run_topic_generation(batch_id)
        async with SessionLocal() as session:
            batch = await session.get(TopicBatch, batch_id)
            assert batch is not None
            topics = (await session.execute(select(Topic).where(Topic.batch_id == batch_id))).scalars().all()
            return batch.status, len(topics), batch.direction

    assert asyncio.run(run()) == ("completed", 20, "测试方向")
    assert calls == [TopicSeedPlan, TopicSeedPlan, TopicBatchModel]
