from __future__ import annotations

import asyncio
import json
import shutil
import tempfile
from pathlib import Path
from typing import Any, TypeVar

from openai import OpenAI
from pydantic import BaseModel, ValidationError
from sqlalchemy import delete, func, select

from .config import settings as app_settings
from .db import AccountSample, Analysis, Profile, Script, ScriptVersion, SessionLocal, Topic, TopicBatch
from .factual_guard import factual_final
from .media.douyin import download_account_video, download_single, fetch_account, fetch_single
from .media.scripts.analyzer import AnalyzeResult, analyze_video
from .model_client import ModelClient, parse_json_text
from .prompts import account_summary_prompt, script_prompt, topics_prompt, video_breakdown_prompt
from .sampling import balanced_sample
from .schemas import AccountReportModel, DirectorScript, RuntimeSettingsIn, TopicBatchModel, VideoBreakdownModel
from .settings_service import get_runtime_settings

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class AnalysisCancelled(RuntimeError):
    pass


async def _update_analysis(analysis_id: str, **patch: Any) -> None:
    async with SessionLocal() as session:
        row = await session.get(Analysis, analysis_id)
        if row is None:
            return
        if row.status == "cancelled" and patch.get("status") != "cancelled":
            return
        for key, value in patch.items():
            setattr(row, key, value)
        await session.commit()


async def _ensure_analysis_active(analysis_id: str) -> None:
    async with SessionLocal() as session:
        row = await session.get(Analysis, analysis_id)
        if row is None or row.status == "cancelled":
            raise AnalysisCancelled("任务已取消")


async def _settings() -> RuntimeSettingsIn:
    async with SessionLocal() as session:
        return await get_runtime_settings(session)


def _validated_video_output(text: str, runtime: RuntimeSettingsIn) -> VideoBreakdownModel:
    try:
        return VideoBreakdownModel.model_validate(parse_json_text(text))
    except (ValidationError, ValueError, TypeError) as exc:
        schema_json = json.dumps(VideoBreakdownModel.model_json_schema(), ensure_ascii=False)
        return ModelClient(runtime).json(
            "修复下面的视频拆解输出。保留原有专业内容，只修复字段与格式，"
            "不要在没有视频的情况下重新分析。只返回JSON对象。\n"
            f"目标JSON Schema：\n{schema_json}\n校验错误：\n{exc}\n原输出：\n{text}",
            VideoBreakdownModel,
        )


async def _analyze_path(
    path: Path,
    prompt: str,
    runtime: RuntimeSettingsIn,
    source_id: str,
    progress=None,
) -> tuple[VideoBreakdownModel, AnalyzeResult]:
    result = await analyze_video(
        path,
        prompt,
        api_key=runtime.apiKey,
        endpoint=runtime.baseUrl,
        model=runtime.model,
        source_id=source_id,
        audit_id=source_id,
        video_fps=runtime.videoFps,
        file_active_timeout_sec=min(runtime.timeout, 600),
        response_timeout_sec=runtime.timeout,
        chunk_concurrency=min(2, runtime.maxConcurrent),
        on_progress=progress,
    )
    try:
        report = await asyncio.to_thread(_validated_video_output, result.text, runtime)
    except Exception:
        await asyncio.to_thread(_delete_remote_files, runtime, result)
        raise
    return report, result


def _delete_remote_files(runtime: RuntimeSettingsIn, result: AnalyzeResult) -> None:
    ids = {result.file_id} if result.file_id else set()
    for chunk in result.chunks:
        file_id = chunk.get("file_id")
        if file_id:
            ids.add(str(file_id))
    if not ids:
        return
    client = OpenAI(api_key=runtime.apiKey, base_url=runtime.baseUrl.rstrip("/"), timeout=60)
    for file_id in ids:
        try:
            client.files.delete(file_id)
        except Exception:
            pass


async def _run_video(analysis_id: str) -> None:
    runtime = await _settings()
    if not runtime.apiKey or not runtime.douyinCookie:
        raise RuntimeError("请先在设置页配置模型 API Key 和抖音 Cookie")
    async with SessionLocal() as session:
        analysis = await session.get(Analysis, analysis_id)
        if analysis is None:
            return
        source = analysis.source

    await _update_analysis(analysis_id, status="running", progress=5, step="resolve", detail="正在解析抖音链接", error=None)
    await _ensure_analysis_active(analysis_id)
    with tempfile.TemporaryDirectory(prefix=f"video-{analysis_id}-", dir=app_settings.temp_dir) as temp:
        root = Path(temp)
        meta, source_data = await fetch_single(source, runtime.douyinCookie, root)
        await _ensure_analysis_active(analysis_id)
        if meta.media_type != "video":
            raise RuntimeError("当前单条入口只支持抖音视频，图文会在账号分析中作为元数据参考")
        await _update_analysis(
            analysis_id,
            title=meta.title,
            metadata_json=json.dumps(source_data, ensure_ascii=False),
            progress=18,
            step="download",
            detail="正在下载无水印视频",
        )
        video_path = await download_single(meta, root / "media")
        await _ensure_analysis_active(analysis_id)

        async def on_progress(stage: str, _info: dict[str, Any]) -> None:
            mapping = {
                "probed_duration": (30, "probe", "视频完整性检查完成"),
                "uploading": (42, "upload", "正在上传视频到模型"),
                "uploaded": (52, "activate", "模型正在预处理视频"),
                "analyzing": (65, "analyze", "模型正在理解语言、画面和节奏"),
                "response_streaming": (78, "report", "正在整理结构化拆解报告"),
            }
            if stage in mapping:
                progress, step, detail = mapping[stage]
                await _update_analysis(analysis_id, progress=progress, step=step, detail=detail)

        prompt = video_breakdown_prompt(runtime.prompts)
        report, analysis_result = await _analyze_path(video_path, prompt, runtime, meta.aweme_id, on_progress)
        await asyncio.to_thread(_delete_remote_files, runtime, analysis_result)
        await _ensure_analysis_active(analysis_id)
        full_report = {**report.model_dump(by_alias=True), "source": source_data}
        await _update_analysis(
            analysis_id,
            status="completed",
            progress=100,
            step="completed",
            detail="拆解完成，可以生成对标选题",
            report_json=json.dumps(full_report, ensure_ascii=False),
            coverage_json=json.dumps({"collected": 1, "deepAnalyzed": 1, "failed": 0}, ensure_ascii=False),
            prompt_version=app_settings.prompt_pack_version,
        )


def run_video_analysis(analysis_id: str) -> None:
    try:
        asyncio.run(_run_video(analysis_id))
    except AnalysisCancelled:
        return
    except Exception as exc:
        asyncio.run(_update_analysis(
            analysis_id,
            status="failed",
            step="failed",
            detail="拆解失败，可以修复配置后重试",
            error=str(exc)[:1000],
        ))
        raise


async def _save_samples(analysis_id: str, items: list[dict[str, Any]], selected: list[tuple[dict[str, Any], str]]) -> None:
    roles = {str(item["video_id"]): role for item, role in selected}
    async with SessionLocal() as session:
        await session.execute(delete(AccountSample).where(AccountSample.analysis_id == analysis_id))
        for item in items:
            source_id = str(item["video_id"])
            session.add(AccountSample(
                analysis_id=analysis_id,
                source_id=source_id,
                source_json=json.dumps(item, ensure_ascii=False),
                selected=source_id in roles,
                sample_role=roles.get(source_id, "metadata"),
                status="queued" if source_id in roles else "metadata",
            ))
        await session.commit()


async def _analyze_account_sample(
    analysis_id: str,
    sample_id: str,
    item: dict[str, Any],
    runtime: RuntimeSettingsIn,
    semaphore: asyncio.Semaphore,
) -> bool:
    async with semaphore:
        await _ensure_analysis_active(analysis_id)
        async with SessionLocal() as session:
            sample = await session.get(AccountSample, sample_id)
            if sample:
                sample.status = "running"
                await session.commit()
        try:
            with tempfile.TemporaryDirectory(prefix=f"sample-{sample_id}-", dir=app_settings.temp_dir) as temp:
                path = await download_account_video(item, Path(temp))
                await _ensure_analysis_active(analysis_id)
                source_data = {
                    "id": item["video_id"], "url": item["url"], "title": item["title"],
                    "author": "", "duration": str(item.get("duration") or ""), "coverUrl": item.get("cover_url") or "",
                    "metrics": {
                        "views": item.get("view_count"), "likes": item.get("like_count"),
                        "comments": item.get("comment_count"), "shares": item.get("share_count"),
                        "collects": item.get("collect_count"), "publishedAt": item.get("published_at"),
                    },
                }
                prompt = video_breakdown_prompt(runtime.prompts)
                report, result = await _analyze_path(path, prompt, runtime, str(item["video_id"]))
                await asyncio.to_thread(_delete_remote_files, runtime, result)
                await _ensure_analysis_active(analysis_id)
                payload = {**report.model_dump(by_alias=True), "source": source_data}
            async with SessionLocal() as session:
                sample = await session.get(AccountSample, sample_id)
                if sample:
                    sample.status = "completed"
                    sample.report_json = json.dumps(payload, ensure_ascii=False)
                    await session.commit()
            return True
        except AnalysisCancelled:
            raise
        except Exception as exc:
            async with SessionLocal() as session:
                sample = await session.get(AccountSample, sample_id)
                if sample:
                    sample.status = "failed"
                    sample.error = str(exc)[:800]
                    await session.commit()
            return False


def _summary_inputs(reports: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{
        "sourceId": (report.get("source") or {}).get("id"),
        "breakoutJudgment": report.get("breakoutJudgment"),
        "viralSkeleton": report.get("viralSkeleton"),
        "openingHook": report.get("openingHook"),
        "copyRetention": report.get("copyRetention"),
        "audiovisual": report.get("audiovisual"),
        "replicableMethods": report.get("replicableMethods"),
    } for report in reports]


async def _run_account(analysis_id: str) -> None:
    runtime = await _settings()
    if not runtime.apiKey or not runtime.douyinCookie:
        raise RuntimeError("请先在设置页配置模型 API Key 和抖音 Cookie")
    async with SessionLocal() as session:
        analysis = await session.get(Analysis, analysis_id)
        if analysis is None:
            return
        source = analysis.source
    await _update_analysis(analysis_id, status="running", progress=3, step="account", detail="正在识别账号主页", error=None)
    await _ensure_analysis_active(analysis_id)
    profile, items = await fetch_account(source, runtime.douyinCookie, 50)
    await _ensure_analysis_active(analysis_id)
    selected = balanced_sample(items, 30)
    await _save_samples(analysis_id, items, selected)
    await _update_analysis(
        analysis_id,
        title=f"{profile['name']} · 账号研究",
        metadata_json=json.dumps({"account": profile, "items": items}, ensure_ascii=False),
        coverage_json=json.dumps({"collected": len(items), "selected": len(selected), "completed": 0, "failed": 0}, ensure_ascii=False),
        progress=15,
        step="sampling",
        detail=f"已采集 {len(items)} 条作品，准备深拆 {len(selected)} 条视频",
    )

    async with SessionLocal() as session:
        sample_rows = (await session.execute(
            select(AccountSample).where(AccountSample.analysis_id == analysis_id, AccountSample.selected.is_(True))
        )).scalars().all()
    by_source = {str(item["video_id"]): item for item, _ in selected}
    semaphore = asyncio.Semaphore(runtime.maxConcurrent)

    async def wrapped(index: int, sample: AccountSample) -> bool:
        result = await _analyze_account_sample(analysis_id, sample.id, by_source[sample.source_id], runtime, semaphore)
        async with SessionLocal() as session:
            rows = (await session.execute(select(AccountSample).where(AccountSample.analysis_id == analysis_id, AccountSample.selected.is_(True)))).scalars().all()
            completed = sum(row.status == "completed" for row in rows)
            failed = sum(row.status == "failed" for row in rows)
        progress = 15 + int(65 * (completed + failed) / max(1, len(sample_rows)))
        await _update_analysis(
            analysis_id,
            progress=progress,
            step="deep_analysis",
            detail=f"逐条深拆 {completed + failed}/{len(sample_rows)}，成功 {completed}，失败 {failed}",
            coverage_json=json.dumps({"collected": len(items), "selected": len(selected), "completed": completed, "failed": failed}, ensure_ascii=False),
        )
        return result

    await asyncio.gather(*(wrapped(index, row) for index, row in enumerate(sample_rows)))
    await _ensure_analysis_active(analysis_id)
    async with SessionLocal() as session:
        finished = (await session.execute(
            select(AccountSample).where(AccountSample.analysis_id == analysis_id, AccountSample.status == "completed")
        )).scalars().all()
        reports = [json.loads(row.report_json) for row in finished if row.report_json]
        failed_count = len(selected) - len(reports)
    if not reports:
        raise RuntimeError("账号作品均未能完成深拆，请检查 Cookie、网络和模型配置")

    await _update_analysis(analysis_id, progress=86, step="summary", detail="正在综合账号打法和样本边界")
    payload = {
        "account": profile,
        "coverage": {"collected": len(items), "deep_analyzed": len(reports), "failed": failed_count},
        "metadata": items,
        "deep_reports": _summary_inputs(reports),
    }
    report = await asyncio.to_thread(
        ModelClient(runtime).json,
        account_summary_prompt(payload, runtime.prompts),
        AccountReportModel,
        max_output_tokens=18000,
    )
    await _ensure_analysis_active(analysis_id)
    full_report = {**report.model_dump(by_alias=True), "account": profile}
    await _update_analysis(
        analysis_id,
        status="completed",
        progress=100,
        step="completed",
        detail="账号研究完成，可以生成对标选题",
        report_json=json.dumps(full_report, ensure_ascii=False),
        coverage_json=json.dumps({"collected": len(items), "selected": len(selected), "completed": len(reports), "failed": failed_count}, ensure_ascii=False),
        prompt_version=app_settings.prompt_pack_version,
    )


def run_account_analysis(analysis_id: str) -> None:
    try:
        asyncio.run(_run_account(analysis_id))
    except AnalysisCancelled:
        return
    except Exception as exc:
        asyncio.run(_update_analysis(
            analysis_id,
            status="failed",
            step="failed",
            detail="账号分析失败，可以修复配置后重试",
            error=str(exc)[:1000],
        ))
        raise


async def _run_script(script_id: str) -> None:
    runtime = await _settings()
    async with SessionLocal() as session:
        script = await session.get(Script, script_id)
        if script is None:
            return
        topic = await session.get(Topic, script.topic_id)
        if topic is None:
            raise RuntimeError("选题不存在")
        profile = await session.get(Profile, topic.profile_id)
        if profile is None:
            raise RuntimeError("账号资料不存在")
        script.status = "running"
        await session.commit()
        topic_data = json.loads(topic.data_json)
        profile_data = profile.data()
    prompt = script_prompt(topic_data, profile_data, runtime.prompts)
    draft = await asyncio.to_thread(ModelClient(runtime).json, prompt, DirectorScript, max_output_tokens=16000)
    result = await factual_final(
        ModelClient(runtime),
        "可拍脚本",
        profile_data,
        draft,
        DirectorScript,
        topic=topic_data,
        max_output_tokens=16000,
    )
    async with SessionLocal() as session:
        script = await session.get(Script, script_id)
        if script:
            data_json = result.model_dump_json(by_alias=True)
            last_version = (
                await session.execute(
                    select(func.max(ScriptVersion.version)).where(ScriptVersion.script_id == script.id)
                )
            ).scalar_one_or_none() or 0
            next_version = int(last_version) + 1
            session.add(ScriptVersion(
                script_id=script.id,
                version=next_version,
                data_json=data_json,
                prompt_version=app_settings.prompt_pack_version,
            ))
            script.status = "completed"
            script.data_json = data_json
            script.prompt_version = app_settings.prompt_pack_version
            script.active_version = next_version
            script.version_count = next_version
            script.error = None
            await session.commit()


async def _run_topic_generation(batch_id: str) -> None:
    try:
        async with SessionLocal() as session:
            batch = await session.get(TopicBatch, batch_id)
            if batch is None or batch.status == "completed":
                return
            batch.status = "running"
            batch.progress = 8
            batch.step = "load"
            batch.detail = "正在读取拆解结果和账号资料"
            batch.error = None
            await session.commit()
            analysis = await session.get(Analysis, batch.analysis_id)
            profile = await session.get(Profile, batch.profile_id)
            if analysis is None or profile is None or analysis.status != "completed" or not analysis.report_json:
                raise RuntimeError("拆解记录或账号资料不存在，无法生成选题")
            analysis_kind = analysis.kind
            report = json.loads(analysis.report_json)
            profile_data = profile.data()
        runtime = await _settings()
        client = ModelClient(runtime)
        async with SessionLocal() as session:
            batch = await session.get(TopicBatch, batch_id)
            if batch:
                batch.progress = 18
                batch.step = "draft"
                batch.detail = "模型正在生成 20 个对标选题"
                await session.commit()
        draft = await asyncio.to_thread(
            client.json,
            topics_prompt(analysis_kind, report, profile_data, runtime.prompts),
            TopicBatchModel,
            max_output_tokens=20000,
        )
        async with SessionLocal() as session:
            batch = await session.get(TopicBatch, batch_id)
            if batch:
                batch.progress = 58
                batch.step = "audit"
                batch.detail = "正在进行事实校验，避免生成资料中没有的内容"
                await session.commit()
        result = await factual_final(
            client,
            "对标选题",
            profile_data,
            draft,
            TopicBatchModel,
            max_output_tokens=20000,
        )
        async with SessionLocal() as session:
            batch = await session.get(TopicBatch, batch_id)
            if batch:
                batch.progress = 90
                batch.step = "save"
                batch.detail = "事实校验通过，正在保存 20 个选题"
                await session.commit()
        async with SessionLocal() as session:
            batch = await session.get(TopicBatch, batch_id)
            if batch is None:
                return
            await session.execute(delete(Topic).where(Topic.batch_id == batch.id))
            batch.direction = result.direction
            batch.spread_summary = result.spreadSummary
            batch.status = "completed"
            batch.progress = 100
            batch.step = "completed"
            batch.detail = "20 个对标选题已生成"
            batch.error = None
            batch.prompt_version = app_settings.prompt_pack_version
            for index, item in enumerate(result.topics, start=1):
                session.add(Topic(
                    workspace_id=batch.workspace_id,
                    batch_id=batch.id,
                    analysis_id=batch.analysis_id,
                    profile_id=batch.profile_id,
                    position=index,
                    data_json=item.model_dump_json(),
                ))
            await session.commit()
    except Exception as exc:
        async with SessionLocal() as session:
            batch = await session.get(TopicBatch, batch_id)
            if batch:
                batch.status = "failed"
                batch.progress = min(batch.progress or 0, 99)
                batch.step = "failed"
                batch.detail = "生成未完成，请查看原因后手动重试"
                batch.error = str(exc)[:1000]
                await session.commit()
        raise


def run_topic_generation(batch_id: str) -> None:
    asyncio.run(_run_topic_generation(batch_id))


def run_script_generation(script_id: str) -> None:
    try:
        asyncio.run(_run_script(script_id))
    except Exception as exc:
        async def fail() -> None:
            async with SessionLocal() as session:
                script = await session.get(Script, script_id)
                if script:
                    script.status = "failed"
                    script.error = str(exc)[:1000]
                    await session.commit()
        asyncio.run(fail())
        raise
