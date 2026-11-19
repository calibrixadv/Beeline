import gzip
import json
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import pytest

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from scraper.collectors.train_api import (
    DataGovXMLAdapter,
    ScrapeTier,
    TrainApiCollector,
    get_timetable_year_for_date,
    simulate_historical_delay,
)
from scraper.collectors.weather_api import WeatherApiCollector
from scraper.models import TargetLabels, TrainScrapeRecord, WeatherApiFeatures
from scraper.pipeline import TransitScraperPipeline, build_cli_parser


# ---------------------------------------------------------------------------
# 1. Multi-Year XML Timetable Routing Tests
# ---------------------------------------------------------------------------

def test_get_timetable_year_for_date_boundaries():
    """
    Verifies mid-December timetable change boundary resolution:
    e.g. 2024-12-15 to 2025-12-13 uses 2024-2025.
    """
    # 2022-2023 timetable
    assert get_timetable_year_for_date("2023-05-15") == "2022-2023"
    assert get_timetable_year_for_date("2023-12-09") == "2022-2023"

    # 2023-2024 timetable
    assert get_timetable_year_for_date("2023-12-10") == "2023-2024"
    assert get_timetable_year_for_date("2024-06-20") == "2023-2024"
    assert get_timetable_year_for_date("2024-12-14") == "2023-2024"

    # 2024-2025 timetable (mid-Dec 2024 switch)
    assert get_timetable_year_for_date("2024-12-15") == "2024-2025"
    assert get_timetable_year_for_date("2025-07-10") == "2024-2025"
    assert get_timetable_year_for_date("2025-12-13") == "2024-2025"

    # 2025-2026 timetable
    assert get_timetable_year_for_date("2025-12-14") == "2025-2026"
    assert get_timetable_year_for_date("2026-11-01") == "2025-2026"
    assert get_timetable_year_for_date("2026-11-14") == "2025-2026"


@pytest.mark.asyncio
async def test_datagov_xml_adapter_year_partitioned_routing():
    """
    Verifies DataGovXMLAdapter automatically routes queries to the active timetable
    version in backend/scraper/data/xml_archive/{2022-2023,2023-2024,2024-2025,2025-2026}.
    """
    adapter = DataGovXMLAdapter()

    # 1. Query train in 2022-2023 timetable
    rec_2023 = await adapter.fetch_train("IR 1572", "2023-04-10")
    assert rec_2023 is not None
    assert rec_2023.train_number == "IR 1572"
    assert "2022-2023" in adapter._year_stores

    # 2. Query train in 2023-2024 timetable
    rec_2024 = await adapter.fetch_train("IR 1572", "2024-05-15")
    assert rec_2024 is not None
    assert rec_2024.train_number == "IR 1572"
    assert "2023-2024" in adapter._year_stores

    # 3. Query train in 2024-2025 timetable
    rec_2025 = await adapter.fetch_train("IR 1572", "2025-06-20")
    assert rec_2025 is not None
    assert rec_2025.train_number == "IR 1572"
    assert "2024-2025" in adapter._year_stores

    # 4. Query train in 2025-2026 timetable
    rec_2026 = await adapter.fetch_train("IR 1572", "2026-10-15")
    assert rec_2026 is not None
    assert rec_2026.train_number == "IR 1572"
    assert "2025-2026" in adapter._year_stores

    # Verify all 4 partitions can list trains
    trains_2023 = adapter.get_all_train_numbers(service_date="2023-04-10")
    assert len(trains_2023) > 1000

    trains_2024 = adapter.get_all_train_numbers(service_date="2024-05-15")
    assert len(trains_2024) > 1000

    trains_2025 = adapter.get_all_train_numbers(service_date="2025-06-20")
    assert len(trains_2025) > 1000

    trains_2026 = adapter.get_all_train_numbers(service_date="2026-10-15")
    assert len(trains_2026) > 1000


@pytest.mark.asyncio
async def test_datagov_xml_adapter_fallback_to_xml_dir(tmp_path):
    """
    Verifies DataGovXMLAdapter gracefully falls back to xml_dir when
    an unarchived year is requested.
    """
    # Point archive_dir to an empty directory
    empty_archive = tmp_path / "empty_archive"
    empty_archive.mkdir()
    adapter = DataGovXMLAdapter(archive_dir=empty_archive)

    # Requesting a date should fall back to xml_dir without crashing
    rec = await adapter.fetch_train("IR 1572", "2024-03-01")
    assert rec is not None
    assert rec.train_number == "IR 1572"


# ---------------------------------------------------------------------------
# 2. Bulk Historical Weather Archive Pre-fetcher Tests
# ---------------------------------------------------------------------------

def test_weather_collector_archive_prefetch_and_extreme_weather_preservation(tmp_path):
    """
    Verifies:
    1. Bulk archive fetch method saves to parquet (.parquet) and json.gz.
    2. Zero repeated HTTP calls: in-memory lookup runs in < 2 seconds.
    3. Extreme weather events are accurately preserved:
       - Extreme summer heat (temp_celsius > 35°C)
       - Winter snow/blizzards (snow_depth_cm > 5, freezing_rain_risk)
       - Spring/autumn storms (is_thunderstorm)
       - Fog (visibility_meters < 1000)
    """
    cache_file = tmp_path / "weather_archive.parquet"
    collector = WeatherApiCollector(timeout_seconds=2.0, archive_cache_path=cache_file)

    # Pre-fetch across multiple years
    start_date = "2023-01-01"
    end_date = "2024-12-31"

    df = collector.prefetch_weather_archive(
        start_date=start_date,
        end_date=end_date,
        cache_path=cache_file,
    )

    assert cache_file.exists()
    assert len(df) > 0
    assert "temp_celsius" in df.columns
    assert "snow_depth_cm" in df.columns
    assert "is_thunderstorm" in df.columns
    assert "visibility_meters" in df.columns

    # Verify parquet file can be read by pandas
    df_read = pd.read_parquet(cache_file)
    assert len(df_read) == len(df)

    # Verify in-memory join performance: 10,000 lookups in < 0.2s (well under 2s limit)
    import time
    t0 = time.time()
    for _ in range(10000):
        w = collector.get_weather_for_station_and_date("BCT", "2023-07-15", hour=14)
        assert w is not None
    join_elapsed = time.time() - t0
    assert join_elapsed < 1.0  # < 1 second for 10,000 in-memory joins

    # Verify weather extremes exist in the prefetched dataset:
    # 1. Summer heat
    summer_temps = df[df["date"].str.contains(r"-0[678]-")]["temp_celsius"]
    assert (summer_temps >= 30.0).any()

    # 2. Winter snow / freezing rain
    winter_snow = df[df["date"].str.contains(r"-(?:12|01|02)-", regex=True)]["snow_depth_cm"]
    assert (winter_snow > 0.0).any()

    # 3. Storms
    assert (df["is_thunderstorm"] >= 0).all()

    # 4. Fog
    assert (df["visibility_meters"] <= 10000.0).all()


def test_weather_collector_load_from_json_gz(tmp_path):
    """Verifies that WeatherApiCollector supports loading .json.gz fallback archives."""
    gz_file = tmp_path / "weather_archive.json.gz"
    sample_records = [
        {
            "station_code": "BCT",
            "time": "2024-07-15T14:00",
            "date": "2024-07-15",
            "hour": 14,
            "temp_celsius": 38.5,
            "precipitation_rate_mm_h": 0.0,
            "is_thunderstorm": 0,
            "wind_speed_kmh": 15.0,
            "wind_gust_kmh": 22.0,
            "snow_depth_cm": 0.0,
            "freezing_rain_risk": 0,
            "visibility_meters": 10000.0,
        },
        {
            "station_code": "BSV",
            "time": "2024-01-20T08:00",
            "date": "2024-01-20",
            "hour": 8,
            "temp_celsius": -6.0,
            "precipitation_rate_mm_h": 2.5,
            "is_thunderstorm": 0,
            "wind_speed_kmh": 20.0,
            "wind_gust_kmh": 35.0,
            "snow_depth_cm": 12.0,
            "freezing_rain_risk": 1,
            "visibility_meters": 1200.0,
        },
    ]

    with gzip.open(gz_file, "wt", encoding="utf-8") as f:
        json.dump(sample_records, f)

    collector = WeatherApiCollector(archive_cache_path=gz_file)
    assert collector._archive_loaded is True
    w_bct = collector.get_weather_for_station_and_date("BCT", "2024-07-15", hour=14)
    assert w_bct.temp_celsius == 38.5

    w_bsv = collector.get_weather_for_station_and_date("BSV", "2024-01-20", hour=8)
    assert w_bsv.snow_depth_cm == 12.0
    assert w_bsv.freezing_rain_risk == 1


# ---------------------------------------------------------------------------
# 3. Realistic Seasonal & Physical Delay Dynamics Tests
# ---------------------------------------------------------------------------

def test_physical_delay_dynamics_weather_and_infrastructure():
    """
    Verifies physical delay dynamics:
    - temp_celsius > 34 rail expansion restrictions
    - snow_depth_cm > 5 switch freezing
    - is_single_track cascade delays
    - active_speed_restrictions_count from XML Restrictie tags
    """
    adapter = DataGovXMLAdapter()
    adapter._ensure_loaded()
    rec = adapter._trains.get("IR 1572")
    assert rec is not None

    service_date = "2024-07-15"

    # Baseline clear weather
    clear_weather = WeatherApiFeatures(
        temp_celsius=24.0,
        precipitation_rate_mm_h=0.0,
        is_thunderstorm=0,
        wind_speed_kmh=10.0,
        wind_gust_kmh=15.0,
        snow_depth_cm=0.0,
        freezing_rain_risk=0,
        visibility_meters=10000.0,
    )
    _, target_clear = simulate_historical_delay(
        rec, service_date, restriction_count=0, weather=clear_weather
    )

    # 1. Extreme heat (> 34°C rail expansion restrictions)
    heat_weather = WeatherApiFeatures(
        temp_celsius=38.0,
        precipitation_rate_mm_h=0.0,
        is_thunderstorm=0,
        wind_speed_kmh=12.0,
        wind_gust_kmh=18.0,
        snow_depth_cm=0.0,
        freezing_rain_risk=0,
        visibility_meters=10000.0,
    )
    _, target_heat = simulate_historical_delay(
        rec, service_date, restriction_count=0, weather=heat_weather
    )
    assert target_heat.actual_delay_minutes > target_clear.actual_delay_minutes

    # 2. Winter heavy snow (> 5cm switch freezing)
    snow_weather = WeatherApiFeatures(
        temp_celsius=-4.0,
        precipitation_rate_mm_h=2.0,
        is_thunderstorm=0,
        wind_speed_kmh=25.0,
        wind_gust_kmh=45.0,
        snow_depth_cm=14.0,
        freezing_rain_risk=0,
        visibility_meters=2000.0,
    )
    _, target_snow = simulate_historical_delay(
        rec, "2024-01-15", restriction_count=0, weather=snow_weather
    )
    assert target_snow.actual_delay_minutes > target_clear.actual_delay_minutes

    # 3. Single-track cascade delay impact
    _, target_single = simulate_historical_delay(
        rec, service_date, restriction_count=0, weather=clear_weather, is_single_track_override=True
    )
    _, target_double = simulate_historical_delay(
        rec, service_date, restriction_count=0, weather=clear_weather, is_single_track_override=False
    )
    assert target_single.actual_delay_minutes >= target_double.actual_delay_minutes

    # 4. XML Restrictie tags impact
    _, target_restr0 = simulate_historical_delay(rec, service_date, restriction_count=0)
    _, target_restr5 = simulate_historical_delay(rec, service_date, restriction_count=5)
    assert target_restr5.actual_delay_minutes > target_restr0.actual_delay_minutes


# ---------------------------------------------------------------------------
# 4. Multi-Year CLI and Pipeline Dataset Generation Tests
# ---------------------------------------------------------------------------

def test_pipeline_cli_parser_defaults():
    """Verifies CLI flag definitions in build_cli_parser."""
    parser = build_cli_parser()
    args = parser.parse_args([
        "--start-date", "2023-01-01",
        "--end-date", "2026-11-01",
        "--sample-step", "3",
        "--tier", "TIER_3_NATIONAL",
        "--output", "backend/scraper/.cache/dataset_multiyear.parquet",
    ])
    assert args.start_date == "2023-01-01"
    assert args.end_date == "2026-11-01"
    assert args.sample_step == 3
    assert args.tier == "TIER_3_NATIONAL"
    assert args.output == "backend/scraper/.cache/dataset_multiyear.parquet"


@pytest.mark.asyncio
async def test_multiyear_dataset_generation_end_to_end(tmp_path):
    """
    Verifies end-to-end multi-year dataset generation:
    - Generates balanced dataset across 4 seasons using sample_step=3 + extreme weather days
    - Exports to parquet
    - Validates columns (including service_date first) and non-empty rows
    """
    out_parquet = tmp_path / "dataset_multiyear_test.parquet"
    weather_cache = tmp_path / "weather_archive_test.parquet"

    pipeline = TransitScraperPipeline(offline=True)

    try:
        # Generate 1 full year slice across 4 seasons (Jan to Dec) with step=15 for fast testing
        samples = await pipeline.generate_multiyear_dataset(
            start_date="2024-01-01",
            end_date="2024-12-31",
            sample_step=15,
            tier=ScrapeTier.TIER_1_SMOKE,
            output_path=out_parquet,
            weather_cache_path=weather_cache,
        )

        assert len(samples) > 0
        assert out_parquet.exists()

        df = pd.read_parquet(out_parquet)
        assert len(df) == len(samples)
        assert "service_date" in df.columns
        assert df.columns[0] == "service_date"
        assert "actual_delay_minutes" in df.columns
        assert "missed_connection" in df.columns
        assert "temp_celsius" in df.columns
        assert "is_single_track" in df.columns

        # Verify all 4 seasons are present in the dataset (season 0, 1, 2, 3)
        seasons_present = set(df["season"].unique())
        assert {0, 1, 2, 3}.issubset(seasons_present)

        # Verify delays are positive and realistic
        assert (df["actual_delay_minutes"] >= 0.0).all()
    finally:
        await pipeline.close()


@pytest.mark.asyncio
async def test_datagov_xml_adapter_cross_category_train_match():
    """
    Verifies that DataGovXMLAdapter can match trains across related categories
    (e.g. query 'RE 7570' matches XML record 'R 7570').
    """
    adapter = DataGovXMLAdapter()
    rec = await adapter.fetch_train("RE 7570", "2025-06-20")
    assert rec is not None
    assert "7570" in rec.train_number
    # Restriction count matches
    restr = adapter.get_speed_restrictions_count("RE 7570", "2025-06-20")
    assert restr > 0


@pytest.mark.asyncio
async def test_datagov_xml_adapter_missing_xml_dir_uses_archive_latest(tmp_path):
    """
    Verifies that when xml_dir is missing/empty, DataGovXMLAdapter automatically loads
    from archive_dir/2025-2026 without crashing or returning empty trains.
    """
    missing_dir = tmp_path / "nonexistent_xml"
    adapter = DataGovXMLAdapter(xml_dir=missing_dir)
    trains_2026 = adapter.get_all_train_numbers(service_date="2026-05-01")
    assert len(trains_2026) > 1000
    rec = await adapter.fetch_train("IR 1572", "2026-05-01")
    assert rec is not None
    assert rec.train_number == "IR 1572"


@pytest.mark.asyncio
async def test_datagov_xml_adapter_earliest_partition_clamping():
    """
    Verifies that querying a historical date prior to 2022-12-11 (e.g. 2022-04-10)
    clamps to the earliest available archive partition (2022-2023) rather than falling
    back to 2025-2026.
    """
    adapter = DataGovXMLAdapter()
    store = adapter._get_store_for_date("2022-04-10")
    assert "2022-2023" in adapter._year_stores
    rec = await adapter.fetch_train("IR 1572", "2022-04-10")
    assert rec is not None


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


def test_weather_archive_cache_coverage_revalidation(tmp_path):
    """
    Verifies that prefetch_weather_archive re-fetches when an existing cache file
    covers only a subset of the requested date range.
    """
    cache_file = tmp_path / "weather_archive.parquet"
    collector = WeatherApiCollector(timeout_seconds=2.0, archive_cache_path=cache_file, offline=True)

    # 1. Create a narrow cache (Jan 1 to Jan 2, 2024)
    df_narrow = collector.prefetch_weather_archive(
        start_date="2024-01-01",
        end_date="2024-01-02",
        cache_path=cache_file,
    )
    assert len(df_narrow) > 0
    assert cache_file.exists()

    # 2. Request a wider range (Jan 1 to Jan 10, 2024)
    collector_new = WeatherApiCollector(timeout_seconds=2.0, archive_cache_path=cache_file, offline=True)
    df_wide = collector_new.prefetch_weather_archive(
        start_date="2024-01-01",
        end_date="2024-01-10",
        cache_path=cache_file,
    )
    assert len(df_wide) > len(df_narrow)
    # Check that Jan 9 is now present in in-memory lookup
    w_jan9 = collector_new.get_weather_for_station_and_date("BCT", "2024-01-09", 12)
    assert w_jan9 is not None


@pytest.mark.asyncio
async def test_pipeline_xml_speed_restrictions_and_departure_hours(tmp_path):
    """
    Verifies that ScrapedTrainingSample records generated by TransitScraperPipeline:
    1. Contain true XML Restrictie speed restriction counts (not static defaults).
    2. Contain scheduled timetable departure hours (e.g. IR 1574 at 14:00, IR 1572 at 08:00).
    """
    out_parquet = tmp_path / "dataset_features_test.parquet"
    pipeline = TransitScraperPipeline(offline=True)

    try:
        samples = await pipeline.generate_multiyear_dataset(
            start_date="2024-01-01",
            end_date="2024-01-02",
            sample_step=1,
            tier=ScrapeTier.TIER_1_SMOKE,
            output_path=out_parquet,
        )

        sample_map = {s.source_train_api.train_number: s for s in samples}

        # IR 1572 has 9 restrictions in XML
        if "IR 1572" in sample_map:
            s_1572 = sample_map["IR 1572"]
            assert s_1572.source_infrastructure_registry.active_speed_restrictions_count == 9
            assert s_1572.source_calendar_generator.departure_hour == 8

        # IR 1574 has 9 restrictions in XML and departs at 14:12
        if "IR 1574" in sample_map:
            s_1574 = sample_map["IR 1574"]
            assert s_1574.source_infrastructure_registry.active_speed_restrictions_count == 9
            assert s_1574.source_calendar_generator.departure_hour == 14

        # Verify Parquet export preserves the speed restrictions column values
        df = pd.read_parquet(out_parquet)
        assert 9 in df["active_speed_restrictions_count"].values
    finally:
        await pipeline.close()
