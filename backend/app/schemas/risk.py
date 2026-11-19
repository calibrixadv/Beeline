from typing import List, Literal, Optional
import numpy as np
from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from app.schemas.route_plan import RiskLevel, RouteRiskFactor


class RiskFactorExplanation(BaseModel):
    """Structured explanation factor for transit connection and delay risk."""
    code: str = Field(
        ...,
        description="Standardized risk condition code (e.g. SINGLE_TRACK_RAIL, SUB_15_MIN_TRANSFER)"
    )
    severity: Literal["INFO", "WARNING", "CRITICAL"] = "INFO"
    description: str = Field(..., description="Human-readable description of the identified hazard")
    affected_leg_index: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("affected_leg_index", "affectedLegIndex"),
        serialization_alias="affectedLegIndex",
        description="0-based index of affected leg in journey"
    )
    factor_type: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("factor_type", "factorType"),
        serialization_alias="factorType",
        description="Category classification (e.g. INFRASTRUCTURE, TIMING, WEATHER, CARRIER)"
    )
    weight: Optional[float] = Field(default=None, description="Relative penalty contribution (0.0..100.0)")

    model_config = ConfigDict(populate_by_name=True)


class RiskFeatureVector(BaseModel):
    """
    Validates and normalizes the canonical 18-element numerical feature vector
    consumed by the ONNX RomanianTransitRiskModel runtime.
    """
    train_category: int = Field(default=5, ge=0, le=6, description="0: BUS, 1: METRO, 2: TRAM, 3: R, 4: RE, 5: IR, 6: IC")
    corridor_id_hash: int = Field(default=0, ge=0, le=999, description="MD5 hash mod 1000 of canonical corridor slug")
    scheduled_duration_minutes: float = Field(default=60.0, ge=0.0, description="Scheduled duration of trip in minutes")
    stop_count: int = Field(default=4, ge=0, description="Total number of stops in journey")
    distance_km_est: float = Field(default=50.0, ge=0.0, description="Haversine distance in km")
    departure_hour: int = Field(default=12, ge=0, le=23, description="Hour of departure (0-23)")
    is_peak_hour: int = Field(default=0, ge=0, le=1, description="1 if rush hour (7-9 or 16-19), else 0")
    day_of_week: int = Field(default=2, ge=0, le=6, description="0=Monday .. 6=Sunday")
    is_weekend: int = Field(default=0, ge=0, le=1, description="1 if Saturday/Sunday, else 0")
    has_transfer: int = Field(default=0, ge=0, le=1, description="1 if journey has transfers, else 0")
    transfer_buffer_minutes: float = Field(default=999.0, description="Tightest transfer buffer in minutes (999.0 for direct)")
    transfer_station_reliability: float = Field(default=0.88, ge=0.0, le=1.0, description="Historical punctuality of transfer hub")
    transfer_station_congestion: float = Field(default=0.30, ge=0.0, le=1.0, description="Congestion index of transfer hub (0.0..1.0)")
    active_corridor_disruptions: int = Field(default=0, ge=0, description="Active disruption count on corridor")
    corridor_severity_max: int = Field(default=0, ge=0, le=3, description="Max disruption severity (0=None, 1=INFO, 2=WARNING, 3=CRITICAL)")
    rolling_avg_delay_3h: float = Field(default=0.0, description="Rolling 3-hour average delay on corridor in minutes")
    rolling_avg_delay_24h: float = Field(default=0.0, description="Rolling 24-hour average delay on corridor in minutes")
    carrier_baseline_punctuality: float = Field(default=0.88, ge=0.0, le=1.0, description="Carrier baseline punctuality benchmark (0.0..1.0)")

    model_config = ConfigDict(populate_by_name=True)

    def to_list(self) -> List[float]:
        """Returns the canonical 18-element float list ordered by model feature schema."""
        return [
            float(self.train_category),
            float(self.corridor_id_hash),
            float(self.scheduled_duration_minutes),
            float(self.stop_count),
            float(self.distance_km_est),
            float(self.departure_hour),
            float(self.is_peak_hour),
            float(self.day_of_week),
            float(self.is_weekend),
            float(self.has_transfer),
            float(self.transfer_buffer_minutes),
            float(self.transfer_station_reliability),
            float(self.transfer_station_congestion),
            float(self.active_corridor_disruptions),
            float(self.corridor_severity_max),
            float(self.rolling_avg_delay_3h),
            float(self.rolling_avg_delay_24h),
            float(self.carrier_baseline_punctuality),
        ]

    def to_numpy_vector(self) -> np.ndarray:
        """Returns an (18,) float32 NumPy array ready for batched model input stacking."""
        return np.array(self.to_list(), dtype=np.float32)


class RiskPrediction(BaseModel):
    """
    Prediction output schema representing the calibrated inference output of the
    multi-head production engine along with natural language explainability.
    """
    expected_delay_minutes: int = Field(
        default=0,
        validation_alias=AliasChoices("expected_delay_minutes", "expectedDelayMinutes"),
        serialization_alias="expectedDelayMinutes",
        description="Predicted delay in minutes from ML regressor"
    )
    expected_mean_delay_minutes: Optional[float] = Field(
        default=None,
        validation_alias=AliasChoices("expected_mean_delay_minutes", "expectedMeanDelayMinutes"),
        serialization_alias="expectedMeanDelayMinutes",
        description="Predicted mean delay in minutes from Head 2 L2 expectation"
    )
    p90_delay_minutes: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("p90_delay_minutes", "p90DelayMinutes"),
        serialization_alias="p90DelayMinutes",
        description="90th percentile delay bound"
    )
    missed_connection_probability: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        validation_alias=AliasChoices("missed_connection_probability", "missedConnectionProbability"),
        serialization_alias="missedConnectionProbability",
        description="Calibrated probability of missing a transfer connection"
    )
    reliability_score_pct: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        validation_alias=AliasChoices("reliability_score_pct", "reliabilityScorePct"),
        serialization_alias="reliabilityScorePct",
        description="Drift-purged reliability percentage (0.0..100.0)"
    )
    overall_risk_score: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
        validation_alias=AliasChoices("overall_risk_score", "overallRiskScore", "risk_score", "riskScore"),
        serialization_alias="overallRiskScore",
        description="Calibrated composite journey risk score (0.0..100.0)"
    )
    risk_level: RiskLevel = Field(
        default=RiskLevel.LOW,
        validation_alias=AliasChoices("risk_level", "riskLevel"),
        serialization_alias="riskLevel",
        description="Categorical risk band (LOW, MODERATE, HIGH, CRITICAL)"
    )
    risk_factors: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("risk_factors", "riskFactors", "delayRiskFactors"),
        serialization_alias="riskFactors",
        description="Human-readable bullet explanations of primary hazards"
    )
    factors: List[RouteRiskFactor] = Field(
        default_factory=list,
        description="Structured hazard factor objects"
    )
    is_ml_computed: bool = Field(
        default=False,
        validation_alias=AliasChoices("is_ml_computed", "isMlComputed"),
        serialization_alias="isMlComputed",
        description="True if predicted by ML engine, False if deterministic fallback"
    )

    model_config = ConfigDict(populate_by_name=True)

    @property
    def risk_score(self) -> float:
        return self.overall_risk_score
