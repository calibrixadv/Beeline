from typing import AsyncGenerator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

# In SQLite with aiosqlite, pool_pre_ping is beneficial; connect_args for check_same_thread
connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args=connect_args
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


def get_sync_engine():
    """Returns a synchronous engine for migrations, seeding, and raw SQL queries."""
    sync_connect_args = {}
    if "sqlite" in settings.SYNC_DATABASE_URL:
        sync_connect_args = {"check_same_thread": False}
    return create_engine(
        settings.SYNC_DATABASE_URL,
        echo=False,
        connect_args=sync_connect_args
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    # Ensure all models are registered in Base.metadata before creating tables
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

