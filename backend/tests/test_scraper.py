import sys
from datetime import datetime, timezone
from pathlib import Path
import pytest

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from scraper.models import (
    CalendarFeatures,
    InfrastructureFeatures,
    TrainApiFeatures,
    WeatherApiFeatures,
)
from scraper.collectors.calendar_generator import CalendarGenerator
from scraper.collectors.infrastructure_registry import InfrastructureRegistry
from scraper.collectors.train_api import TrainApiCollector
from scraper.collectors.weather_api import WeatherApiCollector


def test_train_api_collector_parsing():
    collector = TrainApiCollector()
    raw = {
        "train_number": "IR 1572",
        "operator": "CFR Călători",
        "category": "IR",
        "origin": "GLT",
        "destination": "BCT",
        "durationMinutes": 195.0,
        "distanceKm": 230.0,
        "stopsCount": 5,
        "originDelay": 3,
        "traction_type": "ELECTRIC",
        "has_transfer": 1,
        "transfer_buffer_minutes": 20.0,
    }
    features = collector.parse_raw(raw)
    assert features.train_number == "IR 1572"
    assert features.operator == "CFR"
    assert features.train_category == 2
    assert features.origin_station_code == "GLT"
    assert features.destination_station_code == "BCT"
    assert features.scheduled_duration_minutes == 195.0
    assert features.distance_km == 230.0
    assert features.stop_count == 5
    assert features.delay_at_origin_minutes == 3
    assert features.traction_type == 1
    assert features.has_transfer == 1
    assert features.transfer_buffer_minutes == 20.0


def test_calendar_generator_seasons_and_peaks():
    # Spring (April)
    spring_dt = datetime(2026, 4, 15, 8, 0, tzinfo=timezone.utc)
    features = CalendarGenerator.generate_from_datetime(spring_dt)
    assert features.season == 0  # Spring
    assert features.is_peak_hour == 1  # 08:00 is morning rush
    assert features.departure_hour == 8

    # Winter (December 1 - National Day)
    winter_dt = datetime(2026, 12, 1, 14, 0, tzinfo=timezone.utc)
    winter_feat = CalendarGenerator.generate_from_datetime(winter_dt)
    assert winter_feat.season == 3  # Winter
    assert winter_feat.is_peak_hour == 0
    assert winter_feat.is_holiday_window == 1  # Dec 1 is statutory holiday


def test_infrastructure_registry_topology():
    # Galați -> București (Known single-track on branch)
    infra_gl_buc = InfrastructureRegistry.get_infrastructure("GLT", "BCT", "Galați", "București")
    assert infra_gl_buc.is_single_track == 1
    assert infra_gl_buc.corridor_slug == "galati-bucuresti"

    # București -> Brașov (Known mountain pass Predeal)
    infra_buc_brasov = InfrastructureRegistry.get_infrastructure("BCT", "BSV", "București", "Brașov")
    assert infra_buc_brasov.mountain_pass_flag == 1
    assert infra_buc_brasov.is_single_track == 0


def test_weather_regional_hub_station_resolution():
    """
    Verifies that secondary and regional Romanian station codes resolve to their
    closest geographic canonical weather hubs instead of defaulting to Bucharest (BCT).
    """
    assert WeatherApiCollector.resolve_station_code("TIM") == "TIM"
    assert WeatherApiCollector.resolve_station_code("TMN") == "TIM"
    assert WeatherApiCollector.resolve_station_code("ARD") == "TIM"
    assert WeatherApiCollector.resolve_station_code("IAS") == "IAS"
    assert WeatherApiCollector.resolve_station_code("ISN") == "IAS"
    assert WeatherApiCollector.resolve_station_code("SCV") == "IAS"
    assert WeatherApiCollector.resolve_station_code("CRA") == "CRA"
    assert WeatherApiCollector.resolve_station_code("CRV") == "CRA"
    assert WeatherApiCollector.resolve_station_code("DRT") == "CRA"
    assert WeatherApiCollector.resolve_station_code("PLV") == "PLV"
    assert WeatherApiCollector.resolve_station_code("PLS") == "PLV"
    assert WeatherApiCollector.resolve_station_code("SNA") == "BSV"
    assert WeatherApiCollector.resolve_station_code("PRD") == "BSV"
    assert WeatherApiCollector.resolve_station_code("FAU") == "BRL"


@pytest.mark.asyncio
async def test_async_train_collector_offline_tier_1():
    collector = TrainApiCollector(offline=True, min_delay=0, max_delay=0)
    try:
        from scraper.collectors.train_api import ScrapeTier
        records = await collector.scrape_tier(tier=ScrapeTier.TIER_1_SMOKE, date_str="2026-11-14")
        assert len(records) == 5
        train_nums = [r.train_number for r in records]
        assert "IR 1572" in train_nums
        assert "R 7568" in train_nums
        for r in records:
            assert r.origin_station_code == "GLT"
            assert r.destination_station_code == "BCT"
    finally:
        await collector.close()
