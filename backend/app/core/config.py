from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "Beeline VoyageRail API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security & JWT
    SECRET_KEY: str = "beeline-super-secret-key-development-vault-change-in-prod-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    MFA_TEMP_TOKEN_EXPIRE_MINUTES: int = 5
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60
    MFA_ISSUER_NAME: str = "Beeline VoyageRail"

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR}/beeline.db"

    @property
    def SYNC_DATABASE_URL(self) -> str:
        """Synchronous database URL for Alembic migrations and raw SQL CLI tools."""
        url = self.DATABASE_URL
        if "sqlite+aiosqlite://" in url:
            return url.replace("sqlite+aiosqlite://", "sqlite://")
        if "postgresql+asyncpg://" in url:
            return url.replace("postgresql+asyncpg://", "postgresql://")
        return url

    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:3000",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:19006",
        "http://127.0.0.1:3000",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
