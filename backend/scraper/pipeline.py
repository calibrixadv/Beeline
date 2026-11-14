import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from .collectors.calendar_generator import CalendarGenerator
from .collectors.infrastructure_registry import InfrastructureRegistry
from .collectors.train_api import TrainApiCollector
from .collectors.weather_api import WeatherApiCollector
from .models import (
    CalendarFeatures,
    InfrastructureFeatures,
    ScrapedTrainingSample,
    TargetLabels,
    TrainApiFeatures,
    WeatherApiFeatures,
)


class TransitScraperPipeline:
    """
    End-to-end scraper and dataset builder coordinating all 5 feature sources
    specified in freeze_contract.md.
    """

    def __init__(self, weather_timeout: float = 3.0):
        self.train_collector = TrainApiCollector()
        self.weather_collector = WeatherApiCollector(timeout_seconds=weather_timeout)
        self.calendar_generator = CalendarGenerator()
        self.infrastructure_registry = InfrastructureRegistry()

    def process_sample(
        self,
        raw_train_data: Dict[str, Any],
        departure_dt: Optional[datetime] = None,
        custom_weather: Optional[Dict[str, Any]] = None,
        actual_delay_minutes: Optional[float] = None,
    ) -> ScrapedTrainingSample:
        """
        Takes raw train data (from Train APIs or manual developer input),
        enriches with live/cached weather, calendar dynamics, and infrastructure topology,
        and returns a validated ScrapedTrainingSample conforming to freeze_contract.md.
        """
        if departure_dt is None:
            # Try to parse from raw_train_data departureTime
            dep_raw = raw_train_data.get("departure_time") or raw_train_data.get("departureTime")
            if dep_raw:
                try:
                    departure_dt = datetime.fromisoformat(str(dep_raw).replace("Z", "+00:00"))
                except Exception:
                    departure_dt = datetime.now(timezone.utc)
            else:
                departure_dt = datetime.now(timezone.utc)

        # 1. Source: Train APIs
        train_features: TrainApiFeatures = self.train_collector.parse_raw(raw_train_data)

        # 2. Source: Weather APIs
        if custom_weather:
            weather_features = WeatherApiFeatures(**custom_weather)
        else:
            weather_features = self.weather_collector.fetch_weather(
                station_code=train_features.origin_station_code,
                departure_iso=departure_dt.isoformat(),
            )

        # 3. Source: Calendar / Temporal Generator
        calendar_features: CalendarFeatures = self.calendar_generator.generate_from_datetime(departure_dt)

        # 4. Source: Infrastructure & Topology Registry
        infra_features: InfrastructureFeatures = self.infrastructure_registry.get_infrastructure(
            origin_code=train_features.origin_station_code,
            destination_code=train_features.destination_station_code,
            origin_city=str(raw_train_data.get("origin_city", "")),
            destination_city=str(raw_train_data.get("destination_city", "")),
        )

        # 5. Source: Ground Truth Target Labels
        if actual_delay_minutes is None:
            # Use provided delay or origin delay
            delay = float(raw_train_data.get("actual_delay_minutes", train_features.delay_at_origin_minutes))
        else:
            delay = float(actual_delay_minutes)

        # Compute missed connection target
        walk_allowance_minutes = 5.0
        if train_features.has_transfer and train_features.transfer_buffer_minutes < 900:
            missed = 1 if delay > (train_features.transfer_buffer_minutes - walk_allowance_minutes) else 0
        else:
            missed = 0

        target_labels = TargetLabels(
            actual_delay_minutes=delay,
            missed_connection=missed,
        )

        return ScrapedTrainingSample(
            source_train_api=train_features,
            source_weather_api=weather_features,
            source_calendar_generator=calendar_features,
            source_infrastructure_registry=infra_features,
            target_labels=target_labels,
        )

    def export_to_csv(self, samples: List[ScrapedTrainingSample], output_path: Union[str, Path]) -> None:
        """Exports a list of scraped samples to a flat CSV file ready for model training."""
        if not samples:
            return

        flat_records = [s.to_flat_dict() for s in samples]
        fieldnames = list(flat_records[0].keys())

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(flat_records)

    def export_to_json(self, samples: List[ScrapedTrainingSample], output_path: Union[str, Path]) -> None:
        """Exports samples to standard JSON conforming to freeze_contract.md schema."""
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        data = [s.model_dump() for s in samples]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
