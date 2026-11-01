import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.booking import IdempotencyRecord
from app.services.idempotency_service import IdempotencyService
from datetime import datetime, timezone, timedelta


from app.schemas.booking import CreateBookingRequest


@pytest.mark.asyncio
async def test_in_flight_concurrent_conflict(client: AsyncClient, db_session: AsyncSession):
    # 1. Signup user
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "concurrency.traveler@beeline.io",
        "password": "SecurePassword123!"
    })
    token = signup_res.json()["access_token"]
    user_id = signup_res.json()["user"]["id"]
    key = "book:v1:usr-concurrent:order-1234:2026-10-21"

    booking_payload = {
        "items": [
            {
                "journeyId": "tr-ir-1572-20261021",
                "selectedClass": "STANDARD",
                "travelDate": "2026-10-21",
                "passengers": [{"fullName": "Ion Popa", "passengerType": "ADULT"}]
            }
        ],
        "contactEmail": "concurrency.traveler@beeline.io"
    }
    model_obj = CreateBookingRequest.model_validate(booking_payload)
    payload_hash = IdempotencyService.compute_hash(model_obj.model_dump())

    # 2. Simulate an in-flight operation by inserting an IN_PROGRESS claim in db_session
    in_progress_claim = IdempotencyRecord(
        user_id=user_id,
        idempotency_key=key,
        request_hash=payload_hash,
        status="IN_PROGRESS",
        response_code=0,
        response_payload="",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db_session.add(in_progress_claim)
    await db_session.commit()

    # 3. Concurrent request arrives while first is IN_PROGRESS: must return 409 Conflict
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": key
    }
    resp = await client.post("/api/v1/bookings", json=booking_payload, headers=headers)
    assert resp.status_code == 409
    data = resp.json()
    assert "error" in data
    assert data["error"]["code"] == "CONFLICT"
    assert "in-flight" in data["error"]["message"].lower()

    # 4. Once the operation transitions to COMPLETED:
    in_progress_claim.status = "COMPLETED"
    in_progress_claim.response_code = 201
    in_progress_claim.response_payload = '{"bookingId": "bkg-cached-123", "bookingReference": "BEE-9999", "status": "CONFIRMED", "createdAt": "2026-10-21T10:00:00Z", "totalAmountLei": 62.5, "currency": "RON", "tickets": []}'
    await db_session.commit()

    # 5. Subsequent retry returns cached 201 response immediately
    retry_resp = await client.post("/api/v1/bookings", json=booking_payload, headers=headers)
    assert retry_resp.status_code == 201
    assert retry_resp.json()["bookingId"] == "bkg-cached-123"
    assert retry_resp.json()["bookingReference"] == "BEE-9999"


@pytest.mark.asyncio
async def test_error_releases_in_flight_claim(client: AsyncClient):
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "rollback.traveler@beeline.io",
        "password": "SecurePassword123!"
    })
    token = signup_res.json()["access_token"]
    key = "book:v1:usr-fail:order-failed-item:2026-10-21"
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": key
    }

    # Payload with empty passengers triggers 400 Bad Request during create_booking
    failing_payload = {
        "items": [
            {
                "journeyId": "tr-ir-1572-20261021",
                "selectedClass": "STANDARD",
                "travelDate": "2026-10-21",
                "passengers": []  # empty passengers causes error
            }
        ],
        "contactEmail": "rollback.traveler@beeline.io"
    }

    # First attempt fails with 400
    res1 = await client.post("/api/v1/bookings", json=failing_payload, headers=headers)
    assert res1.status_code == 400

    # The IN_PROGRESS record must have been cleaned up by release_key_on_error!
    # A subsequent corrected request with the same key should NOT be blocked by 409
    corrected_payload = {
        "items": [
            {
                "journeyId": "tr-ir-1572-20261021",
                "selectedClass": "STANDARD",
                "travelDate": "2026-10-21",
                "passengers": [{"fullName": "Elena Radu", "passengerType": "ADULT"}]
            }
        ],
        "contactEmail": "rollback.traveler@beeline.io"
    }
    res2 = await client.post("/api/v1/bookings", json=corrected_payload, headers=headers)
    assert res2.status_code == 201
    assert res2.json()["bookingReference"].startswith("BEE-")
