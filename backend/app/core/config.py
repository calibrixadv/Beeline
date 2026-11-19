from pathlib import Path
from typing import List
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
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 15
    MFA_ISSUER_NAME: str = "Beeline VoyageRail"

    # Auth Rate Limiting (Step 5)
    AUTH_RATE_LIMIT_ENABLED: bool = True
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 60
    AUTH_RATE_LIMIT_MAX_REQUESTS: int = 30

    # Email & SMTP Engine
    EMAIL_MODE: str = "dev_sink"
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@beeline.voyagerail.com"
    EMAIL_RATE_LIMIT_PER_SEC: int = 500
    FRONTEND_URL: str = "http://localhost:3000"

    # Trip Departure & Delay Notifications
    TRIP_REMINDER_WINDOW_MINUTES: int = 60
    TRIP_NOTIFICATION_POLL_SECONDS: int = 60
    ENABLE_TRIP_NOTIFICATION_WORKER: bool = True

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR}/beeline.db"

    # Redis & Online Feature Store
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_FEATURE_PREFIX: str = "feature:"
    REDIS_FEATURE_TTL_SECONDS: int = 86400
    FEATURE_SYNC_INTERVAL_SECONDS: int = 60
    ENABLE_ML_INFERENCE: bool = True
    ML_MODEL_PATH: str = str(BASE_DIR / "app" / "ml_models" / "risk_model.onnx")
    ML_METADATA_PATH: str = str(BASE_DIR / "app" / "ml_models" / "risk_model_metadata.json")

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
