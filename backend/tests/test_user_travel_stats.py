from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import pytest
from httpx import AsyncClient
from tests.conftest import signup_and_verify


@pytest.mark.asyncio
async def test_travel_stats_zero_trips_new_user(client: AsyncClient):
    """Test 1: New verified user with 0 trips gets totalTrips=0, moneySavedLei=0, minutesSaved=0, favoriteRoute=None, topRoutes=[]."""
    signup_data = await signup_and_verify(client, {
        "email": "zero.trips.user@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Traveler Zero"
    })
    token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/users/me/travel-stats", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["totalTrips"] == 0
    assert data["moneySavedLei"] == 0.0
    assert data["minutesSaved"] == 0
    assert data["totalDistanceKm"] == 0.0
    assert data["co2SavedKg"] == 0.0
    assert data["comparisonBaseline"] == "CAR"
    assert data["favoriteRoute"] is None
    assert data["topRoutes"] == []


@pytest.mark.asyncio
async def test_travel_stats_calculation_and_corridor_aggregation(client: AsyncClient):
    """
    Test 2: After creating bookings / saved routes (e.g. 2x Galati -> Bucuresti Nord and 1x Bucuresti Nord -> Brasov),
    GET /api/v1/users/me/travel-stats accurately computes moneySavedLei > 0 (vs car), minutesSaved >= 0,
    totalTrips == 3, and favoriteRoute = Galati -> Bucuresti Nord (tripCount == 2).
    """
    signup_data = await signup_and_verify(client, {
        "email": "frequent.traveler@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Elena Ionescu"
    })
    token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    future_base = datetime.now(ZoneInfo("Europe/Bucharest")).date() + timedelta(days=7)
    future_date_1 = future_base.isoformat()
    future_date_2 = (future_base + timedelta(days=1)).isoformat()
    future_date_3 = (future_base + timedelta(days=2)).isoformat()

    # Trip 1: Booking 1 - Galați -> București Nord
    booking_payload_1 = {
        "items": [
            {
                "journeyId": "tr-ir-1572-20261021",
                "selectedClass": "STANDARD",
                "travelDate": future_date_1,
                "seatPreferences": {"position": "WINDOW", "quietZone": False},
                "passengers": [{"fullName": "Elena Ionescu", "passengerType": "ADULT"}]
            }
        ],
        "contactEmail": "frequent.traveler@beeline.io",
        "contactPhone": "+40711111111"
    }
    b1_res = await client.post("/api/v1/bookings", json=booking_payload_1, headers=headers)
    assert b1_res.status_code == 201

    # Trip 2: Booking 2 - Galați -> București Nord (different date)
    booking_payload_2 = {
        "items": [
            {
                "journeyId": "tr-ir-1572-20261021",
                "selectedClass": "STANDARD",
                "travelDate": future_date_2,
                "seatPreferences": {"position": "WINDOW", "quietZone": False},
                "passengers": [{"fullName": "Elena Ionescu", "passengerType": "ADULT"}]
            }
        ],
        "contactEmail": "frequent.traveler@beeline.io",
        "contactPhone": "+40711111111"
    }
    b2_res = await client.post("/api/v1/bookings", json=booking_payload_2, headers=headers)
    assert b2_res.status_code == 201

    # Trip 3: Booking 3 - București Nord -> Brașov
    booking_payload_3 = {
        "items": [
            {
                "journeyId": "tr-ir-1631-20261021",
                "selectedClass": "STANDARD",
                "travelDate": future_date_3,
                "seatPreferences": {"position": "AISLE", "quietZone": False},
                "passengers": [{"fullName": "Elena Ionescu", "passengerType": "ADULT"}]
            }
        ],
        "contactEmail": "frequent.traveler@beeline.io",
        "contactPhone": "+40711111111"
    }
    b3_res = await client.post("/api/v1/bookings", json=booking_payload_3, headers=headers)
    assert b3_res.status_code == 201

    # Query travel stats
    stats_res = await client.get("/api/v1/users/me/travel-stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()

    assert stats["totalTrips"] == 3
    assert stats["moneySavedLei"] > 0.0
    assert stats["minutesSaved"] >= 0
    assert stats["totalDistanceKm"] > 300.0
    assert stats["co2SavedKg"] > 0.0
    assert stats["comparisonBaseline"] == "CAR"

    # Favorite route verification
    fav = stats["favoriteRoute"]
    assert fav is not None
    assert fav["origin"] == "Galați"
    assert fav["destination"] == "București Nord"
    assert fav["tripCount"] == 2
    assert fav["totalDistanceKm"] > 200.0
    assert fav["moneySavedLei"] > 0.0
    assert fav["minutesSaved"] >= 0
    assert fav["topOperator"] is not None

    # Top routes verification
    top = stats["topRoutes"]
    assert len(top) == 2
    assert top[0]["origin"] == "Galați"
    assert top[0]["destination"] == "București Nord"
    assert top[0]["tripCount"] == 2

    assert top[1]["origin"] == "București Nord"
    assert top[1]["destination"] == "Brașov"
    assert top[1]["tripCount"] == 1


@pytest.mark.asyncio
async def test_travel_stats_excludes_cancelled_bookings(client: AsyncClient):
    """Test 3: Cancelled bookings are excluded from stats."""
    signup_data = await signup_and_verify(client, {
        "email": "cancellation.tester@beeline.io",
        "password": "SecurePassword123!",
        "full_name": "Radu Mihai"
    })
    token = signup_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    future_date = (datetime.now(ZoneInfo("Europe/Bucharest")).date() + timedelta(days=7)).isoformat()

    # 1. Create booking
    b_payload = {
        "items": [
            {
                "journeyId": "tr-ir-1572-20261021",
                "selectedClass": "STANDARD",
                "travelDate": future_date,
                "seatPreferences": {"position": "WINDOW", "quietZone": False},
                "passengers": [{"fullName": "Radu Mihai", "passengerType": "ADULT"}]
            }
        ],
        "contactEmail": "cancellation.tester@beeline.io",
        "contactPhone": "+40722222222"
    }
    create_res = await client.post("/api/v1/bookings", json=b_payload, headers=headers)
    assert create_res.status_code == 201
    booking_id = create_res.json()["bookingId"]

    # Verify 1 trip present
    stats_before = await client.get("/api/v1/users/me/travel-stats", headers=headers)
    assert stats_before.json()["totalTrips"] == 1

    # 2. Cancel the booking
    cancel_res = await client.delete(f"/api/v1/bookings/{booking_id}", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # 3. Verify stats now reflect 0 trips
    stats_after = await client.get("/api/v1/users/me/travel-stats", headers=headers)
    assert stats_after.status_code == 200
    data = stats_after.json()
    assert data["totalTrips"] == 0
    assert data["moneySavedLei"] == 0.0
    assert data["minutesSaved"] == 0
    assert data["favoriteRoute"] is None
    assert data["topRoutes"] == []


@pytest.mark.asyncio
async def test_travel_stats_unauthenticated_returns_401(client: AsyncClient):
    """Test 4: Unauthenticated request to /api/v1/users/me/travel-stats returns 401."""
    res = await client.get("/api/v1/users/me/travel-stats")
    assert res.status_code == 401
