import pytest
from httpx import ASGITransport, AsyncClient
from fastapi import FastAPI
from app.core.config import settings
from app.main import app, lifespan


@pytest.mark.asyncio
async def test_swagger_available_in_development():
    """Verifies that in development environment, Swagger UI and OpenAPI json are active."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_docs = await client.get(f"{settings.API_V1_STR}/docs")
        assert res_docs.status_code == 200, f"Expected 200 for docs in dev, got {res_docs.status_code}"

        res_openapi = await client.get(f"{settings.API_V1_STR}/openapi.json")
        assert res_openapi.status_code == 200, f"Expected 200 for openapi in dev, got {res_openapi.status_code}"


@pytest.mark.asyncio
async def test_swagger_unavailable_in_production(monkeypatch):
    """Verifies that in production environment (Render deploy), Swagger UI, Redoc, and OpenAPI json are completely unavailable (HTTP 404)."""
    # Simulate ENVIRONMENT=production
    prod_app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=None,
        docs_url=None,
        redoc_url=None,
    )

    async with AsyncClient(transport=ASGITransport(app=prod_app), base_url="http://test") as client:
        res_docs = await client.get(f"{settings.API_V1_STR}/docs")
        assert res_docs.status_code == 404

        res_redoc = await client.get(f"{settings.API_V1_STR}/redoc")
        assert res_redoc.status_code == 404

        res_openapi = await client.get(f"{settings.API_V1_STR}/openapi.json")
        assert res_openapi.status_code == 404
