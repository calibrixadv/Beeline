import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_bookings(client: AsyncClient):
    # 1. Signup user
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "booking.tester@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Andrei Popescu"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Booking
    booking_payload = {
        "items": [
            {
                "journeyId": "tr-ir-1572-20261021",
                "selectedClass": "STANDARD",
                "travelDate": "2026-10-21",
                "seatPreferences": {
                    "position": "WINDOW",
                    "quietZone": False
                },
                "passengers": [
                    {
                        "fullName": "Andrei Popescu",
                        "passengerType": "ADULT",
                        "idNumber": "1900101000000"
                    }
                ]
            }
        ],
        "contactEmail": "booking.tester@beeline.io",
        "contactPhone": "+40700000000"
    }

    res = await client.post("/api/v1/bookings", json=booking_payload, headers=headers)
    assert res.status_code == 201
    booking_data = res.json()

    assert "bookingId" in booking_data
    assert booking_data["bookingReference"].startswith("BEE-")
    assert booking_data["status"] == "CONFIRMED"
    assert booking_data["totalAmountLei"] == 62.50
    assert booking_data["currency"] == "RON"
    assert len(booking_data["tickets"]) == 1

    ticket = booking_data["tickets"][0]
    assert ticket["trainNumber"] == "IR 1572"
    assert ticket["classType"] == "STANDARD"
    assert ticket["passengerName"] == "Andrei Popescu"
    assert ticket["origin"] == "Gara Galați"
    assert ticket["destination"] == "Gara de Nord"
    assert ticket["qrCodePayload"].startswith("https://beeline.io/t/")
    assert len(ticket["carNumber"]) >= 1
    assert len(ticket["seatNumber"]) >= 1

    booking_id = booking_data["bookingId"]

    # 3. List traveler bookings
    list_res = await client.get("/api/v1/bookings?page=1&pageSize=10", headers=headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert "data" in list_data
    assert "pagination" in list_data
    assert len(list_data["data"]) == 1
    assert list_data["data"][0]["bookingId"] == booking_id
    assert list_data["pagination"]["totalItems"] == 1

    # 4. Cancel Booking
    del_res = await client.delete(f"/api/v1/bookings/{booking_id}", headers=headers)
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["status"] == "CANCELLED"
    assert del_data["bookingId"] == booking_id

    # 5. Verify status updated in list
    list_res_2 = await client.get("/api/v1/bookings", headers=headers)
    assert list_res_2.json()["data"][0]["status"] == "CANCELLED"


@pytest.mark.asyncio
async def test_booking_idempotency_key_protocol(client: AsyncClient):
    # 1. Signup user
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "idempotent.traveler@beeline.io",
        "password": "SecurePassword123!"
    })
    token = signup_res.json()["access_token"]
    idempotency_key = "book:v1:usr-idem:trip-1572:2026-10-21"
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": idempotency_key
    }

    payload = {
        "items": [
            {
                "journeyId": "tr-ir-1572-20261021",
                "selectedClass": "FIRST",
                "travelDate": "2026-10-21",
                "passengers": [{"fullName": "Maria Ionescu", "passengerType": "ADULT"}]
            }
        ],
        "contactEmail": "idempotent.traveler@beeline.io"
    }

    # First request: creates booking
    res1 = await client.post("/api/v1/bookings", json=payload, headers=headers)
    assert res1.status_code == 201
    booking1 = res1.json()
    booking_id_1 = booking1["bookingId"]
    booking_ref_1 = booking1["bookingReference"]

    # Identical retry: returns cached response
    res2 = await client.post("/api/v1/bookings", json=payload, headers=headers)
    assert res2.status_code == 201
    booking2 = res2.json()
    assert booking2["bookingId"] == booking_id_1
    assert booking2["bookingReference"] == booking_ref_1

    # Mismatched retry: reusing key with different body -> 422 Unprocessable Entity
    mismatched_payload = {
        "items": [
            {
                "journeyId": "tr-ir-1572-20261021",
                "selectedClass": "STANDARD",  # modified class!
                "travelDate": "2026-10-21",
                "passengers": [{"fullName": "Different Person", "passengerType": "ADULT"}]
            }
        ],
        "contactEmail": "idempotent.traveler@beeline.io"
    }
    res3 = await client.post("/api/v1/bookings", json=mismatched_payload, headers=headers)
    assert res3.status_code == 422
    assert "payload mismatch" in res3.json()["detail"].lower()


@pytest.mark.asyncio
async def test_booking_validation_and_auth_errors(client: AsyncClient):
    # Unauthenticated
    res_unauth = await client.post("/api/v1/bookings", json={"items": []})
    assert res_unauth.status_code == 401

    # Signup
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": "validation.user@beeline.io",
        "password": "SecurePassword123!"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Empty items
    res_empty = await client.post("/api/v1/bookings", json={"items": [], "contactEmail": "val@beeline.io"}, headers=headers)
    assert res_empty.status_code == 400

    # Cancel non-existent booking
    res_del_404 = await client.delete("/api/v1/bookings/non-existent-bkg", headers=headers)
    assert res_del_404.status_code == 404
