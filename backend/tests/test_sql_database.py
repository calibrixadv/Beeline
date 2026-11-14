import sqlite3
import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_sync_engine
from app.models.user import User, UserSession, MFACredential, PasswordResetToken
from app.models.route import SavedRoute
from app.models.transit import Station, Train, Schedule, Disruption
from app.models.booking import Booking, Ticket, IdempotencyRecord


@pytest.mark.asyncio
async def test_sql_tables_exist(db_session: AsyncSession):
    """Verifies that all 12 SQL relational tables exist in the schema."""
    result = await db_session.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    )
    tables = [row[0] for row in result.fetchall()]
    assert "users" in tables
    assert "user_sessions" in tables
    assert "mfa_credentials" in tables
    assert "password_reset_tokens" in tables
    assert "stations" in tables
    assert "trains" in tables
    assert "schedules" in tables
    assert "disruptions" in tables
    assert "saved_routes" in tables
    assert "bookings" in tables
    assert "tickets" in tables
    assert "idempotency_records" in tables


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
    """Verifies that deleting a user cascades to all related child tables."""
    # Create user with all types of dependent child records
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
    mfa = MFACredential(
        id="mfa-cascade-1",
        user_id=user.id,
        secret_key="JBSWY3DPEHPK3PXP",
        backup_codes_hash="[]",
        is_confirmed=True
    )
    token = PasswordResetToken(
        id="tok-cascade-1",
        user_id=user.id,
        token_hash="reset123",
        expires_at=text("datetime('now', '+1 hour')")
    )
    route = SavedRoute(
        id="route-cascade-1",
        user_id=user.id,
        origin_name="Galați",
        destination_name="București",
        plan_data="{}"
    )
    booking = Booking(
        id="bkg-cascade-1",
        user_id=user.id,
        booking_reference="BEE-CASC-1",
        total_amount_lei=50.0,
        currency="RON",
        passenger_count=1
    )
    db_session.add_all([session, mfa, token, route, booking])
    await db_session.flush()

    ticket = Ticket(
        id="tkt-cascade-1",
        booking_id=booking.id,
        ticket_number="TKT-CASC-1",
        train_number="IR 1572",
        car_number="1",
        seat_number="12",
        class_type="STANDARD",
        passenger_name="Cascade User",
        qr_code_payload="https://beeline.io/t/1",
        departure_time="07:30",
        arrival_time="10:45",
        origin="Galați",
        destination="București"
    )
    idem = IdempotencyRecord(
        id="idem-cascade-1",
        user_id=user.id,
        idempotency_key="key-casc-1",
        request_hash="hash1",
        status="COMPLETED",
        expires_at=text("datetime('now', '+1 day')")
    )
    db_session.add_all([ticket, idem])
    await db_session.commit()

    # Verify all children exist
    for tbl in ["user_sessions", "mfa_credentials", "password_reset_tokens", "saved_routes", "bookings", "idempotency_records"]:
        cnt = (await db_session.execute(text(f"SELECT count(*) FROM {tbl} WHERE user_id = 'usr-cascade-1'"))).scalar()
        assert cnt == 1, f"Expected 1 record in {tbl}"
    tkt_cnt = (await db_session.execute(text("SELECT count(*) FROM tickets WHERE booking_id = 'bkg-cascade-1'"))).scalar()
    assert tkt_cnt == 1

    # Delete user
    await db_session.delete(user)
    await db_session.commit()

    # Verify all children were deleted via cascade
    for tbl in ["user_sessions", "mfa_credentials", "password_reset_tokens", "saved_routes", "bookings", "idempotency_records"]:
        cnt = (await db_session.execute(text(f"SELECT count(*) FROM {tbl} WHERE user_id = 'usr-cascade-1'"))).scalar()
        assert cnt == 0, f"Expected 0 records in {tbl} after cascading deletion"
    tkt_cnt_after = (await db_session.execute(text("SELECT count(*) FROM tickets WHERE booking_id = 'bkg-cascade-1'"))).scalar()
    assert tkt_cnt_after == 0, "Tickets must cascade delete when parent booking is deleted"


@pytest.mark.asyncio
async def test_sql_check_constraints_enforcement(db_session: AsyncSession):
    """Verifies that relational CHECK constraints are enforced by the database."""
    # 1. Station invalid latitude CHECK (must be between -90 and 90)
    with pytest.raises(IntegrityError):
        await db_session.execute(
            text(
                """
                INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active)
                VALUES ('BAD_LAT', 'Invalid Station', 'București', 150.0, 26.0, '["TRAIN"]', 1);
                """
            )
        )
        await db_session.commit()
    await db_session.rollback()

    # 2. Train invalid duration CHECK (duration_minutes > 0)
    # First insert valid stations for FK
    await db_session.execute(
        text(
            """
            INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active)
            VALUES ('ST_A', 'A', 'CityA', 44.0, 26.0, '["TRAIN"]', 1),
                   ('ST_B', 'B', 'CityB', 45.0, 27.0, '["TRAIN"]', 1);
            """
        )
    )
    await db_session.commit()

    with pytest.raises(IntegrityError):
        await db_session.execute(
            text(
                """
                INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, base_price_lei)
                VALUES ('trn-bad', 'IR BAD', 'CFR', 'CFR', 'ST_A', 'ST_B', datetime('now'), datetime('now'), 0, 50.0);
                """
            )
        )
        await db_session.commit()
    await db_session.rollback()

    # 3. User invalid role CHECK (must be TRAVELER, OPERATOR, or ADMIN)
    with pytest.raises(IntegrityError):
        await db_session.execute(
            text(
                """
                INSERT INTO users (id, email, username, role, is_guest, is_active, mfa_enabled)
                VALUES ('usr-bad-role', 'bad.role@beeline.io', 'bad_role', 'SUPER_GOD', 0, 1, 0);
                """
            )
        )
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_sql_foreign_key_restrict_station(db_session: AsyncSession):
    """Verifies that ON DELETE RESTRICT on stations prevents accidental cascading deletion."""
    # Insert stations
    await db_session.execute(
        text(
            """
            INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active)
            VALUES ('ST_ORIG', 'Gara Origine', 'Galați', 45.43, 28.05, '["TRAIN"]', 1),
                   ('ST_DEST', 'Gara Destinație', 'București', 44.44, 26.07, '["TRAIN"]', 1);
            """
        )
    )
    # Insert train referencing ST_ORIG
    await db_session.execute(
        text(
            """
            INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, base_price_lei)
            VALUES ('trn-fk-test', 'IR 9988', 'CFR', 'CFR', 'ST_ORIG', 'ST_DEST', datetime('now'), datetime('now'), 120, 'ON_TIME', 45.0);
            """
        )
    )
    await db_session.commit()

    # Attempting to delete ST_ORIG referenced by train must raise IntegrityError (FK constraint failed)
    with pytest.raises(IntegrityError):
        await db_session.execute(text("DELETE FROM stations WHERE code = 'ST_ORIG'"))
        await db_session.commit()
    await db_session.rollback()

    # Deleting train first allows station deletion
    await db_session.execute(text("DELETE FROM trains WHERE id = 'trn-fk-test'"))
    await db_session.commit()

    await db_session.execute(text("DELETE FROM stations WHERE code = 'ST_ORIG'"))
    await db_session.commit()

    res = await db_session.execute(text("SELECT code FROM stations WHERE code = 'ST_ORIG'"))
    assert res.fetchone() is None


def test_schema_and_seed_sql_files_execution():
    """Verifies that schema.sql and seed.sql execute cleanly from scratch on SQLite with foreign keys enforced."""
    from pathlib import Path
    from app.schemas.route_plan import TransitRoutePlan

    backend_dir = Path(__file__).resolve().parent.parent
    schema_path = backend_dir / "schema.sql"
    seed_path = backend_dir / "seed.sql"

    assert schema_path.exists(), "schema.sql must exist"
    assert seed_path.exists(), "seed.sql must exist"

    schema_sql = schema_path.read_text(encoding="utf-8")
    seed_sql = seed_path.read_text(encoding="utf-8")

    # Connect to fresh SQLite in-memory DB with foreign keys strictly enabled
    con = sqlite3.connect(":memory:")
    try:
        con.execute("PRAGMA foreign_keys = ON;")
        con.executescript(schema_sql)
        con.executescript(seed_sql)

        # Check all 12 tables exist and are populated
        expected_tables = [
            "users", "user_sessions", "mfa_credentials", "password_reset_tokens",
            "stations", "trains", "schedules", "disruptions",
            "saved_routes", "bookings", "tickets", "idempotency_records"
        ]
        for tbl in expected_tables:
            count = con.execute(f"SELECT count(*) FROM {tbl}").fetchone()[0]
            assert count > 0, f"Table {tbl} must have seeded records, got {count}"

        # Check specific seed users
        traveler = con.execute("SELECT email, role, is_guest FROM users WHERE email = 'traveler@beeline.io'").fetchone()
        assert traveler is not None
        assert traveler[0] == "traveler@beeline.io"
        assert traveler[1] == "TRAVELER"

        admin = con.execute("SELECT email, role, mfa_enabled FROM users WHERE email = 'admin@beeline.io'").fetchone()
        assert admin is not None
        assert admin[1] == "ADMIN"
        assert admin[2] == 1  # SQLite boolean is 1

        guest = con.execute("SELECT id, is_guest FROM users WHERE id = 'usr-seed-guest-003'").fetchone()
        assert guest is not None
        assert guest[1] == 1

        # Check all saved routes validate cleanly against TransitRoutePlan
        saved_route_rows = con.execute("SELECT id, plan_data FROM saved_routes").fetchall()
        assert len(saved_route_rows) == 5, f"Expected 5 saved routes, got {len(saved_route_rows)}"
        for route_id, plan_json in saved_route_rows:
            plan = TransitRoutePlan.model_validate_json(plan_json)
            assert len(plan.legs) >= 1
            assert plan.legs[0].coords.geometry.type == "LineString"

        # Check idempotency: running seed again does not fail
        con.executescript(seed_sql)
    finally:
        con.close()


@pytest.mark.asyncio
async def test_schema_and_seed_sql_files_postgres_execution():
    """Verifies that schema.sql and seed.sql execute cleanly on PostgreSQL 16 if available."""
    import asyncpg
    from pathlib import Path
    backend_dir = Path(__file__).resolve().parent.parent
    schema_sql = (backend_dir / "schema.sql").read_text(encoding="utf-8")
    seed_sql = (backend_dir / "seed.sql").read_text(encoding="utf-8")

    try:
        conn = await asyncpg.connect("postgresql://beeline:beeline_secret@localhost:5432/beeline_db", timeout=3)
    except Exception:
        pytest.skip("PostgreSQL container is not reachable on localhost:5432")

    db_name = "test_pytest_pg_verify"
    try:
        # Create isolated test database
        await conn.execute(f"DROP DATABASE IF EXISTS {db_name};")
        await conn.execute(f"CREATE DATABASE {db_name};")
    finally:
        await conn.close()

    conn_test = await asyncpg.connect(f"postgresql://beeline:beeline_secret@localhost:5432/{db_name}")
    try:
        # 1. Execute schema.sql
        await conn_test.execute(schema_sql)

        # 2. Execute seed.sql
        await conn_test.execute(seed_sql)

        # 3. Check idempotency: running seed.sql a second time executes cleanly
        await conn_test.execute(seed_sql)

        # 4. Verify all 12 tables exist and contain populated rows
        expected_tables = [
            "users", "user_sessions", "mfa_credentials", "password_reset_tokens",
            "stations", "trains", "schedules", "disruptions",
            "saved_routes", "bookings", "tickets", "idempotency_records"
        ]
        for tbl in expected_tables:
            count = await conn_test.fetchval(f"SELECT count(*) FROM {tbl};")
            assert count > 0, f"Table {tbl} must have seeded records on PostgreSQL, got {count}"
    finally:
        await conn_test.close()
        # Clean up temporary database
        conn_cleanup = await asyncpg.connect("postgresql://beeline:beeline_secret@localhost:5432/beeline_db")
        try:
            await conn_cleanup.execute(f"DROP DATABASE IF EXISTS {db_name};")
        finally:
            await conn_cleanup.close()


