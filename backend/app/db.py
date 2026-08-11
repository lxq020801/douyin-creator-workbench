from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any, AsyncIterator

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, event, inspect, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from .config import settings


def now() -> datetime:
    return datetime.utcnow()


def uid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


class Workspace(Base):
    __tablename__ = "workspaces"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), unique=True, index=True
    )
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20), default="user", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


class LoginSession(Base):
    __tablename__ = "login_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Profile(Base):
    __tablename__ = "profiles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(String(36), default=settings.local_workspace_id, index=True)
    name: Mapped[str] = mapped_column(String(120))
    data_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

    def data(self) -> dict[str, Any]:
        return json.loads(self.data_json)


class Analysis(Base):
    __tablename__ = "analyses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(String(36), default=settings.local_workspace_id, index=True)
    kind: Mapped[str] = mapped_column(String(20), index=True)
    source: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text, default="正在准备分析")
    status: Mapped[str] = mapped_column(String(20), default="queued", index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    step: Mapped[str] = mapped_column(String(80), default="queued")
    detail: Mapped[str] = mapped_column(Text, default="任务已创建")
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    report_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    coverage_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    prompt_version: Mapped[str] = mapped_column(String(80), default="codex-topic-diversity-v1")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


class AccountSample(Base):
    __tablename__ = "account_samples"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True)
    source_id: Mapped[str] = mapped_column(String(120), index=True)
    source_json: Mapped[str] = mapped_column(Text)
    selected: Mapped[bool] = mapped_column(Boolean, default=False)
    sample_role: Mapped[str] = mapped_column(String(20), default="metadata")
    status: Mapped[str] = mapped_column(String(20), default="metadata")
    report_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class TopicBatch(Base):
    __tablename__ = "topic_batches"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(String(36), default=settings.local_workspace_id, index=True)
    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True)
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    direction: Mapped[str] = mapped_column(Text)
    spread_summary: Mapped[str] = mapped_column(Text)
    prompt_version: Mapped[str] = mapped_column(String(80), default="codex-topic-diversity-v1")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now, index=True)


class Topic(Base):
    __tablename__ = "topics"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(String(36), default=settings.local_workspace_id, index=True)
    batch_id: Mapped[str] = mapped_column(ForeignKey("topic_batches.id", ondelete="CASCADE"), index=True)
    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True)
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    data_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Script(Base):
    __tablename__ = "scripts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(String(36), default=settings.local_workspace_id, index=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="queued", index=True)
    data_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    prompt_version: Mapped[str] = mapped_column(String(80), default="codex-topic-diversity-v1")
    active_version: Mapped[int] = mapped_column(Integer, default=0)
    version_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


class ScriptVersion(Base):
    __tablename__ = "script_versions"
    __table_args__ = (UniqueConstraint("script_id", "version", name="uq_script_version"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    script_id: Mapped[str] = mapped_column(ForeignKey("scripts.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    data_json: Mapped[str] = mapped_column(Text)
    prompt_version: Mapped[str] = mapped_column(String(80), default="codex-topic-diversity-v1")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


engine = create_async_engine(settings.database_url, connect_args={"timeout": 30})


@event.listens_for(engine.sync_engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=30000")
    cursor.close()


SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


def _profile_v1_to_external(value: dict[str, Any]) -> dict[str, Any]:
    if "creatorAndAccount" in value:
        return value
    identity = str(value.get("creatorIdentity") or "").strip()
    industry = str(value.get("industry") or "").strip()
    promise = str(value.get("valuePromise") or "").strip()
    constraints = str(value.get("constraints") or "").strip()
    return {
        "name": str(value.get("name") or "旧版账号资料"),
        "creatorAndAccount": identity,
        "businessAndGoals": "；".join(item for item in (industry, promise) if item),
        "audienceAndAction": str(value.get("audience") or ""),
        "availableMaterials": str(value.get("formatsAndResources") or ""),
        "productionConditions": constraints,
        "toneAndBoundaries": constraints,
        "originalDescription": str(value.get("originalDescription") or ""),
    }


def _topic_v1_to_external(value: dict[str, Any]) -> dict[str, Any]:
    if "concept" in value:
        return value
    return {
        "title": str(value.get("title") or "旧版选题"),
        "concept": str(value.get("angle") or ""),
        "hook": str(value.get("hook") or ""),
        "inheritedValue": str(value.get("inheritedMechanism") or ""),
        "profileConnection": str(value.get("adaptation") or ""),
        "fitReason": str(value.get("reason") or ""),
        "accountRole": "",
    }


def _script_v1_to_external(value: dict[str, Any]) -> dict[str, Any]:
    if "videoIdea" in value:
        return value
    segments = value.get("segments") if isinstance(value.get("segments"), list) else []
    rows = []
    for segment in segments:
        if not isinstance(segment, dict):
            continue
        rows.append({
            "section": str(segment.get("time") or ""),
            "copy": str(segment.get("copy") or segment.get("copy_text") or ""),
            "purpose": str(segment.get("task") or ""),
            "keyCue": "；".join(
                item for item in (str(segment.get("shooting") or ""), str(segment.get("rhythm") or "")) if item
            ),
        })
    full_copy = str(value.get("fullCopy") or "")
    if not rows and full_copy:
        rows.append({"section": "完整文案", "copy": full_copy, "purpose": "旧版脚本内容", "keyCue": ""})
    notes = value.get("productionNotes") if isinstance(value.get("productionNotes"), list) else []
    return {
        "videoIdea": "；".join(item for item in (str(value.get("title") or ""), str(value.get("duration") or "")) if item),
        "openingHook": {
            "line": str(value.get("openingHook") or ""),
            "type": "",
            "viewerTrigger": "",
            "supportingCue": "",
        },
        "scriptRows": rows,
        "captionAndSound": [{"content": str(note), "usage": "旧版执行提示"} for note in notes],
        "endingInteraction": {
            "endingLine": str(value.get("cta") or ""),
            "commentPrompts": [],
            "pinnedComment": "",
            "starterComments": [],
        },
        "teleprompterCopy": full_copy,
    }


def _migrate_existing_database(sync_conn) -> None:
    inspector = inspect(sync_conn)
    tables = set(inspector.get_table_names())
    for table in ("profiles", "analyses", "topic_batches", "topics", "scripts"):
        if table not in tables:
            continue
        columns = {column["name"] for column in inspector.get_columns(table)}
        if "workspace_id" in columns:
            sync_conn.exec_driver_sql(
                f"UPDATE {table} SET workspace_id = ? WHERE workspace_id IS NULL OR workspace_id = ''",
                (settings.local_workspace_id,),
            )
    if "analyses" in tables:
        columns = {column["name"] for column in inspector.get_columns("analyses")}
        if "prompt_version" not in columns:
            sync_conn.exec_driver_sql(
                "ALTER TABLE analyses ADD COLUMN prompt_version VARCHAR(80) NOT NULL DEFAULT 'legacy-v0.3'"
            )
    if "scripts" in tables:
        columns = {column["name"] for column in inspector.get_columns("scripts")}
        if "prompt_version" not in columns:
            sync_conn.exec_driver_sql(
                "ALTER TABLE scripts ADD COLUMN prompt_version VARCHAR(80) NOT NULL DEFAULT 'legacy-v0.3'"
            )
        if "active_version" not in columns:
            sync_conn.exec_driver_sql(
                "ALTER TABLE scripts ADD COLUMN active_version INTEGER NOT NULL DEFAULT 0"
            )
        if "version_count" not in columns:
            sync_conn.exec_driver_sql(
                "ALTER TABLE scripts ADD COLUMN version_count INTEGER NOT NULL DEFAULT 0"
            )
    if "topics" in tables:
        columns = {column["name"] for column in inspector.get_columns("topics")}
        if "batch_id" not in columns:
            sync_conn.exec_driver_sql("ALTER TABLE topics ADD COLUMN batch_id VARCHAR(36)")

    if {"topics", "topic_batches", "analyses"}.issubset(tables):
        groups = sync_conn.exec_driver_sql(
            "SELECT analysis_id, profile_id, MIN(created_at) FROM topics "
            "WHERE batch_id IS NULL GROUP BY analysis_id, profile_id"
        ).fetchall()
        for analysis_id, profile_id, created_at in groups:
            batch_id = uid()
            kind_row = sync_conn.exec_driver_sql(
                "SELECT kind FROM analyses WHERE id = ?", (analysis_id,)
            ).fetchone()
            kind = str(kind_row[0]) if kind_row else "video"
            sync_conn.exec_driver_sql(
                "INSERT INTO topic_batches "
                "(id, workspace_id, analysis_id, profile_id, kind, direction, spread_summary, prompt_version, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    batch_id, settings.local_workspace_id, analysis_id, profile_id, kind,
                    "旧版选题记录", "由升级前的选题记录自动归档", "legacy-v0.3", created_at or now(),
                ),
            )
            sync_conn.exec_driver_sql(
                "UPDATE topics SET batch_id = ? WHERE analysis_id = ? AND profile_id = ? AND batch_id IS NULL",
                (batch_id, analysis_id, profile_id),
            )
        sync_conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_topics_batch_id ON topics (batch_id)")

    for table, converter in (
        ("profiles", _profile_v1_to_external),
        ("topics", _topic_v1_to_external),
        ("scripts", _script_v1_to_external),
    ):
        if table not in tables:
            continue
        rows = sync_conn.exec_driver_sql(
            f"SELECT id, data_json FROM {table} WHERE data_json IS NOT NULL"
        ).fetchall()
        for row_id, raw in rows:
            try:
                before = json.loads(raw)
                after = converter(before)
            except (TypeError, ValueError, json.JSONDecodeError):
                continue
            if after != before:
                sync_conn.exec_driver_sql(
                    f"UPDATE {table} SET data_json = ? WHERE id = ?",
                    (json.dumps(after, ensure_ascii=False), row_id),
                )

    if {"scripts", "script_versions"}.issubset(tables):
        rows = sync_conn.exec_driver_sql(
            "SELECT id, data_json, prompt_version, created_at FROM scripts "
            "WHERE data_json IS NOT NULL AND NOT EXISTS "
            "(SELECT 1 FROM script_versions WHERE script_versions.script_id = scripts.id)"
        ).fetchall()
        for script_id, data_json, prompt_version, created_at in rows:
            sync_conn.exec_driver_sql(
                "INSERT INTO script_versions "
                "(id, script_id, version, data_json, prompt_version, created_at) "
                "VALUES (?, ?, 1, ?, ?, ?)",
                (uid(), script_id, data_json, prompt_version or "legacy-v0.3", created_at or now()),
            )
            sync_conn.exec_driver_sql(
                "UPDATE scripts SET active_version = 1, version_count = 1 WHERE id = ?",
                (script_id,),
            )


async def init_db() -> None:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.temp_dir.mkdir(parents=True, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_existing_database)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


async def get_or_404(session: AsyncSession, model: type[Base], object_id: str):
    value = await session.get(model, object_id)
    if value is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="记录不存在")
    return value


async def get_for_workspace_or_404(
    session: AsyncSession,
    model: type[Base],
    object_id: str,
    workspace_id: str,
):
    value = (
        await session.execute(
            select(model).where(model.id == object_id, model.workspace_id == workspace_id)
        )
    ).scalar_one_or_none()
    if value is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="记录不存在")
    return value


async def list_for_workspace(session: AsyncSession, model: type[Base], workspace_id: str):
    return (await session.execute(select(model).where(model.workspace_id == workspace_id))).scalars().all()
