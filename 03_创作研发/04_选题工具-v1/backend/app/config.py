from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "视频对标工具 API"
    app_version: str = "0.3.0-dev"
    data_dir: Path = Path("./data")
    database_url: str = "sqlite+aiosqlite:///./data/reference.db"
    redis_url: str = "redis://redis:6379/0"
    queue_name: str = "reference-frame"
    cors_origins: str = "http://127.0.0.1:4178,http://localhost:4178"
    local_workspace_id: str = "local"
    temp_retention_hours: int = 24

    @property
    def temp_dir(self) -> Path:
        return self.data_dir / "tmp"


settings = AppSettings()
