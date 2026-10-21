import asyncio
import json
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, text
from app.core.config import settings
from app.core.database import AsyncSessionLocal, init_db, get_sync_engine
from app.core.security import hash_password, hash_token
from app.models.user import User, MFACredential, UserSession
from app.models.route import SavedRoute


async def seed_users():
    """Initializes and seeds the SQL database with default users and data."""
    print(f"Connecting to database at: {settings.DATABASE_URL}")
    await init_db()
    print("Database tables initialized successfully.")

    async with AsyncSessionLocal() as session:
        # 1. Traveler User
        result = await session.execute(select(User).where(User.email == "traveler@beeline.io"))
        traveler = result.scalar_one_or_none()
        if not traveler:
            traveler = User(
                id="usr-seed-traveler-001",
                email="traveler@beeline.io",
                hashed_password=hash_password("Password123!"),
                full_name="Andrei Popescu",
                is_guest=False,
                is_active=True,
                mfa_enabled=False
            )
            session.add(traveler)
            print("Created seed user: traveler@beeline.io (Password: Password123!)")
        else:
            print("Seed user traveler@beeline.io already exists.")

        # 2. Admin User with MFA
        result = await session.execute(select(User).where(User.email == "admin@beeline.io"))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                id="usr-seed-admin-002",
                email="admin@beeline.io",
                hashed_password=hash_password("AdminPass123!"),
                full_name="System Administrator",
                is_guest=False,
                is_active=True,
                mfa_enabled=True
            )
            session.add(admin)
            await session.flush()

            # Add MFA Credential
            mfa_cred = MFACredential(
                id="mfa-seed-admin-001",
                user_id=admin.id,
                secret_key="JBSWY3DPEHPK3PXP",
                backup_codes_hash=json.dumps([hash_token("EMERG-RECOV-1")]),
                is_confirmed=True
            )
            session.add(mfa_cred)
            print("Created seed user: admin@beeline.io (Password: AdminPass123! with TOTP MFA)")
        else:
            print("Seed user admin@beeline.io already exists.")

        # 3. Guest User with pre-saved route
        result = await session.execute(select(User).where(User.id == "usr-seed-guest-003"))
        guest = result.scalar_one_or_none()
        if not guest:
            guest = User(
                id="usr-seed-guest-003",
                email=None,
                hashed_password=None,
                full_name="Guest Explorer",
                is_guest=True,
                is_active=True,
                mfa_enabled=False
            )
            session.add(guest)
            await session.flush()

            route = SavedRoute(
                id="route-seed-micro19-unirii-001",
                user_id=guest.id,
                origin_name="Micro 19",
                destination_name="Piața Unirii",
                plan_data=json.dumps({
                    "id": "itinerary-gl-micro19-buc-piata-unirii-001",
                    "summary": "Transurb Bus 102 ➔ CFR IR 1572 ➔ Metrorex M2",
                    "departureTime": "2026-10-21T06:40:00+03:00",
                    "arrivalTime": "2026-10-21T11:15:00+03:00",
                    "totalDurationMinutes": 275,
                    "totalWalkMinutes": 12,
                    "totalWalkDistanceMeters": 680,
                    "transfersCount": 2,
                    "curatedPillar": "MOST_RELIABLE"
                })
            )
            session.add(route)
            print("Created seed guest: usr-seed-guest-003 with saved route 'Micro 19 ➔ Piața Unirii'")

        await session.commit()

        # Print statistics
        user_count = (await session.execute(select(text("count(*)")).select_from(User))).scalar()
        print(f"Total users in database: {user_count}")


if __name__ == "__main__":
    asyncio.run(seed_users())
