import asyncio
import json

from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.db import Base, Setting, _migrate_existing_database
from app.prompts import DEFAULT_PROMPTS
from app.schemas import DirectorScript, RuntimeSettingsIn
from app.settings_service import get_runtime_settings, save_runtime_settings


def test_legacy_database_is_upgraded_without_losing_history(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE profiles (id VARCHAR(36) PRIMARY KEY, workspace_id VARCHAR(36), name VARCHAR(120), "
            "data_json TEXT, created_at DATETIME, updated_at DATETIME)"
        )
        connection.exec_driver_sql(
            "CREATE TABLE analyses (id VARCHAR(36) PRIMARY KEY, workspace_id VARCHAR(36), kind VARCHAR(20), "
            "source TEXT, title TEXT, status VARCHAR(20), progress INTEGER, step VARCHAR(80), detail TEXT, "
            "metadata_json TEXT, report_json TEXT, coverage_json TEXT, error TEXT, job_id VARCHAR(80), "
            "created_at DATETIME, updated_at DATETIME)"
        )
        connection.exec_driver_sql(
            "CREATE TABLE topics (id VARCHAR(36) PRIMARY KEY, workspace_id VARCHAR(36), analysis_id VARCHAR(36), "
            "profile_id VARCHAR(36), position INTEGER, data_json TEXT, created_at DATETIME)"
        )
        connection.exec_driver_sql(
            "CREATE TABLE scripts (id VARCHAR(36) PRIMARY KEY, workspace_id VARCHAR(36), topic_id VARCHAR(36), "
            "status VARCHAR(20), data_json TEXT, error TEXT, job_id VARCHAR(80), created_at DATETIME, updated_at DATETIME)"
        )
        connection.exec_driver_sql(
            "INSERT INTO profiles VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            ("profile-1", "local", "旧资料", json.dumps({
                "name": "旧资料", "industry": "餐饮", "creatorIdentity": "老板",
                "audience": "附近顾客", "valuePromise": "到店消费",
                "formatsAndResources": "门店实拍", "constraints": "手机拍摄",
                "originalDescription": "旧资料描述",
            }, ensure_ascii=False)),
        )
        connection.exec_driver_sql(
            "INSERT INTO analyses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            ("analysis-1", "local", "video", "https://example.com", "旧任务", "completed", 100, "completed", "完成"),
        )
        connection.exec_driver_sql(
            "INSERT INTO topics VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
            ("topic-1", "local", "analysis-1", "profile-1", 1, json.dumps({
                "title": "旧选题", "angle": "旧角度", "hook": "旧钩子", "reason": "旧理由",
                "inheritedMechanism": "旧机制", "adaptation": "旧迁移",
            }, ensure_ascii=False)),
        )
        connection.exec_driver_sql(
            "INSERT INTO scripts VALUES (?, ?, ?, ?, ?, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            ("script-1", "local", "topic-1", "completed", json.dumps({
                "title": "旧脚本", "openingHook": "旧开头", "duration": "30秒", "fullCopy": "连续口播",
                "segments": [{"time": "0-3秒", "task": "抓停留", "copy": "旧开头", "shooting": "近景", "rhythm": "快"}],
                "cta": "评论区聊聊", "productionNotes": ["字幕放大"],
            }, ensure_ascii=False)),
        )

    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        _migrate_existing_database(connection)
        analysis_columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(analyses)")}
        topic_columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(topics)")}
        script_columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(scripts)")}
        assert "prompt_version" in analysis_columns
        assert "batch_id" in topic_columns
        assert {"active_version", "version_count"}.issubset(script_columns)
        batch_id = connection.execute(text("SELECT batch_id FROM topics WHERE id='topic-1'" )).scalar_one()
        assert batch_id
        assert connection.execute(text("SELECT prompt_version FROM topic_batches WHERE id=:id"), {"id": batch_id}).scalar_one() == "legacy-v0.3"
        profile = json.loads(connection.execute(text("SELECT data_json FROM profiles WHERE id='profile-1'" )).scalar_one())
        topic = json.loads(connection.execute(text("SELECT data_json FROM topics WHERE id='topic-1'" )).scalar_one())
        script = json.loads(connection.execute(text("SELECT data_json FROM scripts WHERE id='script-1'" )).scalar_one())
        assert profile["creatorAndAccount"] == "老板"
        assert topic["inheritedValue"] == "旧机制"
        assert script["teleprompterCopy"] == "连续口播"
        assert DirectorScript.model_validate(script).scriptRows[0].spoken_copy == "旧开头"
        saved_version = connection.execute(text(
            "SELECT version, data_json FROM script_versions WHERE script_id='script-1'"
        )).one()
        assert saved_version.version == 1
        assert json.loads(saved_version.data_json)["teleprompterCopy"] == "连续口播"
        active = connection.execute(text(
            "SELECT active_version, version_count FROM scripts WHERE id='script-1'"
        )).one()
        assert active == (1, 1)


def test_old_saved_prompts_cannot_override_external_pack(tmp_path):
    async def run():
        engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'settings.db'}")
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with session_factory() as session:
            session.add_all([
                Setting(key="prompts", value=json.dumps({"videoBreakdown": "旧版提示词"}, ensure_ascii=False)),
                Setting(key="promptPackVersion", value="legacy-v0.3"),
            ])
            await session.commit()
            runtime = await get_runtime_settings(session)
            assert runtime.prompts["videoBreakdown"] == DEFAULT_PROMPTS["videoBreakdown"]

            custom = {**DEFAULT_PROMPTS, "videoBreakdown": "外部版本自定义提示词"}
            await save_runtime_settings(session, RuntimeSettingsIn(prompts=custom))
            assert (await session.get(Setting, "promptPackVersion")).value == settings.prompt_pack_version
            assert (await get_runtime_settings(session)).prompts["videoBreakdown"] == "外部版本自定义提示词"
        await engine.dispose()

    asyncio.run(run())
