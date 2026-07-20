from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    # API Keys
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    elevenlabs_api_key: str = Field(default="", alias="ELEVENLABS_API_KEY")
    langchain_api_key: str = Field(default="", alias="LANGCHAIN_API_KEY")

    # LangSmith
    langchain_tracing_v2: bool = Field(default=False, alias="LANGCHAIN_TRACING_V2")
    langchain_project: str = Field(default="meditation-engine", alias="LANGCHAIN_PROJECT")

    # Storage
    storage_backend: str = Field(default="local", alias="STORAGE_BACKEND")
    media_dir: str = Field(default="./media", alias="MEDIA_DIR")
    assets_dir: str = Field(default="./assets", alias="ASSETS_DIR")

    # AWS S3
    aws_access_key_id: str = Field(default="", alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str = Field(default="", alias="AWS_SECRET_ACCESS_KEY")
    aws_region: str = Field(default="us-east-1", alias="AWS_REGION")
    aws_bucket_name: str = Field(default="", alias="AWS_S3_BUCKET")

    # Database
    database_url: str = Field(
        default="sqlite+aiosqlite:///./meditation.db",
        alias="DATABASE_URL",
    )

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    # Server
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    # TTS
    tts_primary: str = Field(default="edge_tts", alias="TTS_PRIMARY")
    tts_cache_ttl_days: int = Field(default=30, alias="TTS_CACHE_TTL_DAYS")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def media_path(self) -> Path:
        p = Path(self.media_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def assets_path(self) -> Path:
        return Path(self.assets_dir)


import os
from functools import lru_cache


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    if settings.langchain_api_key:
        os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
        os.environ["LANGCHAIN_TRACING_V2"] = "true" if settings.langchain_tracing_v2 else "false"
        os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project
    return settings
