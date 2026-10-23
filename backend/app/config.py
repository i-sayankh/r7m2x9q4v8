from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    elexon_base_url: AnyHttpUrl = "https://data.elexon.co.uk/bmrs/api/v1"
    cache_ttl_seconds: int = Field(default=900, ge=0)
    elexon_timeout_seconds: float = Field(default=20, gt=0, le=120)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
