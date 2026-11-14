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
    ScrapedTrainingSample,
    TargetLabels,
    TrainApiFeatures,
    WeatherApiFeatures,
)
from scraper.collectors.calendar_generator import CalendarGenerator
from scraper.collectors.infrastructure_registry import InfrastructureRegistry
from scraper.collectors.train_api import TrainApiCollector
from scraper.collectors.weather_api import WeatherApiCollector
from scraper.pipeline import TransitScraperPipeline


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


def test_pipeline_end_to_end_assembly(tmp_path):
    pipeline = TransitScraperPipeline(weather_timeout=1.0)

    raw_train = {
        "train_number": "IR 1634",
        "operator": "CFR",
        "train_category": 2,
        "origin_station_code": "BSV",
        "destination_station_code": "BCT",
        "scheduled_duration_minutes": 150.0,
        "distance_km": 166.0,
        "stop_count": 4,
        "delay_at_origin_minutes": 5,
        "has_transfer": 1,
        "transfer_buffer_minutes": 25.0,
    }

    custom_weather = {
        "temp_celsius": -2.5,
        "precipitation_rate_mm_h": 1.2,
        "is_thunderstorm": 0,
        "wind_speed_kmh": 25.0,
        "wind_gust_kmh": 40.0,
        "snow_depth_cm": 8.0,
        "freezing_rain_risk": 0,
        "visibility_meters": 4000.0,
    }

    dep_dt = datetime(2026, 1, 15, 7, 30, tzinfo=timezone.utc)

    # Actual delay of 35 mins should trigger missed connection (35 > 25 - 5)
    sample: ScrapedTrainingSample = pipeline.process_sample(
        raw_train_data=raw_train,
        departure_dt=dep_dt,
        custom_weather=custom_weather,
        actual_delay_minutes=35.0,
    )

    assert sample.source_train_api.train_number == "IR 1634"
    assert sample.source_weather_api.temp_celsius == -2.5
    assert sample.source_weather_api.snow_depth_cm == 8.0
    assert sample.source_calendar_generator.season == 3  # Winter
    assert sample.source_calendar_generator.is_peak_hour == 1  # 07:30
    assert sample.source_infrastructure_registry.mountain_pass_flag == 1  # Brașov-București
    assert sample.target_labels.actual_delay_minutes == 35.0
    assert sample.target_labels.missed_connection == 1

    # Check 18-element ONNX feature vector conversion
    vec18 = sample.to_18_feature_vector()
    assert len(vec18) == 18
    assert vec18[0] == 2.0  # train_category (IR = 2)
    assert vec18[2] == 150.0  # duration
    assert vec18[5] == 7.0  # departure_hour
    assert vec18[6] == 1.0  # is_peak_hour

    # Test CSV export
    csv_path = tmp_path / "training.csv"
    pipeline.export_to_csv([sample], csv_path)
    assert csv_path.exists()
    content = csv_path.read_text(encoding="utf-8")
    assert "train_number" in content
    assert "temp_celsius" in content
    assert "actual_delay_minutes" in content

    # Test JSON export
    json_path = tmp_path / "training.json"
    pipeline.export_to_json([sample], json_path)
    assert json_path.exists()
    json_content = json_path.read_text(encoding="utf-8")
    assert "IR 1634" in json_content
