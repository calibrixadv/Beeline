import argparse
import asyncio
import csv
import hashlib
import json
import logging
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Union

import pandas as pd

if __package__ is None or __package__ == "":
    backend_dir = Path(__file__).resolve().parent.parent
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    from scraper.collectors.calendar_generator import CalendarGenerator
    from scraper.collectors.infrastructure_registry import InfrastructureRegistry
    from scraper.collectors.train_api import ScrapeTier, TrainApiCollector, simulate_historical_delay
    from scraper.collectors.weather_api import WeatherApiCollector
    from scraper.models import (
        CalendarFeatures,
        InfrastructureFeatures,
        ScrapedTrainingSample,
        TargetLabels,
        TrainApiFeatures,
        TrainScrapeRecord,
        WeatherApiFeatures,
    )
else:
    from .collectors.calendar_generator import CalendarGenerator
    from .collectors.infrastructure_registry import InfrastructureRegistry
    from .collectors.train_api import ScrapeTier, TrainApiCollector, simulate_historical_delay
    from .collectors.weather_api import WeatherApiCollector
    from .models import (
        CalendarFeatures,
        InfrastructureFeatures,
        ScrapedTrainingSample,
        TargetLabels,
        TrainApiFeatures,
        TrainScrapeRecord,
        WeatherApiFeatures,
    )

logger = logging.getLogger(__name__)


class TransitScraperPipeline:
    """
    End-to-end scraper and multi-year dataset builder coordinating all 5 feature sources
    specified in freeze_contract.md.
    Supports multi-year historical dataset generation with automated timetable routing,
    bulk weather archive joining, and physical delay dynamics calibration.
    """

    def __init__(self, weather_timeout: float = 3.0, offline: bool = False):
        self.offline = offline
        self.train_collector = TrainApiCollector(offline=offline)
        self.weather_collector = WeatherApiCollector(timeout_seconds=weather_timeout, offline=offline)
        self.calendar_generator = CalendarGenerator()
        self.infrastructure_registry = InfrastructureRegistry()

    def process_sample(
        self,
        raw_train_data: Union[Dict[str, Any], Any],
        departure_dt: Optional[datetime] = None,
        custom_weather: Optional[Dict[str, Any]] = None,
        actual_delay_minutes: Optional[float] = None,
        service_date: Optional[str] = None,
        speed_restrictions_count: Optional[int] = None,
    ) -> ScrapedTrainingSample:
        """
        Takes raw train data (from Train APIs, TrainScrapeRecord, or manual developer input),
        enriches with live/cached weather, calendar dynamics, and infrastructure topology,
        calibrates physical delay & missed connection targets if not pre-set,
        and returns a validated ScrapedTrainingSample conforming to freeze_contract.md.
        """
        if hasattr(raw_train_data, "model_dump"):
            raw_dict = raw_train_data.model_dump()
            if "source_train_api" in raw_dict:
                raw_dict = raw_dict["source_train_api"]
        elif isinstance(raw_train_data, dict):
            raw_dict = raw_train_data
        else:
            raw_dict = {}

        if departure_dt is None:
            # Try to parse from raw_dict departureTime
            dep_raw = raw_dict.get("departure_time") or raw_dict.get("departureTime")
            if dep_raw:
                try:
                    departure_dt = datetime.fromisoformat(str(dep_raw).replace("Z", "+00:00"))
                except Exception:
                    departure_dt = datetime.now(timezone.utc)
            else:
                departure_dt = datetime.now(timezone.utc)

        date_str = service_date or departure_dt.strftime("%Y-%m-%d")

        # 1. Source: Train APIs
        train_features: TrainApiFeatures = self.train_collector.parse_raw(raw_train_data)

        # 2. Source: Weather APIs
        if custom_weather:
            weather_features = WeatherApiFeatures(**custom_weather)
        else:
            weather_features = self.weather_collector.get_weather_for_station_and_date(
                station_code=train_features.origin_station_code,
                date_str=date_str,
                hour=departure_dt.hour,
            )

        # 3. Source: Calendar / Temporal Generator
        calendar_features: CalendarFeatures = self.calendar_generator.generate_from_datetime(departure_dt)

        # 4. Source: Infrastructure & Topology Registry
        infra_features: InfrastructureFeatures = self.infrastructure_registry.get_infrastructure(
            origin_code=train_features.origin_station_code,
            destination_code=train_features.destination_station_code,
            origin_city=str(raw_dict.get("origin_city", "")),
            destination_city=str(raw_dict.get("destination_city", "")),
        )
        if speed_restrictions_count is not None:
            infra_features.active_speed_restrictions_count = int(speed_restrictions_count)
        elif "active_speed_restrictions_count" in raw_dict:
            infra_features.active_speed_restrictions_count = int(raw_dict["active_speed_restrictions_count"])

        # 5. Source: Ground Truth Target Labels
        if actual_delay_minutes is None:
            # Check target labels or raw dict
            if hasattr(raw_train_data, "actual_delay_minutes"):
                delay = float(getattr(raw_train_data, "actual_delay_minutes"))
            else:
                delay = float(raw_dict.get("actual_delay_minutes", train_features.delay_at_origin_minutes))
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
            service_date=date_str,
            source_train_api=train_features,
            source_weather_api=weather_features,
            source_calendar_generator=calendar_features,
            source_infrastructure_registry=infra_features,
            target_labels=target_labels,
        )

    def export_to_parquet(self, samples: List[ScrapedTrainingSample], output_path: Union[str, Path]) -> None:
        """Exports samples to parquet format for efficient multi-year storage and fast ML reading."""
        if not samples:
            return
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        flat_records = [s.to_flat_dict() for s in samples]
        df = pd.DataFrame(flat_records)
        df.to_parquet(path, index=False)
        logger.info(f"Exported {len(samples)} samples to parquet: {path}")

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
        logger.info(f"Exported {len(samples)} samples to CSV: {path}")

    def export_to_json(self, samples: List[ScrapedTrainingSample], output_path: Union[str, Path]) -> None:
        """Exports samples to standard JSON conforming to freeze_contract.md schema."""
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        data = [s.model_dump() for s in samples]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info(f"Exported {len(samples)} samples to JSON: {path}")

    async def generate_multiyear_dataset(
        self,
        start_date: str,
        end_date: str,
        sample_step: int = 1,
        tier: Union[ScrapeTier, str] = ScrapeTier.TIER_3_NATIONAL,
        output_path: Optional[Union[str, Path]] = None,
        weather_cache_path: Optional[Union[str, Path]] = None,
    ) -> List[ScrapedTrainingSample]:
        """
        Generates a balanced multi-year transit dataset covering 1-4 full years across all 4 seasons.
        Uses sample_step (default 1 = every day, 3 = every 3rd day + all extreme weather days).
        Ensures physical delay dynamics (rail expansion heat, frozen switches, single-track cascades).
        """
        if isinstance(tier, str):
            tier = ScrapeTier(tier)

        try:
            s_dt = datetime.strptime(start_date[:10], "%Y-%m-%d").date()
            e_dt = datetime.strptime(end_date[:10], "%Y-%m-%d").date()
        except Exception as e:
            raise ValueError(f"Invalid date format for start_date or end_date: {e}")

        if s_dt > e_dt:
            s_dt, e_dt = e_dt, s_dt

        # 1. Bulk pre-fetch weather archive across canonical coordinates
        logger.info(f"Prefetching weather archive from {s_dt} to {e_dt}...")
        self.weather_collector.prefetch_weather_archive(
            start_date=s_dt.strftime("%Y-%m-%d"),
            end_date=e_dt.strftime("%Y-%m-%d"),
            cache_path=weather_cache_path,
        )

        # 2. Identify extreme weather disruption dates across canonical hubs:
        # - extreme heat: temp > 34°C
        # - winter snow/blizzard: snow_depth_cm > 5
        # - freezing rain risk: flag == 1
        # - severe storms: is_thunderstorm == 1
        # - dense fog: visibility < 1000m
        # - high winds / gusts > 50 km/h
        extreme_weather_dates: Set[str] = set()
        for (st_code, d_str, hr), w_feat in self.weather_collector._archive_lookup.items():
            if (
                w_feat.temp_celsius > 34.0
                or w_feat.snow_depth_cm > 5.0
                or w_feat.freezing_rain_risk == 1
                or w_feat.is_thunderstorm == 1
                or w_feat.visibility_meters < 1000.0
                or w_feat.wind_speed_kmh > 40.0
                or w_feat.wind_gust_kmh > 60.0
            ):
                extreme_weather_dates.add(d_str)

        logger.info(f"Identified {len(extreme_weather_dates)} extreme weather disruption dates.")

        # 3. Generate candidate date list honoring sample_step + extreme days
        all_dates: List[date] = []
        curr = s_dt
        while curr <= e_dt:
            all_dates.append(curr)
            curr += timedelta(days=1)

        step = max(1, sample_step)
        sampled_dates: List[date] = []
        for idx, d in enumerate(all_dates):
            d_str = d.strftime("%Y-%m-%d")
            is_step_day = (idx % step == 0)
            is_extreme_day = (d_str in extreme_weather_dates)
            if is_step_day or is_extreme_day:
                sampled_dates.append(d)

        logger.info(
            f"Generating dataset across {len(sampled_dates)} sampled dates "
            f"(sample_step={step}, extreme_weather_days={len(extreme_weather_dates)})."
        )

        # 4. Generate observations per sampled date using active timetable version
        all_samples: List[ScrapedTrainingSample] = []

        for d in sampled_dates:
            d_str = d.strftime("%Y-%m-%d")
            train_records: List[TrainScrapeRecord] = []

            if tier == ScrapeTier.TIER_1_SMOKE:
                train_records = await self.train_collector.scrape_tier(tier=tier, date_str=d_str)
            elif tier == ScrapeTier.TIER_2_CORRIDOR:
                train_records = await self.train_collector.scrape_tier(tier=tier, date_str=d_str)
            else:  # TIER_3_NATIONAL
                all_nums = self.train_collector.xml_adapter.get_all_train_numbers(service_date=d_str)
                for t_num in all_nums:
                    rec = await self.train_collector.get_train(t_num, d_str)
                    if rec:
                        train_records.append(rec)

            for rec in train_records:
                dep_sec = self.train_collector.xml_adapter.get_train_departure_seconds(
                    rec.train_number, d_str
                )
                if dep_sec > 0:
                    dep_h = (dep_sec // 3600) % 24
                    dep_m = (dep_sec % 3600) // 60
                else:
                    seed_val = int(hashlib.md5(f"{rec.train_number}_{d_str}".encode()).hexdigest()[:6], 16)
                    dep_h = [6, 7, 8, 10, 12, 14, 15, 17, 18, 20][seed_val % 10]
                    dep_m = (seed_val % 12) * 5
                dep_dt = datetime(d.year, d.month, d.day, dep_h, dep_m, tzinfo=timezone.utc)

                restr = self.train_collector.xml_adapter.get_speed_restrictions_count(
                    rec.train_number, d_str
                )
                w_feat = self.weather_collector.get_weather_for_station_and_date(
                    rec.origin_station_code, d_str, hour=dep_dt.hour
                )
                infra_feat = self.infrastructure_registry.get_infrastructure(
                    rec.origin_station_code, rec.destination_station_code
                )
                orig_del, targets = simulate_historical_delay(
                    record=rec,
                    service_date=d_str,
                    restriction_count=restr,
                    weather=w_feat,
                    is_single_track_override=bool(infra_feat.is_single_track),
                )
                rec_copy = rec.model_copy(deep=True)
                rec_copy.source_train_api.delay_at_origin_minutes = orig_del
                rec_copy.target_labels = targets

                sample = self.process_sample(
                    raw_train_data=rec_copy,
                    departure_dt=dep_dt,
                    custom_weather=w_feat.model_dump(),
                    service_date=d_str,
                    actual_delay_minutes=targets.actual_delay_minutes,
                    speed_restrictions_count=restr,
                )
                all_samples.append(sample)

        logger.info(f"Total multi-year samples generated: {len(all_samples)}")

        # 5. Export to requested format
        if output_path:
            out_p = Path(output_path)
            if out_p.suffix == ".parquet":
                self.export_to_parquet(all_samples, out_p)
            elif out_p.suffix == ".csv":
                self.export_to_csv(all_samples, out_p)
            else:
                self.export_to_json(all_samples, out_p)

        return all_samples

    async def close(self) -> None:
        await self.train_collector.close()


def build_cli_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Beeline VoyageRail Multi-Year Transit Dataset Builder"
    )
    parser.add_argument(
        "--start-date",
        type=str,
        default="2023-01-01",
        help="Dataset start date (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--end-date",
        type=str,
        default="2026-11-01",
        help="Dataset end date (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--sample-step",
        type=int,
        default=1,
        help="Day sampling interval (1 = daily, 3 = every 3rd day + all extreme weather days)",
    )
    parser.add_argument(
        "--tier",
        type=str,
        default="TIER_3_NATIONAL",
        choices=["TIER_1_SMOKE", "TIER_2_CORRIDOR", "TIER_3_NATIONAL"],
        help="Scrape tier to generate (TIER_1_SMOKE, TIER_2_CORRIDOR, TIER_3_NATIONAL)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="backend/scraper/.cache/dataset_multiyear.parquet",
        help="Output dataset path (.parquet, .csv, or .json)",
    )
    parser.add_argument(
        "--weather-cache",
        type=str,
        default=None,
        help="Custom path to weather archive parquet/json.gz",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Force offline mode using local XML archives",
    )
    return parser


async def run_pipeline_cli() -> None:
    parser = build_cli_parser()
    args = parser.parse_args()

    pipeline = TransitScraperPipeline(offline=args.offline)
    try:
        print(
            f"[*] Starting Multi-Year Dataset Generation: {args.start_date} to {args.end_date} "
            f"(step={args.sample_step}, tier={args.tier}, offline={args.offline})"
        )
        t0 = datetime.now()
        samples = await pipeline.generate_multiyear_dataset(
            start_date=args.start_date,
            end_date=args.end_date,
            sample_step=args.sample_step,
            tier=args.tier,
            output_path=args.output,
            weather_cache_path=args.weather_cache,
        )
        elapsed = (datetime.now() - t0).total_seconds()
        print(f"[+] Successfully generated {len(samples)} samples in {elapsed:.2f} seconds.")
        print(f"[+] Saved output dataset to {args.output}")
    finally:
        await pipeline.close()


if __name__ == "__main__":
    asyncio.run(run_pipeline_cli())
