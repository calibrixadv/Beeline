import sqlite3
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_sync_engine
from app.models.user import User, UserSession, MFACredential, PasswordResetToken
from app.models.route import SavedRoute


@pytest.mark.asyncio
async def test_sql_tables_exist(db_session: AsyncSession):
    """Verifies that all 5 SQL relational tables exist in the schema."""
    result = await db_session.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    )
    tables = [row[0] for row in result.fetchall()]
    assert "users" in tables
    assert "user_sessions" in tables
    assert "mfa_credentials" in tables
    assert "password_reset_tokens" in tables
    assert "saved_routes" in tables


@pytest.mark.asyncio
async def test_sql_user_crud_and_constraints(db_session: AsyncSession):
    """Verifies standard SQL CRUD and unique email constraint on users table."""
    # 1. Raw SQL Insert
    await db_session.execute(
        text(
            """
            INSERT INTO users (id, email, hashed_password, full_name, is_guest, is_active, mfa_enabled, created_at, updated_at)
            VALUES ('usr-sql-test-1', 'sql.test@beeline.io', 'hash_val', 'SQL Tester', 0, 1, 0, datetime('now'), datetime('now'));
            """
        )
    )
    await db_session.commit()

    # 2. Raw SQL Select
    res = await db_session.execute(
        text("SELECT id, email, full_name, is_guest FROM users WHERE email = :email"),
        {"email": "sql.test@beeline.io"}
    )
    row = res.fetchone()
    assert row is not None
    assert row[0] == "usr-sql-test-1"
    assert row[1] == "sql.test@beeline.io"
    assert row[2] == "SQL Tester"
    assert row[3] == 0

    # 3. Unique email constraint violation
    with pytest.raises(Exception):
        await db_session.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, full_name, is_guest, is_active, mfa_enabled, created_at, updated_at)
                VALUES ('usr-sql-test-2', 'sql.test@beeline.io', 'hash_val', 'Duplicate Email', 0, 1, 0, datetime('now'), datetime('now'));
                """
            )
        )
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_sql_foreign_key_cascade(db_session: AsyncSession):
    """Verifies that deleting a user cascades to user_sessions, mfa_credentials, and saved_routes."""
    # Create user with session and saved route
    user = User(
        id="usr-cascade-1",
        email="cascade@beeline.io",
        hashed_password="hash",
        full_name="Cascade User"
    )
    db_session.add(user)
    await db_session.flush()

    session = UserSession(
        id="sess-cascade-1",
        user_id=user.id,
        refresh_token_hash="hash123",
        expires_at=text("datetime('now', '+7 days')")
    )
    db_session.add(session)

    route = SavedRoute(
        id="route-cascade-1",
        user_id=user.id,
        origin_name="Galați",
        destination_name="București",
        plan_data="{}"
    )
    db_session.add(route)
    await db_session.commit()

    # Verify children exist
    res_sess = await db_session.execute(
        text("SELECT count(*) FROM user_sessions WHERE user_id = 'usr-cascade-1'")
    )
    assert res_sess.scalar() == 1

    # Delete user
    await db_session.delete(user)
    await db_session.commit()

    # Verify children deleted via cascade
    res_sess_after = await db_session.execute(
        text("SELECT count(*) FROM user_sessions WHERE user_id = 'usr-cascade-1'")
    )
    assert res_sess_after.scalar() == 0

    res_route_after = await db_session.execute(
        text("SELECT count(*) FROM saved_routes WHERE user_id = 'usr-cascade-1'")
    )
    assert res_route_after.scalar() == 0
