from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any, AsyncIterator

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, event, select
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
    encrypted: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


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


class Topic(Base):
    __tablename__ = "topics"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(String(36), default=settings.local_workspace_id, index=True)
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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


engine = create_async_engine(settings.database_url, connect_args={"timeout": 30})


@event.listens_for(engine.sync_engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def init_db() -> None:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.temp_dir.mkdir(parents=True, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


async def get_or_404(session: AsyncSession, model: type[Base], object_id: str):
    value = await session.get(model, object_id)
    if value is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="记录不存在")
    return value


async def list_for_workspace(session: AsyncSession, model: type[Base]):
    return (await session.execute(select(model).where(model.workspace_id == settings.local_workspace_id))).scalars().all()
