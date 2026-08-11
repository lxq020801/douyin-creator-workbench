from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "视频对标工具 API"
    app_version: str = "0.4.0-dev"
    data_dir: Path = Path("./data")
    database_url: str = "sqlite+aiosqlite:///./data/reference.db"
    redis_url: str = "redis://redis:6379/0"
    queue_name: str = "reference-frame-external"
    cors_origins: str = "http://127.0.0.1:4191,http://localhost:4191"
    local_workspace_id: str = "local"
    temp_retention_hours: int = 24
    prompt_pack_version: str = "codex-topic-diversity-v1"
    session_cookie_name: str = "video_benchmark_session"
    session_days: int = 14
    secure_cookies: bool = False
    initial_admin_username: str = "admin"
    initial_admin_password: str = "123456"
    initial_admin_display_name: str = "管理员"

    @property
    def temp_dir(self) -> Path:
        return self.data_dir / "tmp"


settings = AppSettings()
