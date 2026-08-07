import asyncio
import json
from pathlib import Path

import pytest
from sqlalchemy import select

import app.jobs as jobs
from app.db import Analysis, Profile, Script, ScriptVersion, SessionLocal, Topic, TopicBatch, init_db
from app.media.scripts.analyzer import AnalyzeResult
from app.schemas import DirectorScript, RuntimeSettingsIn


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
        def __init__(self, _runtime):
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
