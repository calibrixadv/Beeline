import logging
from pathlib import Path
from typing import AsyncGenerator
from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import settings

logger = logging.getLogger(__name__)

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

if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

_custom_session_maker = None


def get_async_session_maker():
    if _custom_session_maker is not None:
        return _custom_session_maker
    return AsyncSessionLocal


def set_custom_session_maker(maker):
    global _custom_session_maker
    _custom_session_maker = maker

Base = declarative_base()


def get_sync_engine():
    """Returns a synchronous engine for migrations, seeding, and raw SQL queries."""
    sync_connect_args = {}
    if "sqlite" in settings.SYNC_DATABASE_URL:
        sync_connect_args = {"check_same_thread": False}
    sync_engine = create_engine(
        settings.SYNC_DATABASE_URL,
        echo=False,
        connect_args=sync_connect_args
    )
    if "sqlite" in settings.SYNC_DATABASE_URL:
        @event.listens_for(sync_engine, "connect")
        def set_sync_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    return sync_engine


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def apply_sql_script_sync(script_text: str) -> None:
    """Executes a multi-statement SQL script cleanly using the synchronous engine."""
    engine = get_sync_engine()
    if "sqlite" in settings.SYNC_DATABASE_URL:
        with engine.connect() as conn:
            raw = conn.connection.dbapi_connection
            raw.executescript(script_text)
    else:
        # PostgreSQL / psycopg2 / asyncpg
        current = []
        for line in script_text.splitlines():
            if line.strip().startswith("--"):
                continue
            current.append(line)
        full_sql = "\n".join(current)
        with engine.begin() as conn:
            for stmt in full_sql.split(";"):
                clean = stmt.strip()
                if clean:
                    try:
                        conn.execute(text(clean))
                    except Exception as e:
                        logger.debug(f"Statement execution note: {e}")


async def apply_sql_script(conn, script_text: str) -> None:
    """Async wrapper delegating to synchronous multi-statement script execution."""
    import asyncio
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, apply_sql_script_sync, script_text)


async def init_db() -> None:
    """Initializes tables and automatically applies seed fixtures if database is uninitialized."""
    # Ensure all models are registered in Base.metadata before creating tables
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Migrations / column checks for backward compatibility
        for table_name, col_def in [
            ("users", "username VARCHAR(255)"),
            ("users", "role VARCHAR(32) DEFAULT 'TRAVELER'"),
            ("users", "preferences TEXT DEFAULT '{}'"),
            ("users", "phone_number VARCHAR(32)"),
            ("users", "avatar_url VARCHAR(512)"),
            ("users", "account_status VARCHAR(32) DEFAULT 'ACTIVE'"),
            ("users", "frozen_at TIMESTAMP"),
            ("users", "deletion_scheduled_at TIMESTAMP"),
            ("users", "deletion_reminder_15d_sent BOOLEAN DEFAULT FALSE"),
            ("saved_routes", "notes VARCHAR(500)"),
            ("bookings", "passenger_count INTEGER DEFAULT 1"),
            ("bookings", "seat_preference VARCHAR(32) DEFAULT 'WINDOW'"),
            ("user_sessions", "device_fingerprint VARCHAR(128)"),
            ("user_sessions", "device_name VARCHAR(255)"),
            ("user_sessions", "user_agent VARCHAR(500)"),
            ("user_sessions", "remember_me BOOLEAN DEFAULT FALSE"),
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_def}"))
            except Exception:
                pass
        try:
            await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users(username)"))
        except Exception:
            pass
        try:
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_account_status ON users(account_status)"))
        except Exception:
            pass

        # Check if database is empty and requires fixtures
        backend_dir = Path(__file__).resolve().parent.parent.parent
        seed_sql_file = backend_dir / "seed.sql"

        try:
            res = await conn.execute(text("SELECT count(*) FROM users"))
            user_count = res.scalar() or 0
        except Exception:
            user_count = 0

        if user_count == 0 and seed_sql_file.exists():
            logger.info("Database empty on startup. Applying automatic fixtures from seed.sql...")
            seed_content = seed_sql_file.read_text(encoding="utf-8")
            await apply_sql_script(conn, seed_content)
            logger.info("Automatic fixtures applied successfully.")
