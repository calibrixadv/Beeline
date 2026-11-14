from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class TrainApiFeatures(BaseModel):
    """
    Features sourced from Train APIs (CFR Călători, InfoFer, Private Carriers, or Manual Input).
    Defined in freeze_contract.md Section 2 - Sursa 1.
    """
    model_config = ConfigDict(populate_by_name=True)

    train_number: str = Field(description="Ex: 'IR 1572'")
    operator: str = Field(default="CFR", description="Carrier code: CFR, ASTRA, TFC, SOFTRANS, REGIO")
    train_category: int = Field(default=2, ge=0, le=3, description="0: R, 1: RE, 2: IR, 3: IC")
    origin_station_code: str = Field(description="Origin station telegrafe code, e.g. 'GLT'")
    destination_station_code: str = Field(description="Destination station code, e.g. 'BCT'")
    scheduled_duration_minutes: float = Field(default=120.0, gt=0, description="Scheduled duration in minutes")
    distance_km: float = Field(default=150.0, gt=0, description="Corridor rail distance in km")
    stop_count: int = Field(default=4, ge=0, description="Count of intermediate scheduled stops")
    delay_at_origin_minutes: int = Field(default=0, ge=0, description="Delay at origin departure in minutes")
    traction_type: int = Field(default=1, ge=0, le=1, description="0: DIESEL, 1: ELECTRIC")
    has_transfer: int = Field(default=0, ge=0, le=1, description="0: direct, 1: connecting journey")
    transfer_buffer_minutes: float = Field(default=999.0, ge=0, description="Available transfer buffer in minutes")


class WeatherApiFeatures(BaseModel):
    """
    Features sourced from Weather APIs (ANM / Open-Meteo).
    Defined in freeze_contract.md Section 2 - Sursa 2.
    """
    model_config = ConfigDict(populate_by_name=True)

    temp_celsius: float = Field(default=18.0, description="Ambient air temperature in Celsius")
    precipitation_rate_mm_h: float = Field(default=0.0, ge=0, description="Precipitation rate in mm/hour")
    is_thunderstorm: int = Field(default=0, ge=0, le=1, description="Thunderstorm / lightning activity flag")
    wind_speed_kmh: float = Field(default=10.0, ge=0, description="Sustained wind speed in km/h")
    wind_gust_kmh: float = Field(default=15.0, ge=0, description="Max wind gust in km/h")
    snow_depth_cm: float = Field(default=0.0, ge=0, description="Accumulated snow depth in cm")
    freezing_rain_risk: int = Field(default=0, ge=0, le=1, description="Freezing rain / catenary glaze flag")
    visibility_meters: float = Field(default=10000.0, ge=0, description="Atmospheric visibility in meters")


class CalendarFeatures(BaseModel):
    """
    Features generated deterministically from trip timestamps.
    Defined in freeze_contract.md Section 2 - Sursa 3.
    """
    model_config = ConfigDict(populate_by_name=True)

    season: int = Field(default=1, ge=0, le=3, description="0: SPRING, 1: SUMMER, 2: AUTUMN, 3: WINTER")
    departure_hour: int = Field(default=12, ge=0, le=23, description="Hour of departure (0-23)")
    is_peak_hour: int = Field(default=0, ge=0, le=1, description="1 if commuter rush (06:30-09:00, 16:00-19:30)")
    day_of_week: int = Field(default=2, ge=0, le=6, description="0: Monday ... 6: Sunday")
    is_weekend: int = Field(default=0, ge=0, le=1, description="1 if Saturday or Sunday")
    is_holiday_window: int = Field(default=0, ge=0, le=1, description="1 if within Romanian statutory holiday surge window")


class InfrastructureFeatures(BaseModel):
    """
    Features sourced from CFR SA Infrastructure Registry / Corridors.
    Defined in freeze_contract.md Section 2 - Sursa 4.
    """
    model_config = ConfigDict(populate_by_name=True)

    is_single_track: int = Field(default=0, ge=0, le=1, description="1 if route traverses single-track sections")
    mountain_pass_flag: int = Field(default=0, ge=0, le=1, description="1 if route crosses mountain passes (>800m)")
    active_speed_restrictions_count: int = Field(default=0, ge=0, description="Count of active BAR slow orders")
    corridor_slug: str = Field(default="", description="Canonical corridor slug, e.g. 'galati-bucuresti_nord'")


class TargetLabels(BaseModel):
    """
    Ground truth supervised training targets.
    Defined in freeze_contract.md Section 2 - Sursa 5.
    """
    model_config = ConfigDict(populate_by_name=True)

    actual_delay_minutes: float = Field(default=0.0, ge=0.0, description="Target 1: Actual arrival delay in minutes")
    missed_connection: int = Field(default=0, ge=0, le=1, description="Target 2: Binary 1 if connection missed, else 0")


class ScrapedTrainingSample(BaseModel):
    """
    Unified training observation containing all 5 feature groups.
    """
    model_config = ConfigDict(populate_by_name=True)

    source_train_api: TrainApiFeatures
    source_weather_api: WeatherApiFeatures
    source_calendar_generator: CalendarFeatures
    source_infrastructure_registry: InfrastructureFeatures
    target_labels: TargetLabels

    def to_flat_dict(self) -> Dict[str, object]:
        """Flattens all feature categories into a flat tabular dictionary for ML training."""
        data: Dict[str, object] = {}
        for group in [
            self.source_train_api,
            self.source_weather_api,
            self.source_calendar_generator,
            self.source_infrastructure_registry,
            self.target_labels,
        ]:
            data.update(group.model_dump())
        return data

    def to_18_feature_vector(self) -> List[float]:
        """
        Maps the frozen sample to the 18-element numerical vector accepted by
        the active in-process ONNX model (backend/app/ml_models/risk_model.onnx).
        """
        train = self.source_train_api
        infra = self.source_infrastructure_registry
        cal = self.source_calendar_generator
        weather = self.source_weather_api

        # Carrier baseline mapping
        carrier_punctuality_map = {
            "CFR": 0.82,
            "ASTRA": 0.88,
            "TFC": 0.86,
            "SOFTRANS": 0.92,
            "REGIO": 0.84,
        }
        baseline_punctuality = carrier_punctuality_map.get(train.operator.upper(), 0.85)

        corridor_id_hash = float(abs(hash(infra.corridor_slug)) % 1000)

        # 18-element vector strictly conforming to risk_model_metadata.json
        return [
            float(train.train_category),                     # 0: train_category
            corridor_id_hash,                                # 1: corridor_id_hash
            float(train.scheduled_duration_minutes),         # 2: scheduled_duration_minutes
            float(train.stop_count),                         # 3: stop_count
            float(train.distance_km),                        # 4: distance_km_est
            float(cal.departure_hour),                       # 5: departure_hour
            float(cal.is_peak_hour),                         # 6: is_peak_hour
            float(cal.day_of_week),                          # 7: day_of_week
            float(cal.is_weekend),                           # 8: is_weekend
            float(train.has_transfer),                       # 9: has_transfer
            float(train.transfer_buffer_minutes),            # 10: transfer_buffer_minutes
            0.88,                                            # 11: transfer_station_reliability
            0.30,                                            # 12: transfer_station_congestion
            float(infra.active_speed_restrictions_count),    # 13: active_corridor_disruptions
            float(weather.is_thunderstorm * 2),              # 14: corridor_severity_max (0-3)
            float(train.delay_at_origin_minutes),            # 15: rolling_avg_delay_3h
            float(train.delay_at_origin_minutes * 1.2),      # 16: rolling_avg_delay_24h
            baseline_punctuality,                            # 17: carrier_baseline_punctuality
        ]
