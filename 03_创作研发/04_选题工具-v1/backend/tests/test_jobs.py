import asyncio
from pathlib import Path

import pytest

import app.jobs as jobs
from app.media.scripts.analyzer import AnalyzeResult
from app.schemas import RuntimeSettingsIn


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
