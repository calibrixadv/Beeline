from datetime import datetime
from zoneinfo import ZoneInfo
from httpx import AsyncClient
import pytest

from app.schemas.route_plan import TransitMode
from app.services.station_catalog_service import (
    BUCHAREST_TZ,
    compute_next_monday_sync,
    current_iso_week,
    normalize_romanian_text,
    station_catalog_service,
)


def test_station_catalog_extraction_and_invariants():
    """
    Verifies that StationCatalogService extracts > 200 real commercial passenger
    stations from active XMLs with authentic Romanian names, zero duplicate codes,
    exact canonical non-colliding codes (Buzău -> BUZ, Întorsura Buzăului -> IBZ),
    and rail-only modes (TRAIN).
    """
    stations, meta = station_catalog_service.get_catalog_and_meta()

    assert len(stations) > 200
    assert meta.totalStations == len(stations)

    # Check for no duplicate station codes
    station_codes = [s.code for s in stations]
    assert len(station_codes) == len(set(station_codes)), "Found duplicate station codes in catalog!"

    # Verify key commercial stations exist
    code_map = {s.code: s for s in stations}
    assert "GLT" in code_map
    assert code_map["GLT"].name == "Galați"
    assert code_map["GLT"].modes == [TransitMode.TRAIN]

    assert "BCT" in code_map
    assert code_map["BCT"].name == "București Nord"
    assert code_map["BCT"].dailyTrainCount > 100

    assert "BSV" in code_map
    assert "Brașov" in code_map["BSV"].name

    assert "BUZ" in code_map
    assert code_map["BUZ"].name == "Buzău"

    assert "IBZ" in code_map
    assert code_map["IBZ"].name == "Întorsura Buzăului"

    assert "BBS" in code_map
    assert code_map["BBS"].name == "Barboși"

    assert "FAU" in code_map
    assert code_map["FAU"].name == "Făurei"

    assert "PLS" in code_map
    assert "Ploiești" in code_map["PLS"].name

    # Non-colliding contract: Buzău and Întorsura Buzăului have distinct codes
    assert code_map["BUZ"].code != code_map["IBZ"].code


def test_weekly_scheduling_math_edge_cases():
    """
    Verifies compute_next_monday_sync() correctly computes the upcoming Monday
    00:05 Europe/Bucharest across all key edge cases.
    """
    # 1. Sunday night (2026-11-22 23:30) -> Monday morning 2026-11-23 00:05
    sun_night = datetime(2026, 11, 22, 23, 30, tzinfo=BUCHAREST_TZ)
    sync_sun = compute_next_monday_sync(sun_night)
    assert sync_sun == "2026-11-23T00:05:00+02:00"

    # 2. Monday early morning before sync (2026-11-23 00:01) -> today at 00:05
    mon_early = datetime(2026, 11, 23, 0, 1, tzinfo=BUCHAREST_TZ)
    sync_mon_early = compute_next_monday_sync(mon_early)
    assert sync_mon_early == "2026-11-23T00:05:00+02:00"

    # 3. Monday morning after sync (2026-11-23 00:10) -> next week's Monday (2026-11-30 00:05)
    mon_late = datetime(2026, 11, 23, 0, 10, tzinfo=BUCHAREST_TZ)
    sync_mon_late = compute_next_monday_sync(mon_late)
    assert sync_mon_late == "2026-11-30T00:05:00+02:00"

    # 4. Thursday midday (2026-11-19 12:00) -> upcoming Monday (2026-11-23 00:05)
    thu_mid = datetime(2026, 11, 19, 12, 0, tzinfo=BUCHAREST_TZ)
    sync_thu = compute_next_monday_sync(thu_mid)
    assert sync_thu == "2026-11-23T00:05:00+02:00"


@pytest.mark.asyncio
async def test_sync_weekly_stations_iso_week_transition():
    """
    Verifies that sync_weekly_stations() detects stale ISO week, skips redundant work
    when current, and refreshes when forced.
    """
    # Simulate an outdated ISO week in service state
    station_catalog_service._meta.isoWeek = "2026-W46"

    # Running sync should detect current week != 2026-W46 and perform refresh
    meta_refreshed = await station_catalog_service.sync_weekly_stations(force=False)
    assert meta_refreshed.isoWeek == current_iso_week()
    assert meta_refreshed.totalStations > 200

    # Running again without force should skip redundant rebuild
    last_synced = meta_refreshed.lastSyncedAt
    meta_cached = await station_catalog_service.sync_weekly_stations(force=False)
    assert meta_cached.lastSyncedAt == last_synced

    # Running with force=True should force a refresh
    meta_forced = await station_catalog_service.sync_weekly_stations(force=True)
    assert meta_forced.totalStations > 200


@pytest.mark.asyncio
async def test_api_stations_search_diacritic_ranking(client: AsyncClient):
    """
    Tests GET /api/v1/stations/search with diacritic-insensitive ranking and empty query.
    """
    # 1. 'galati' without diacritics -> Galați #1
    resp = await client.get("/api/v1/stations/search?query=galati&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["stations"]) >= 1
    assert data["stations"][0]["code"] == "GLT"
    assert data["stations"][0]["name"] == "Galați"
    assert data["weeklySync"] is not None
    assert data["weeklySync"]["totalStations"] > 200

    # 2. 'bucuresti' without diacritics -> București Nord #1
    resp = await client.get("/api/v1/stations/search?query=bucuresti&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["stations"][0]["code"] == "BCT"
    assert data["stations"][0]["name"] == "București Nord"

    # 3. 'intorsura' -> Întorsura Buzăului (IBZ)
    resp = await client.get("/api/v1/stations/search?query=intorsura&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    codes = [s["code"] for s in data["stations"]]
    assert "IBZ" in codes
    ibz = next(s for s in data["stations"] if s["code"] == "IBZ")
    assert ibz["name"] == "Întorsura Buzăului"

    # 4. 'ploiesti' -> Ploiești Sud and Ploiești Vest
    resp = await client.get("/api/v1/stations/search?query=ploiesti&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    codes = [s["code"] for s in data["stations"]]
    assert "PLS" in codes or "PLV" in codes

    # 5. Empty query -> returns top popular hubs sorted by dailyTrainCount desc
    resp = await client.get("/api/v1/stations/search?query=&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["stations"]) == 5
    # Verify sorted descending by dailyTrainCount
    counts = [s["dailyTrainCount"] for s in data["stations"]]
    assert counts == sorted(counts, reverse=True)


@pytest.mark.asyncio
async def test_api_stations_autocomplete_catalog_and_sync_weekly(client: AsyncClient):
    """
    Tests GET /api/v1/stations/autocomplete-catalog and POST /api/v1/stations/sync-weekly.
    """
    # 1. Autocomplete catalog
    resp = await client.get("/api/v1/stations/autocomplete-catalog")
    assert resp.status_code == 200
    data = resp.json()
    assert "stations" in data
    assert "weeklySync" in data
    assert len(data["stations"]) > 200
    assert data["weeklySync"]["schedule"] == "WEEKLY_MONDAY_00_05_RO"
    assert "T00:05:00" in data["weeklySync"]["nextWeeklySyncAt"]

    # 2. Trigger weekly sync endpoint
    sync_resp = await client.post("/api/v1/stations/sync-weekly")
    assert sync_resp.status_code == 200
    sync_data = sync_resp.json()
    assert sync_data["totalStations"] > 200
    assert sync_data["isoWeek"] == current_iso_week()
    assert "nextWeeklySyncAt" in sync_data
