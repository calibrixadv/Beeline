import asyncio
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.rate_limit import auth_rate_limiter
from app.main import app

# Test SQLite in-memory database
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

@event.listens_for(test_engine.sync_engine, "connect")
def set_test_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def reset_rate_limits():
    await auth_rate_limiter.reset()
    try:
        from app.core.redis import get_redis
        redis = get_redis()
        bf_keys = await redis.keys("auth:*_bf*")
        if bf_keys:
            await redis.delete(*bf_keys)
        notif_keys = await redis.keys("beeline:notif:*")
        if notif_keys:
            await redis.delete(*notif_keys)
    except Exception:
        pass
    yield
    await auth_rate_limiter.reset()
    try:
        from app.core.redis import get_redis
        redis = get_redis()
        bf_keys = await redis.keys("auth:*_bf*")
        if bf_keys:
            await redis.delete(*bf_keys)
        notif_keys = await redis.keys("beeline:notif:*")
        if notif_keys:
            await redis.delete(*notif_keys)
        if bf_keys:
            await redis.delete(*bf_keys)
    except Exception:
        pass


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c

    app.dependency_overrides.clear()
