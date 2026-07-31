from __future__ import annotations

import asyncio
import json
import shutil
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from redis.exceptions import RedisError
from rq.job import Job
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import AccountSample, Analysis, Profile, Script, ScriptVersion, Topic, TopicBatch, get_db, get_or_404, init_db
from .factual_guard import factual_final
from .job_queue import connection, enqueue
from .media.douyin import probe_cookie
from .model_client import ModelClient, ModelOutputError
from .prompts import DEFAULT_PROMPTS, intake_prompt, topics_prompt
from .schemas import (
    AnalysisCreate,
    AnalysisOut,
    ConnectionTestResult,
    IntakeRequest,
    IntakeResponse,
    ProfileData,
    ProfileOut,
    RuntimeSettingsIn,
    RuntimeSettingsOut,
    ScriptBatchRequest,
    ScriptOut,
    ScriptVersionOut,
    TopicBatchModel,
    TopicBatchOut,
    TopicGenerateRequest,
    TopicOut,
    TopicUpdate,
)
from .settings_service import get_public_settings, get_runtime_settings, save_runtime_settings


def _cleanup_temp() -> None:
    settings.temp_dir.mkdir(parents=True, exist_ok=True)
    cutoff = datetime.utcnow() - timedelta(hours=settings.temp_retention_hours)
    for child in settings.temp_dir.iterdir():
        try:
            modified = datetime.utcfromtimestamp(child.stat().st_mtime)
            if modified < cutoff:
                shutil.rmtree(child) if child.is_dir() else child.unlink()
        except OSError:
            continue


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    await asyncio.to_thread(_cleanup_temp)
    yield


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[item.strip() for item in settings.cors_origins.split(",") if item.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _loads(value: str | None) -> dict[str, Any] | None:
    return json.loads(value) if value else None


def analysis_out(row: Analysis) -> AnalysisOut:
    return AnalysisOut(
        id=row.id, kind=row.kind, source=row.source, title=row.title, status=row.status,
        progress=row.progress, step=row.step, detail=row.detail,
        metadata=_loads(row.metadata_json), report=_loads(row.report_json), coverage=_loads(row.coverage_json),
        error=row.error, promptVersion=row.prompt_version, createdAt=row.created_at, updatedAt=row.updated_at,
    )


def profile_out(row: Profile) -> ProfileOut:
    return ProfileOut(id=row.id, updatedAt=row.updated_at.isoformat(), **row.data())


def topic_out(row: Topic) -> TopicOut:
    return TopicOut(id=row.id, analysisId=row.analysis_id, profileId=row.profile_id, batchId=row.batch_id, position=row.position, **json.loads(row.data_json))


def topic_batch_out(row: TopicBatch, topics: list[Topic]) -> TopicBatchOut:
    return TopicBatchOut(
        id=row.id, analysisId=row.analysis_id, profileId=row.profile_id, kind=row.kind,
        direction=row.direction, spreadSummary=row.spread_summary,
        promptVersion=row.prompt_version, createdAt=row.created_at,
        topics=[topic_out(topic) for topic in topics],
    )


def script_out(row: Script) -> ScriptOut:
    return ScriptOut(
        id=row.id, topicId=row.topic_id, status=row.status, data=_loads(row.data_json),
        error=row.error, promptVersion=row.prompt_version,
        activeVersion=row.active_version, versionCount=row.version_count,
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": settings.app_version}


@app.get("/health/ready")
async def ready(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    checks = {"database": "ok", "redis": "ok"}
    try:
        await db.execute(select(Analysis.id).limit(1))
    except Exception as exc:
        checks["database"] = f"error:{exc.__class__.__name__}"
    try:
        connection().ping()
    except Exception as exc:
        checks["redis"] = f"error:{exc.__class__.__name__}"
    ok = all(value == "ok" for value in checks.values())
    if not ok:
        raise HTTPException(status_code=503, detail=checks)
    return {"status": "ready", "checks": checks}


@app.get("/api/settings", response_model=RuntimeSettingsOut)
async def settings_get(db: AsyncSession = Depends(get_db)):
    return await get_public_settings(db)


@app.put("/api/settings", response_model=RuntimeSettingsOut)
async def settings_put(payload: RuntimeSettingsIn, db: AsyncSession = Depends(get_db)):
    return await save_runtime_settings(db, payload)


@app.get("/api/settings/prompts/defaults")
async def settings_prompt_defaults() -> dict[str, Any]:
    return {"version": settings.prompt_pack_version, "prompts": DEFAULT_PROMPTS}


@app.post("/api/settings/test-model", response_model=ConnectionTestResult)
async def test_model(db: AsyncSession = Depends(get_db)):
    runtime = await get_runtime_settings(db)
    try:
        text = await asyncio.to_thread(ModelClient(runtime).text, "只回复：连接正常", max_output_tokens=30)
        return ConnectionTestResult(ok=True, message="模型连接正常", detail={"reply": text[:80], "model": runtime.model})
    except Exception as exc:
        return ConnectionTestResult(ok=False, message="模型连接失败", detail={"error": str(exc)[:300]})


@app.post("/api/settings/test-cookie", response_model=ConnectionTestResult)
async def test_cookie(db: AsyncSession = Depends(get_db)):
    runtime = await get_runtime_settings(db)
    ok, message = await probe_cookie(runtime.douyinCookie)
    return ConnectionTestResult(ok=ok, message=message)


@app.get("/api/profiles", response_model=list[ProfileOut])
async def profiles_list(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Profile).where(Profile.workspace_id == settings.local_workspace_id).order_by(Profile.updated_at.desc()))).scalars().all()
    return [profile_out(row) for row in rows]


@app.post("/api/profiles", response_model=ProfileOut)
async def profiles_create(payload: ProfileData, db: AsyncSession = Depends(get_db)):
    row = Profile(name=payload.name, data_json=payload.model_dump_json())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return profile_out(row)


@app.put("/api/profiles/{profile_id}", response_model=ProfileOut)
async def profiles_update(profile_id: str, payload: ProfileData, db: AsyncSession = Depends(get_db)):
    row = await get_or_404(db, Profile, profile_id)
    row.name = payload.name
    row.data_json = payload.model_dump_json()
    await db.commit()
    await db.refresh(row)
    return profile_out(row)


@app.delete("/api/profiles/{profile_id}", status_code=204)
async def profiles_delete(profile_id: str, db: AsyncSession = Depends(get_db)):
    row = await get_or_404(db, Profile, profile_id)
    await db.delete(row)
    await db.commit()
    return Response(status_code=204)


@app.post("/api/profiles/intake", response_model=IntakeResponse)
async def profile_intake(payload: IntakeRequest, db: AsyncSession = Depends(get_db)):
    runtime = await get_runtime_settings(db)
    result = await asyncio.to_thread(
        ModelClient(runtime).json,
        intake_prompt(payload.description, payload.answers, runtime.prompts),
        IntakeResponse,
    )
    return result


async def _create_analysis(kind: str, payload: AnalysisCreate, db: AsyncSession) -> AnalysisOut:
    runtime = await get_runtime_settings(db)
    missing: list[str] = []
    if not runtime.apiKey:
        missing.append("API Key")
    if not runtime.model:
        missing.append("模型名称")
    if not runtime.douyinCookie:
        missing.append("抖音 Cookie")
    if missing:
        raise HTTPException(status_code=409, detail=f"请先在设置页配置：{'、'.join(missing)}")

    row = Analysis(
        kind=kind,
        source=payload.source.strip(),
        detail="任务已进入后台队列",
        prompt_version=settings.prompt_pack_version,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    try:
        function = "app.jobs.run_video_analysis" if kind == "video" else "app.jobs.run_account_analysis"
        row.job_id = enqueue(function, row.id, job_id=f"analysis-{row.id}", timeout=14400 if kind == "account" else 7200)
        await db.commit()
    except Exception as exc:
        row.status = "failed"
        row.error = f"任务队列不可用：{exc}"
        row.detail = "后台任务未启动"
        await db.commit()
    return analysis_out(row)


@app.post("/api/analyses/video", response_model=AnalysisOut)
async def analysis_video(payload: AnalysisCreate, db: AsyncSession = Depends(get_db)):
    return await _create_analysis("video", payload, db)


@app.post("/api/analyses/account", response_model=AnalysisOut)
async def analysis_account(payload: AnalysisCreate, db: AsyncSession = Depends(get_db)):
    return await _create_analysis("account", payload, db)


@app.get("/api/analyses", response_model=list[AnalysisOut])
async def analyses_list(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Analysis).where(Analysis.workspace_id == settings.local_workspace_id).order_by(Analysis.created_at.desc()))).scalars().all()
    return [analysis_out(row) for row in rows]


@app.get("/api/analyses/{analysis_id}", response_model=AnalysisOut)
async def analyses_get(analysis_id: str, db: AsyncSession = Depends(get_db)):
    return analysis_out(await get_or_404(db, Analysis, analysis_id))


@app.post("/api/analyses/{analysis_id}/retry", response_model=AnalysisOut)
async def analyses_retry(analysis_id: str, db: AsyncSession = Depends(get_db)):
    row = await get_or_404(db, Analysis, analysis_id)
    if row.status not in {"failed", "cancelled"}:
        raise HTTPException(status_code=409, detail="只有失败或已取消任务可以重试")
    row.status, row.progress, row.step, row.detail, row.error = "queued", 0, "queued", "任务已重新进入队列", None
    await db.commit()
    function = "app.jobs.run_video_analysis" if row.kind == "video" else "app.jobs.run_account_analysis"
    try:
        row.job_id = enqueue(function, row.id, job_id=f"analysis-{row.id}-retry-{int(datetime.utcnow().timestamp())}", timeout=14400 if row.kind == "account" else 7200)
    except Exception as exc:
        row.status = "failed"
        row.step = "failed"
        row.detail = "后台任务未启动，可以恢复服务后重试"
        row.error = f"任务队列不可用：{exc}"[:1000]
    await db.commit()
    return analysis_out(row)


@app.post("/api/analyses/{analysis_id}/cancel", response_model=AnalysisOut)
async def analyses_cancel(analysis_id: str, db: AsyncSession = Depends(get_db)):
    row = await get_or_404(db, Analysis, analysis_id)
    if row.job_id:
        try:
            Job.fetch(row.job_id, connection=connection()).cancel()
        except Exception:
            pass
    row.status, row.step, row.detail = "cancelled", "cancelled", "任务已取消"
    await db.commit()
    return analysis_out(row)


@app.delete("/api/analyses/{analysis_id}", status_code=204)
async def analyses_delete(analysis_id: str, db: AsyncSession = Depends(get_db)):
    await get_or_404(db, Analysis, analysis_id)
    topic_ids = (await db.execute(select(Topic.id).where(Topic.analysis_id == analysis_id))).scalars().all()
    if topic_ids:
        await db.execute(delete(Script).where(Script.topic_id.in_(topic_ids)))
    await db.execute(delete(Topic).where(Topic.analysis_id == analysis_id))
    await db.execute(delete(TopicBatch).where(TopicBatch.analysis_id == analysis_id))
    await db.execute(delete(AccountSample).where(AccountSample.analysis_id == analysis_id))
    await db.execute(delete(Analysis).where(Analysis.id == analysis_id))
    await db.commit()
    return Response(status_code=204)


@app.post("/api/analyses/{analysis_id}/topics", response_model=TopicBatchOut)
async def topics_generate(analysis_id: str, payload: TopicGenerateRequest, db: AsyncSession = Depends(get_db)):
    analysis = await get_or_404(db, Analysis, analysis_id)
    profile = await get_or_404(db, Profile, payload.profileId)
    if analysis.status != "completed" or not analysis.report_json:
        raise HTTPException(status_code=409, detail="拆解尚未完成")
    runtime = await get_runtime_settings(db)
    try:
        client = ModelClient(runtime)
        draft = await asyncio.to_thread(
            client.json,
            topics_prompt(analysis.kind, json.loads(analysis.report_json), profile.data(), runtime.prompts),
            TopicBatchModel,
            max_output_tokens=20000,
        )
        result = await factual_final(
            client,
            "对标选题",
            profile.data(),
            draft,
            TopicBatchModel,
            max_output_tokens=20000,
        )
    except ModelOutputError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    batch = TopicBatch(
        analysis_id=analysis_id, profile_id=profile.id, kind=analysis.kind,
        direction=result.direction, spread_summary=result.spreadSummary,
        prompt_version=settings.prompt_pack_version,
    )
    db.add(batch)
    await db.flush()
    rows: list[Topic] = []
    for index, item in enumerate(result.topics, start=1):
        row = Topic(batch_id=batch.id, analysis_id=analysis_id, profile_id=profile.id, position=index, data_json=item.model_dump_json())
        db.add(row)
        rows.append(row)
    await db.commit()
    for row in rows:
        await db.refresh(row)
    await db.refresh(batch)
    return topic_batch_out(batch, rows)


@app.get("/api/analyses/{analysis_id}/topics", response_model=TopicBatchOut | None)
async def topics_list(analysis_id: str, profileId: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(TopicBatch).where(TopicBatch.analysis_id == analysis_id)
    if profileId:
        query = query.where(TopicBatch.profile_id == profileId)
    batch = (await db.execute(query.order_by(TopicBatch.created_at.desc()).limit(1))).scalar_one_or_none()
    if batch is None:
        return None
    rows = (await db.execute(select(Topic).where(Topic.batch_id == batch.id).order_by(Topic.position))).scalars().all()
    return topic_batch_out(batch, rows)


@app.put("/api/topics/{topic_id}", response_model=TopicOut)
async def topics_update(topic_id: str, payload: TopicUpdate, db: AsyncSession = Depends(get_db)):
    row = await get_or_404(db, Topic, topic_id)
    row.data_json = payload.model_dump_json()
    await db.commit()
    await db.refresh(row)
    return topic_out(row)


@app.post("/api/scripts/batch", response_model=list[ScriptOut])
async def scripts_batch(payload: ScriptBatchRequest, db: AsyncSession = Depends(get_db)):
    topics = (await db.execute(select(Topic).where(Topic.id.in_(payload.topicIds)))).scalars().all()
    if len(topics) != len(payload.topicIds):
        raise HTTPException(status_code=404, detail="部分选题不存在")
    rows: list[Script] = []
    queued_rows: list[Script] = []
    for topic in topics:
        existing = (await db.execute(select(Script).where(Script.topic_id == topic.id))).scalar_one_or_none()
        if existing is not None:
            rows.append(existing)
            continue
        row = Script(topic_id=topic.id, status="queued", error=None, prompt_version=settings.prompt_pack_version)
        db.add(row)
        queued_rows.append(row)
        rows.append(row)
    await db.commit()
    for row in queued_rows:
        await db.refresh(row)
        try:
            row.job_id = enqueue("app.jobs.run_script_generation", row.id, job_id=f"script-{row.id}-{int(datetime.utcnow().timestamp())}", timeout=3600)
        except Exception as exc:
            row.status = "failed"
            row.error = f"任务队列不可用：{exc}"[:1000]
    await db.commit()
    return [script_out(row) for row in rows]


@app.get("/api/scripts", response_model=list[ScriptOut])
async def scripts_list(
    topicId: str | None = None,
    analysisId: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Script).where(Script.workspace_id == settings.local_workspace_id)
    if topicId:
        query = query.where(Script.topic_id == topicId)
    if analysisId:
        query = query.join(Topic, Script.topic_id == Topic.id).where(Topic.analysis_id == analysisId)
    rows = (await db.execute(query.order_by(Script.created_at.desc()))).scalars().all()
    return [script_out(row) for row in rows]


@app.post("/api/scripts/{script_id}/retry", response_model=ScriptOut)
async def scripts_retry(script_id: str, db: AsyncSession = Depends(get_db)):
    row = await get_or_404(db, Script, script_id)
    if row.status != "failed":
        raise HTTPException(status_code=409, detail="只有失败脚本可以重试")
    row.status, row.error = "queued", None
    await db.commit()
    try:
        row.job_id = enqueue("app.jobs.run_script_generation", row.id, job_id=f"script-{row.id}-retry-{int(datetime.utcnow().timestamp())}", timeout=3600)
    except Exception as exc:
        row.status = "failed"
        row.error = f"任务队列不可用：{exc}"[:1000]
    await db.commit()
    return script_out(row)


@app.post("/api/scripts/{script_id}/regenerate", response_model=ScriptOut)
async def scripts_regenerate(script_id: str, db: AsyncSession = Depends(get_db)):
    row = await get_or_404(db, Script, script_id)
    if row.status in {"queued", "running"}:
        raise HTTPException(status_code=409, detail="脚本正在生成，请完成后再重新生成")
    if not row.data_json:
        raise HTTPException(status_code=409, detail="当前脚本还没有可保留的版本，请先完成首次生成")
    row.status, row.error = "queued", None
    await db.commit()
    try:
        row.job_id = enqueue(
            "app.jobs.run_script_generation",
            row.id,
            job_id=f"script-{row.id}-regenerate-{int(datetime.utcnow().timestamp())}",
            timeout=3600,
        )
    except Exception as exc:
        row.status = "failed"
        row.error = f"任务队列不可用：{exc}"[:1000]
    await db.commit()
    return script_out(row)


@app.get("/api/scripts/{script_id}/versions", response_model=list[ScriptVersionOut])
async def scripts_versions(script_id: str, db: AsyncSession = Depends(get_db)):
    await get_or_404(db, Script, script_id)
    versions = (
        await db.execute(
            select(ScriptVersion)
            .where(ScriptVersion.script_id == script_id)
            .order_by(ScriptVersion.version.desc())
        )
    ).scalars().all()
    return [
        ScriptVersionOut(
            version=item.version,
            promptVersion=item.prompt_version,
            createdAt=item.created_at,
        )
        for item in versions
    ]


@app.post("/api/scripts/{script_id}/versions/{version}/activate", response_model=ScriptOut)
async def scripts_activate_version(script_id: str, version: int, db: AsyncSession = Depends(get_db)):
    row = await get_or_404(db, Script, script_id)
    saved = (
        await db.execute(
            select(ScriptVersion).where(
                ScriptVersion.script_id == script_id,
                ScriptVersion.version == version,
            )
        )
    ).scalar_one_or_none()
    if saved is None:
        raise HTTPException(status_code=404, detail="脚本历史版本不存在")
    row.data_json = saved.data_json
    row.active_version = saved.version
    row.prompt_version = saved.prompt_version
    row.error = None
    if row.status not in {"queued", "running"}:
        row.status = "completed"
    await db.commit()
    await db.refresh(row)
    return script_out(row)
