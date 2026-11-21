import json
import re
import smtplib
import ssl
from unittest.mock import MagicMock, patch

import pytest
import respx
import httpx
from httpx import ASGITransport, AsyncClient
from fastapi import FastAPI

from app.core.config import Settings, settings
from app.main import app
from app.services.email_service import EmailMessageRecord, email_service


# ==============================================================================
# TEST 1: Brevo SMTP Transport Mock & Mailpit Compatibility
# ==============================================================================

@pytest.mark.asyncio
async def test_brevo_smtp_transport_ports_and_mailpit(monkeypatch):
    """
    Test 1: Brevo SMTP transport mock verifies:
    - Port 587/2525: ehlo() -> starttls() -> ehlo() -> login(SMTP_USER, SMTP_PASSWORD) -> sendmail()
    - Port 465: smtplib.SMTP_SSL called with SSL context -> login() -> sendmail()
    - Port 1025: Unauthenticated Mailpit skips starttls() and login() cleanly.
    - Bare envelope address settings.SMTP_FROM_EMAIL passed to sendmail.
    """
    email_service.clear_outbox()
    record = EmailMessageRecord(
        to_email="traveler@example.com",
        subject="Train Departure Alert",
        html_body="<p>Your train departs at 10:00</p>",
        text_body="Your train departs at 10:00",
        template_name="departure_alert",
        context={}
    )

    # 1. Port 587 with credentials (Brevo SMTP standard)
    monkeypatch.setattr(settings, "EMAIL_MODE", "smtp")
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp-relay.brevo.com")
    monkeypatch.setattr(settings, "SMTP_PORT", 587)
    monkeypatch.setattr(settings, "SMTP_USER", "brevo-user-777")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "brevo-secret-pass")
    monkeypatch.setattr(settings, "SMTP_FROM_EMAIL", "noreply@beeline.local")
    monkeypatch.setattr(settings, "SMTP_FROM_NAME", "Beeline VoyageRail")
    monkeypatch.setattr(settings, "SMTP_USE_TLS", None)  # Auto-detect
    monkeypatch.setattr(settings, "SMTP_USE_SSL", False)

    mock_smtp_instance = MagicMock()
    mock_smtp_instance.__enter__.return_value = mock_smtp_instance

    with patch("smtplib.SMTP", return_value=mock_smtp_instance) as mock_smtp_cls:
        email_service._dispatch_smtp_sync(record)

        mock_smtp_cls.assert_called_once_with("smtp-relay.brevo.com", 587, timeout=12)
        # Verify ehlo() -> starttls() -> ehlo() -> login() -> sendmail() sequence
        assert mock_smtp_instance.ehlo.call_count >= 2
        mock_smtp_instance.starttls.assert_called_once()
        mock_smtp_instance.login.assert_called_once_with("brevo-user-777", "brevo-secret-pass")
        mock_smtp_instance.sendmail.assert_called_once()

        call_args = mock_smtp_instance.sendmail.call_args[0]
        assert call_args[0] == "noreply@beeline.local"
        assert call_args[1] == ["traveler@example.com"]
        assert "From: Beeline VoyageRail <noreply@beeline.local>" in call_args[2]

    # 2. Port 465 with SSL (Brevo SMTPS)
    monkeypatch.setattr(settings, "SMTP_PORT", 465)
    monkeypatch.setattr(settings, "SMTP_USE_SSL", False)  # Auto-detected by port 465

    mock_ssl_instance = MagicMock()
    mock_ssl_instance.__enter__.return_value = mock_ssl_instance

    with patch("smtplib.SMTP_SSL", return_value=mock_ssl_instance) as mock_ssl_cls:
        email_service._dispatch_smtp_sync(record)

        mock_ssl_cls.assert_called_once()
        args, kwargs = mock_ssl_cls.call_args
        assert args[0] == "smtp-relay.brevo.com"
        assert args[1] == 465
        assert isinstance(kwargs.get("context"), ssl.SSLContext)
        mock_ssl_instance.login.assert_called_once_with("brevo-user-777", "brevo-secret-pass")
        mock_ssl_instance.sendmail.assert_called_once()

    # 3. Port 1025 local Mailpit without credentials (unauthenticated)
    monkeypatch.setattr(settings, "SMTP_HOST", "localhost")
    monkeypatch.setattr(settings, "SMTP_PORT", 1025)
    monkeypatch.setattr(settings, "SMTP_USER", "")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "")
    monkeypatch.setattr(settings, "SMTP_USE_TLS", None)
    monkeypatch.setattr(settings, "SMTP_USE_SSL", False)

    mock_mailpit_instance = MagicMock()
    mock_mailpit_instance.__enter__.return_value = mock_mailpit_instance

    with patch("smtplib.SMTP", return_value=mock_mailpit_instance) as mock_mailpit_cls:
        email_service._dispatch_smtp_sync(record)

        mock_mailpit_cls.assert_called_once_with("localhost", 1025, timeout=12)
        mock_mailpit_instance.ehlo.assert_called_once()
        mock_mailpit_instance.starttls.assert_not_called()
        mock_mailpit_instance.login.assert_not_called()
        mock_mailpit_instance.sendmail.assert_called_once()


# ==============================================================================
# TEST 2: Brevo HTTP API Transport & Automatic Fallback on SMTP Failure
# ==============================================================================

@pytest.mark.asyncio
@respx.mock
async def test_brevo_http_api_and_smtp_fallback(monkeypatch):
    """
    Test 2: Brevo HTTP API mode and automatic fallback from failed SMTP to Brevo HTTP API:
    - Sends expected JSON payload with api-key header and Cozy Hive HTML + text content.
    - Automatic fallback triggers when EMAIL_MODE='smtp' fails with timeout/connection error.
    """
    email_service.clear_outbox()

    api_url = "https://api.brevo.com/v3/smtp/email"
    route = respx.post(api_url).mock(
        return_value=httpx.Response(201, json={"messageId": "<brevo-test-msg-1234@api.brevo.com>"})
    )

    # 1. Direct EMAIL_MODE="brevo_api" (and alias "brevo")
    monkeypatch.setattr(settings, "EMAIL_MODE", "brevo_api")
    monkeypatch.setattr(settings, "BREVO_API_KEY", "xkeysib-mock-production-key-999")
    monkeypatch.setattr(settings, "BREVO_API_URL", api_url)
    monkeypatch.setattr(settings, "SMTP_FROM_EMAIL", "noreply@beeline.local")
    monkeypatch.setattr(settings, "SMTP_FROM_NAME", "Beeline VoyageRail")

    res = await email_service.send_email(
        to_email="voyager@beeline.io",
        subject="Cozy Hive Welcome",
        html_body="<p>Welcome to The Cozy Hive</p>",
        text_body="Welcome to The Cozy Hive"
    )

    assert res.status_code if hasattr(res, "status_code") else res.status == "sent"
    assert route.called
    last_req = route.calls.last.request
    assert last_req.headers["api-key"] == "xkeysib-mock-production-key-999"
    assert last_req.headers["accept"] == "application/json"
    assert last_req.headers["content-type"] == "application/json"

    body = json.loads(last_req.content)
    assert body["sender"] == {"name": "Beeline VoyageRail", "email": "noreply@beeline.local"}
    assert body["to"] == [{"email": "voyager@beeline.io"}]
    assert body["subject"] == "Cozy Hive Welcome"
    assert body["htmlContent"] == "<p>Welcome to The Cozy Hive</p>"
    assert body["textContent"] == "Welcome to The Cozy Hive"

    # 2. Automatic Fallback: EMAIL_MODE="smtp" encountering port block / TimeoutError
    respx.reset()
    route_fallback = respx.post(api_url).mock(
        return_value=httpx.Response(201, json={"messageId": "<brevo-fallback-msg-5678@api.brevo.com>"})
    )

    monkeypatch.setattr(settings, "EMAIL_MODE", "smtp")
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp-relay.brevo.com")
    monkeypatch.setattr(settings, "SMTP_PORT", 587)
    monkeypatch.setattr(settings, "SMTP_USER", "smtp-user")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "smtp-pass")
    monkeypatch.setattr(settings, "BREVO_API_KEY", "xkeysib-fallback-key")

    with patch("smtplib.SMTP", side_effect=TimeoutError("Render Free SMTP egress blocked (port 587)")):
        fallback_res = await email_service.send_email(
            to_email="fallback.voyager@beeline.io",
            subject="Automatic Fallback Journey Alert",
            html_body="<p>Delay notice delivered via Brevo API fallback</p>",
            text_body="Delay notice delivered via Brevo API fallback"
        )

        assert fallback_res.status == "sent"
        assert fallback_res.error is None
        assert route_fallback.called
        req_fallback = route_fallback.calls.last.request
        fallback_body = json.loads(req_fallback.content)
        assert fallback_body["to"] == [{"email": "fallback.voyager@beeline.io"}]
        assert fallback_body["subject"] == "Automatic Fallback Journey Alert"


# ==============================================================================
# TEST 3: Bulletproof CORS Origins Parsing & Preview Regex Matching
# ==============================================================================

def test_cors_origins_and_regex_parsing():
    """
    Test 3: CORS_ORIGINS parsing succeeds for empty string, comma-separated URLs,
    and JSON array strings without raising SettingsError/JSONDecodeError, and
    CORS_ORIGIN_REGEX matches Vercel preview URLs while rejecting evil origins.
    """
    # 1. Empty string fallback
    s_empty = Settings(CORS_ORIGINS="")
    assert "http://localhost:3000" in s_empty.CORS_ORIGINS
    assert "http://127.0.0.1:3000" in s_empty.CORS_ORIGINS

    # 2. Whitespace fallback
    s_space = Settings(CORS_ORIGINS="   ")
    assert "http://localhost:3000" in s_space.CORS_ORIGINS

    # 3. Comma-separated string with trailing slashes and wildcard
    s_comma = Settings(CORS_ORIGINS="https://beeline.vercel.app/, http://localhost:3000, *")
    assert "https://beeline.vercel.app" in s_comma.CORS_ORIGINS
    assert "http://localhost:3000" in s_comma.CORS_ORIGINS
    assert "*" not in s_comma.CORS_ORIGINS
    # Trailing slashes stripped
    assert not any(origin.endswith("/") for origin in s_comma.CORS_ORIGINS)

    # 4. JSON array string
    s_json = Settings(CORS_ORIGINS='["https://beeline.vercel.app/", "http://localhost:3000"]')
    assert s_json.CORS_ORIGINS == ["https://beeline.vercel.app", "http://localhost:3000"]

    # 5. Empty CORS_ORIGIN_REGEX string becomes None
    s_regex_empty = Settings(CORS_ORIGIN_REGEX="")
    assert s_regex_empty.CORS_ORIGIN_REGEX is None

    # 6. Default Vercel regex verification
    pattern = Settings().CORS_ORIGIN_REGEX
    assert pattern is not None
    regex = re.compile(pattern)

    # Allowed Vercel origins
    assert regex.match("https://beeline.vercel.app")
    assert regex.match("https://beeline-git-main-abc.vercel.app")
    assert regex.match("https://beeline-preview-123.vercel.app")
    assert regex.match("https://beeline-stg-branch-456.vercel.app")

    # Rejected origins
    assert not regex.match("https://evil.com")
    assert not regex.match("https://other-project.vercel.app")
    assert not regex.match("http://beeline.vercel.app")  # Must be HTTPS
    assert not regex.match("https://beeline.vercel.app.evil.com")


# ==============================================================================
# TEST 4: Production Config Checks (Docs, Cookies, Postgres URL Normalization)
# ==============================================================================

@pytest.mark.asyncio
async def test_production_config_hardening():
    """
    Test 4: Production config checks:
    - docs_url, redoc_url, openapi_url disabled in production (enabled in dev)
    - cookie_secure is True and cookie_samesite is 'none' in production (False/lax in dev)
    - postgres:// and postgresql:// normalize to postgresql+asyncpg://
    """
    # 1. Dev defaults
    dev_settings = Settings(ENVIRONMENT="development")
    assert dev_settings.enable_api_docs is True
    assert dev_settings.cookie_secure is False
    assert dev_settings.cookie_samesite == "lax"
    assert dev_settings.auto_seed_db is True

    # 2. Production defaults
    prod_settings = Settings(ENVIRONMENT="production")
    assert prod_settings.enable_api_docs is False
    assert prod_settings.cookie_secure is True
    assert prod_settings.cookie_samesite == "none"
    assert prod_settings.auto_seed_db is False

    # 3. Explicit override preserves user intent
    custom_settings = Settings(
        ENVIRONMENT="production",
        ENABLE_API_DOCS=True,
        COOKIE_SECURE=False,
        COOKIE_SAMESITE="lax",
        AUTO_SEED_DB=True
    )
    assert custom_settings.enable_api_docs is True
    assert custom_settings.cookie_secure is False
    assert custom_settings.cookie_samesite == "lax"
    assert custom_settings.auto_seed_db is True

    # 4. Postgres URL Normalization
    pg1 = Settings(DATABASE_URL="postgres://beeline:pass@dpg-xxx-a.frankfurt-postgres.render.com/beeline_db")
    assert pg1.DATABASE_URL.startswith("postgresql+asyncpg://")
    assert pg1.SYNC_DATABASE_URL.startswith("postgresql://")

    pg2 = Settings(DATABASE_URL="postgresql://beeline:pass@localhost:5432/beeline_db")
    assert pg2.DATABASE_URL.startswith("postgresql+asyncpg://")
    assert pg2.SYNC_DATABASE_URL.startswith("postgresql://")

    sqlite = Settings(DATABASE_URL="sqlite+aiosqlite:///./test.db")
    assert sqlite.DATABASE_URL == "sqlite+aiosqlite:///./test.db"
    assert sqlite.SYNC_DATABASE_URL == "sqlite:///./test.db"

    # 5. Swagger routes disabled on production FastAPI instance
    prod_app = FastAPI(
        title=prod_settings.PROJECT_NAME,
        version=prod_settings.VERSION,
        openapi_url=f"{prod_settings.API_V1_STR}/openapi.json" if prod_settings.enable_api_docs else None,
        docs_url=f"{prod_settings.API_V1_STR}/docs" if prod_settings.enable_api_docs else None,
        redoc_url=f"{prod_settings.API_V1_STR}/redoc" if prod_settings.enable_api_docs else None,
    )
    async with AsyncClient(transport=ASGITransport(app=prod_app), base_url="http://test") as client:
        res_docs = await client.get("/api/v1/docs")
        assert res_docs.status_code == 404

        res_redoc = await client.get("/api/v1/redoc")
        assert res_redoc.status_code == 404

        res_openapi = await client.get("/api/v1/openapi.json")
        assert res_openapi.status_code == 404


# ==============================================================================
# TEST 5: HEAD / and GET /health Probes
# ==============================================================================

@pytest.mark.asyncio
async def test_head_root_and_health_probes():
    """
    Test 5: Verifies that HEAD / and GET /health return 200 OK cleanly
    (preventing 405 Method Not Allowed on Render/uptime monitors).
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. HEAD /
        res_head_root = await client.head("/")
        assert res_head_root.status_code == 200

        # 2. GET /
        res_get_root = await client.get("/")
        assert res_get_root.status_code == 200
        root_json = res_get_root.json()
        assert root_json["status"] == "healthy"

        # 3. GET /health
        res_health = await client.get("/health")
        assert res_health.status_code == 200
        assert res_health.json() == {"status": "ok"}

        # 4. HEAD /health
        res_head_health = await client.head("/health")
        assert res_head_health.status_code == 200

        # 5. GET /api/v1/health
        res_api_health = await client.get(f"{settings.API_V1_STR}/health")
        assert res_api_health.status_code == 200
        assert res_api_health.json() == {"status": "ok"}
