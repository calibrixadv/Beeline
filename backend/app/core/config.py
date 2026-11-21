import json
from pathlib import Path
from typing import Annotated, Any, List, Optional
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "Beeline VoyageRail API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    
    # Security & JWT
    SECRET_KEY: str = "beeline-super-secret-key-development-vault-change-in-prod-32chars"
    JWT_SECRET_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    MFA_TEMP_TOKEN_EXPIRE_MINUTES: int = 5
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 15
    MFA_ISSUER_NAME: str = "Beeline VoyageRail"

    # Cross-Site Cookie Policy (Vercel <-> Render)
    COOKIE_SECURE: Optional[bool] = None
    COOKIE_SAMESITE: Optional[str] = None
    COOKIE_DOMAIN: Optional[str] = None

    # API Documentation in Production
    ENABLE_API_DOCS: Optional[bool] = None

    # Auth Rate Limiting
    AUTH_RATE_LIMIT_ENABLED: bool = True
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 60
    AUTH_RATE_LIMIT_MAX_REQUESTS: int = 30

    # Email & Brevo SMTP / API Engine
    EMAIL_MODE: str = "dev_sink"
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@beeline.local"
    SMTP_FROM_NAME: str = "Beeline VoyageRail"
    SMTP_USE_TLS: Optional[bool] = None
    SMTP_USE_SSL: bool = False
    SMTP_TIMEOUT_SECONDS: int = 12
    BREVO_API_KEY: str = ""
    BREVO_API_URL: str = "https://api.brevo.com/v3/smtp/email"
    EMAIL_RATE_LIMIT_PER_SEC: int = 500
    FRONTEND_URL: str = "http://localhost:3000"

    # Trip Departure & Delay Notifications
    TRIP_REMINDER_WINDOW_MINUTES: int = 60
    TRIP_NOTIFICATION_POLL_SECONDS: int = 60
    ENABLE_TRIP_NOTIFICATION_WORKER: bool = True

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR}/beeline.db"
    AUTO_SEED_DB: Optional[bool] = None

    # Redis & Online Feature Store
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_FEATURE_PREFIX: str = "feature:"
    REDIS_FEATURE_TTL_SECONDS: int = 86400
    FEATURE_SYNC_INTERVAL_SECONDS: int = 60
    ENABLE_ML_INFERENCE: bool = True
    ML_MODEL_PATH: str = str(BASE_DIR / "app" / "ml_models" / "risk_model.onnx")
    ML_METADATA_PATH: str = str(BASE_DIR / "app" / "ml_models" / "risk_model_metadata.json")

    # CORS Origins & Regex
    CORS_ORIGINS: Annotated[List[str], NoDecode] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ]
    ALLOWED_ORIGINS: Optional[str] = None
    CORS_ORIGIN_REGEX: Optional[str] = r"^https://beeline[a-z0-9-]*\.vercel\.app$"

    @property
    def SYNC_DATABASE_URL(self) -> str:
        """Synchronous database URL for Alembic migrations and raw SQL CLI tools."""
        url = self.DATABASE_URL
        if "sqlite+aiosqlite://" in url:
            return url.replace("sqlite+aiosqlite://", "sqlite://")
        if "postgresql+asyncpg://" in url:
            return url.replace("postgresql+asyncpg://", "postgresql://")
        return url

    @property
    def effective_smtp_use_tls(self) -> bool:
        """Auto-detects STARTTLS: True if SMTP_USER is set or port in (587, 2525), unless overridden."""
        if self.SMTP_USE_TLS is not None:
            return bool(self.SMTP_USE_TLS)
        if self.SMTP_USER or self.SMTP_PORT in (587, 2525):
            return True
        return False

    @property
    def effective_smtp_use_ssl(self) -> bool:
        """Auto-detects implicit SSL: True if SMTP_PORT is 465 or SMTP_USE_SSL is explicitly True."""
        if self.SMTP_USE_SSL:
            return True
        if self.SMTP_PORT == 465:
            return True
        return False

    @property
    def enable_api_docs(self) -> bool:
        """Disables Swagger/ReDoc/OpenAPI in production unless explicitly enabled."""
        if self.ENABLE_API_DOCS is not None:
            return bool(self.ENABLE_API_DOCS)
        return self.ENVIRONMENT.lower() != "production"

    @property
    def cookie_secure(self) -> bool:
        """Resolves cookie Secure attribute: True in production, False otherwise unless overridden."""
        if self.COOKIE_SECURE is not None:
            return bool(self.COOKIE_SECURE)
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cookie_samesite(self) -> str:
        """Resolves cookie SameSite attribute: 'none' in production, 'lax' otherwise unless overridden."""
        if self.COOKIE_SAMESITE and self.COOKIE_SAMESITE.strip():
            return self.COOKIE_SAMESITE.strip().lower()
        return "none" if self.ENVIRONMENT.lower() == "production" else "lax"

    @property
    def cookie_domain(self) -> Optional[str]:
        """Resolves cookie Domain attribute if explicitly configured."""
        if self.COOKIE_DOMAIN and self.COOKIE_DOMAIN.strip():
            return self.COOKIE_DOMAIN.strip()
        return None

    @property
    def auto_seed_db(self) -> bool:
        """Controls startup seeding: False in production (opt-in), True in dev/test unless overridden."""
        if self.AUTO_SEED_DB is not None:
            return bool(self.AUTO_SEED_DB)
        return self.ENVIRONMENT.lower() != "production"

    @model_validator(mode="before")
    @classmethod
    def handle_environment_aliases(cls, data):
        if isinstance(data, dict):
            jwt_key = data.get("JWT_SECRET_KEY")
            if jwt_key and not data.get("SECRET_KEY"):
                data["SECRET_KEY"] = jwt_key
            allowed = data.get("ALLOWED_ORIGINS")
            if allowed and not data.get("CORS_ORIGINS"):
                data["CORS_ORIGINS"] = allowed
        return data

    @field_validator("EMAIL_MODE", mode="before")
    @classmethod
    def normalize_email_mode(cls, v: Any) -> str:
        if isinstance(v, str):
            v_clean = v.strip().lower()
            if v_clean in ("brevo", "brevo_api", "brevo-api"):
                return "brevo_api"
            return v_clean
        return v

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: Any) -> str:
        if isinstance(v, str):
            v_clean = v.strip()
            if v_clean.startswith("postgres://"):
                return v_clean.replace("postgres://", "postgresql+asyncpg://", 1)
            if v_clean.startswith("postgresql://") and not v_clean.startswith("postgresql+"):
                return v_clean.replace("postgresql://", "postgresql+asyncpg://", 1)
            return v_clean
        return v

    @field_validator("CORS_ORIGIN_REGEX", mode="before")
    @classmethod
    def clean_cors_regex(cls, v: Any) -> Optional[str]:
        if isinstance(v, str):
            v_clean = v.strip()
            return v_clean if v_clean else None
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> List[str]:
        defaults = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "http://localhost:19006",
            "http://127.0.0.1:19006",
        ]
        if v is None:
            return defaults
        if isinstance(v, str):
            v_clean = v.strip()
            if not v_clean:
                return defaults
            if v_clean.startswith("[") and v_clean.endswith("]"):
                try:
                    items = json.loads(v_clean)
                except Exception:
                    items = [x.strip() for x in v_clean[1:-1].split(",") if x.strip()]
            else:
                items = [origin.strip() for origin in v_clean.split(",") if origin.strip()]
        elif isinstance(v, (list, tuple, set)):
            items = list(v)
        else:
            return defaults

        cleaned = []
        for origin in items:
            origin_str = str(origin).strip().rstrip("/")
            if origin_str and origin_str != "*":
                cleaned.append(origin_str)
        return cleaned if cleaned else defaults

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
