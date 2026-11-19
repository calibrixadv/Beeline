from enum import Enum
from typing import Any, List, Literal, Optional, Tuple, Union
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator


class TransitMode(str, Enum):
    TRAIN = "TRAIN"
    METRO = "METRO"
    TRAM = "TRAM"
    BUS = "BUS"
    WALK = "WALK"
    AIR = "AIR"
    FERRY = "FERRY"


class CuratedPillar(str, Enum):
    FASTEST = "FASTEST"
    BEST_VALUE = "BEST_VALUE"
    MOST_RELIABLE = "MOST_RELIABLE"
    ECO_HERO = "ECO_HERO"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class BufferAdequacy(str, Enum):
    GENEROUS = "GENEROUS"
    OPTIMAL = "OPTIMAL"
    TIGHT = "TIGHT"
    INSUFFICIENT = "INSUFFICIENT"


class GeoPoint(BaseModel):
    latitude: float
    longitude: float
    city: Optional[str] = None
    address: Optional[str] = None
    platform: Optional[str] = None
    stopId: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class GeoJSONLineString(BaseModel):
    type: Literal["LineString"] = "LineString"
    coordinates: List[Tuple[float, float]]  # [longitude, latitude] pairs


class IntermediateStop(BaseModel):
    stopSequence: int
    name: str
    coords: GeoPoint
    scheduledArrival: Optional[str] = None
    scheduledDeparture: Optional[str] = None
    platform: Optional[str] = None


class LegStop(BaseModel):
    stopSequence: int = Field(..., validation_alias=AliasChoices("stopSequence", "stop_sequence"))
    stationCode: str = Field(..., validation_alias=AliasChoices("stationCode", "station_code"))
    stationName: str = Field(..., validation_alias=AliasChoices("stationName", "station_name"))
    city: Optional[str] = None
    arrivalTime: Optional[str] = Field(default=None, validation_alias=AliasChoices("arrivalTime", "arrival_time"))
    departureTime: Optional[str] = Field(default=None, validation_alias=AliasChoices("departureTime", "departure_time"))
    dwellMinutes: int = Field(default=0, validation_alias=AliasChoices("dwellMinutes", "dwell_minutes"))
    distanceFromOriginKm: float = Field(default=0.0, validation_alias=AliasChoices("distanceFromOriginKm", "distance_from_origin_km"))
    stopType: Literal["BOARDING", "INTERMEDIATE", "TRANSFER", "ALIGHTING"] = Field(
        default="INTERMEDIATE",
        validation_alias=AliasChoices("stopType", "stop_type"),
    )
    platform: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    delayMinutes: Optional[int] = Field(default=None, validation_alias=AliasChoices("delayMinutes", "delay_minutes"))

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    @property
    def stop_sequence(self) -> int:
        return self.stopSequence

    @property
    def station_code(self) -> str:
        return self.stationCode

    @property
    def station_name(self) -> str:
        return self.stationName

    @property
    def arrival_time(self) -> Optional[str]:
        return self.arrivalTime

    @property
    def departure_time(self) -> Optional[str]:
        return self.departureTime

    @property
    def dwell_minutes(self) -> int:
        return self.dwellMinutes

    @property
    def distance_from_origin_km(self) -> float:
        return self.distanceFromOriginKm

    @property
    def stop_type(self) -> str:
        return self.stopType

    @property
    def delay_minutes(self) -> Optional[int]:
        return self.delayMinutes


class LegNames(BaseModel):
    originName: str
    originCity: str
    destinationName: str
    destinationCity: str
    lineCode: Optional[str] = None
    lineName: Optional[str] = None
    operatorName: Optional[str] = None
    operatorShortName: Optional[str] = None
    headsign: Optional[str] = None
    vehicleIdentifier: Optional[str] = None


class LegCoordinates(BaseModel):
    originCoords: GeoPoint
    destinationCoords: GeoPoint
    intermediateStops: List[IntermediateStop] = Field(default_factory=list)
    geometry: GeoJSONLineString


class LegTimings(BaseModel):
    scheduledDeparture: str
    scheduledArrival: str
    estimatedDeparture: str
    estimatedArrival: str
    durationMinutes: int
    delayMinutes: int = 0
    isRealtime: bool = False


class TransitDisruption(BaseModel):
    id: str
    severity: Literal["INFO", "WARNING", "CRITICAL"]
    headline: str
    description: str
    estimatedDelayMinutes: Optional[int] = None


class LegRiskProfile(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    legRiskScore: float
    historicalPunctualityPercent: float
    transferBufferAfterMinutes: Optional[int] = None
    isShieldedBuffer: bool = False
    disruptions: List[TransitDisruption] = Field(default_factory=list)
    expectedDelayMinutes: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("expectedDelayMinutes", "expected_delay_minutes"),
        serialization_alias="expectedDelayMinutes",
    )
    expectedMeanDelayMinutes: Optional[float] = Field(
        default=None,
        validation_alias=AliasChoices("expectedMeanDelayMinutes", "expected_mean_delay_minutes"),
        serialization_alias="expectedMeanDelayMinutes",
    )
    p90DelayMinutes: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("p90DelayMinutes", "p90_delay_minutes"),
        serialization_alias="p90DelayMinutes",
    )
    missedConnectionProbability: Optional[float] = Field(
        default=None,
        validation_alias=AliasChoices("missedConnectionProbability", "missed_connection_probability"),
        serialization_alias="missedConnectionProbability",
    )
    reliabilityScorePct: Optional[float] = Field(
        default=None,
        validation_alias=AliasChoices("reliabilityScorePct", "reliability_score_pct"),
        serialization_alias="reliabilityScorePct",
    )
    riskScore: Optional[float] = Field(
        default=None,
        validation_alias=AliasChoices("riskScore", "risk_score", "legRiskScore", "leg_risk_score"),
        serialization_alias="riskScore",
    )
    riskLevel: Optional[Union[RiskLevel, str]] = Field(
        default=None,
        validation_alias=AliasChoices("riskLevel", "risk_level"),
        serialization_alias="riskLevel",
    )
    riskFactors: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("riskFactors", "risk_factors"),
        serialization_alias="riskFactors",
    )


class LegFare(BaseModel):
    amount: float
    currency: Literal["RON", "EUR"] = "RON"
    ticketCategory: Literal["URBAN_TRANSIT", "RAIL_REGIO", "RAIL_INTERREGIO", "METRO_SINGLE", "FREE"]
    bookingUrl: Optional[str] = None
    providerPaymentMethods: Optional[List[str]] = None


class LegAmenities(BaseModel):
    items: List[str] = Field(default_factory=list)
    crowdingLevel: Literal["LOW", "MEDIUM", "HIGH"] = "LOW"
    stepFreeAccess: bool = True


class LegInstructions(BaseModel):
    leadText: str
    detailSteps: Optional[List[str]] = None
    transferNotice: Optional[str] = None


class TransitLeg(BaseModel):
    id: str
    legIndex: int
    transportType: TransitMode
    names: LegNames
    coords: LegCoordinates
    timings: LegTimings
    risk: LegRiskProfile
    fare: LegFare
    amenities: LegAmenities
    instructions: LegInstructions

    # Rich Itinerary Fields (Backward Compatible defaults)
    stops: List[LegStop] = Field(
        default_factory=list,
        validation_alias=AliasChoices("stops"),
        serialization_alias="stops",
    )
    intermediateStopCount: int = Field(
        default=0,
        validation_alias=AliasChoices("intermediateStopCount", "intermediate_stop_count"),
        serialization_alias="intermediateStopCount",
    )
    distanceKm: Optional[float] = Field(
        default=None,
        validation_alias=AliasChoices("distanceKm", "distance_km"),
        serialization_alias="distanceKm",
    )
    trainCategory: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("trainCategory", "train_category"),
        serialization_alias="trainCategory",
    )
    fullTrainOrigin: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("fullTrainOrigin", "full_train_origin"),
        serialization_alias="fullTrainOrigin",
    )
    fullTrainDestination: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("fullTrainDestination", "full_train_destination"),
        serialization_alias="fullTrainDestination",
    )

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    @property
    def intermediate_stop_count(self) -> int:
        return self.intermediateStopCount

    @property
    def distance_km(self) -> Optional[float]:
        return self.distanceKm

    @property
    def train_category(self) -> Optional[str]:
        return self.trainCategory

    @property
    def full_train_origin(self) -> Optional[str]:
        return self.fullTrainOrigin

    @property
    def full_train_destination(self) -> Optional[str]:
        return self.fullTrainDestination

    @property
    def lineCode(self) -> str:
        return (self.names.lineCode if self.names else "") or ""

    @property
    def origin(self) -> str:
        return (self.names.originName if self.names else "") or ""

    @property
    def destination(self) -> str:
        return (self.names.destinationName if self.names else "") or ""

    @property
    def departureTime(self) -> str:
        return (self.timings.scheduledDeparture if self.timings else "") or ""

    @property
    def arrivalTime(self) -> str:
        return (self.timings.scheduledArrival if self.timings else "") or ""


def compute_leg_signature(leg: TransitLeg) -> str:
    line_code = (leg.lineCode or "").strip().upper()
    return f"{line_code}|{leg.origin}|{leg.destination}|{leg.departureTime}|{leg.arrivalTime}"


def compute_plan_signature(plan: "TransitRoutePlan") -> str:
    return "->".join(compute_leg_signature(leg) for leg in plan.legs)



class RouteRiskFactor(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    code: Literal[
        "SINGLE_TRACK_RAIL",
        "URBAN_RUSH_HOUR_TRAFFIC",
        "SUB_15_MIN_TRANSFER",
        "WEATHER_ALERT",
        "CARRIER_CHRONIC_DELAY",
    ]
    severity: Literal["INFO", "WARNING", "CRITICAL"]
    description: str
    affectedLegIndex: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("affectedLegIndex", "affected_leg_index"),
        serialization_alias="affectedLegIndex",
    )


class RouteRiskAnalysis(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    overallRiskScore: float = Field(
        ...,
        validation_alias=AliasChoices("overallRiskScore", "overall_risk_score", "risk_score", "riskScore"),
        serialization_alias="overallRiskScore",
        description="Calibrated overall journey risk score (0.0..100.0)"
    )
    riskLevel: RiskLevel = Field(
        ...,
        validation_alias=AliasChoices("riskLevel", "risk_level"),
        serialization_alias="riskLevel",
        description="Categorical risk band (LOW, MODERATE, HIGH, CRITICAL)"
    )
    historicalPunctualityRate: float = Field(
        ...,
        validation_alias=AliasChoices("historicalPunctualityRate", "historical_punctuality_rate"),
        serialization_alias="historicalPunctualityRate",
        description="Historical on-time punctuality rate (0.0..1.0)"
    )
    tightestBufferMinutes: int = Field(
        ...,
        validation_alias=AliasChoices("tightestBufferMinutes", "tightest_buffer_minutes"),
        serialization_alias="tightestBufferMinutes",
        description="Tightest transfer buffer in minutes (0 for direct trips)"
    )
    bufferAdequacy: BufferAdequacy = Field(
        ...,
        validation_alias=AliasChoices("bufferAdequacy", "buffer_adequacy"),
        serialization_alias="bufferAdequacy",
        description="Buffer adequacy category"
    )
    riskSummaryText: str = Field(
        ...,
        validation_alias=AliasChoices("riskSummaryText", "risk_summary_text"),
        serialization_alias="riskSummaryText",
        description="Human-readable summary of journey connection risk"
    )
    factors: List[RouteRiskFactor] = Field(default_factory=list)
    expectedDelayMinutes: int = Field(
        default=0,
        validation_alias=AliasChoices("expectedDelayMinutes", "expected_delay_minutes"),
        serialization_alias="expectedDelayMinutes",
        description="Predicted delay in minutes from ML regressor"
    )
    expectedMeanDelayMinutes: Optional[float] = Field(
        default=None,
        validation_alias=AliasChoices("expectedMeanDelayMinutes", "expected_mean_delay_minutes"),
        serialization_alias="expectedMeanDelayMinutes",
        description="Expected mean delay in minutes from Head 2 L2 expectation"
    )
    p90DelayMinutes: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("p90DelayMinutes", "p90_delay_minutes"),
        serialization_alias="p90DelayMinutes",
        description="90th percentile delay bound"
    )
    missedConnectionProbability: float = Field(
        default=0.0,
        validation_alias=AliasChoices("missedConnectionProbability", "missed_connection_probability"),
        serialization_alias="missedConnectionProbability",
        description="Calibrated probability of missing a transfer"
    )
    reliabilityScorePct: Optional[float] = Field(
        default=None,
        validation_alias=AliasChoices("reliabilityScorePct", "reliability_score_pct"),
        serialization_alias="reliabilityScorePct",
        description="Calibrated reliability percentage (0.0..100.0)"
    )
    riskFactors: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("riskFactors", "risk_factors", "delayRiskFactors"),
        serialization_alias="riskFactors",
        description="Human-readable bullet explanations for UI"
    )
    isMlComputed: bool = Field(
        default=False,
        validation_alias=AliasChoices("isMlComputed", "is_ml_computed"),
        serialization_alias="isMlComputed",
        description="True if ONNX engine inferred, False if fallback"
    )

    @field_validator("riskLevel", mode="before")
    @classmethod
    def _normalize_risk_level(cls, v: Any) -> Any:
        if isinstance(v, str):
            v_upper = v.upper()
            if v_upper == "MEDIUM":
                return RiskLevel.MODERATE
            if v_upper in RiskLevel.__members__:
                return RiskLevel(v_upper)
        return v

    @property
    def risk_score(self) -> float:
        return self.overallRiskScore

    @property
    def risk_level(self) -> RiskLevel:
        return self.riskLevel


class EcoBenchmark(BaseModel):
    routeEmissionsKgCO2: float
    carEmissionsKgCO2: float
    savedKgCO2: float
    percentageSaved: float
    treeDaysEquivalent: float


class LegFareItem(BaseModel):
    legId: str
    operator: str
    amountLei: float
    amountEur: float


class RouteFareSummary(BaseModel):
    totalAmountLei: float
    totalAmountEur: float
    isIntegratedTicketAvailable: bool
    legFares: List[LegFareItem] = Field(default_factory=list)


class LocationQuery(BaseModel):
    name: str
    coords: Optional[GeoPoint] = None
    city: Optional[str] = None


class TransitRouteQuery(BaseModel):
    origin: LocationQuery
    destination: LocationQuery
    departureTime: Optional[str] = None
    allowedModes: List[TransitMode] = Field(
        default_factory=lambda: [TransitMode.TRAIN, TransitMode.METRO, TransitMode.TRAM, TransitMode.BUS, TransitMode.WALK]
    )
    optimizationPreference: Literal["FASTEST", "BEST_VALUE", "SAFE_BUFFERS", "LEAST_TRANSFERS", "MOST_RELIABLE"] = "SAFE_BUFFERS"
    minimumBufferMinutes: Optional[int] = 20


class MascotRecommendation(BaseModel):
    persona: Literal["barnaby", "honey", "bumble"]
    badgeLabel: str
    advice: str


class TransferDetail(BaseModel):
    transferIndex: int = Field(..., validation_alias=AliasChoices("transferIndex", "transfer_index"))
    stationCode: str = Field(..., validation_alias=AliasChoices("stationCode", "station_code"))
    stationName: str = Field(..., validation_alias=AliasChoices("stationName", "station_name"))
    arrivalTime: str = Field(..., validation_alias=AliasChoices("arrivalTime", "arrival_time"))
    departureTime: str = Field(..., validation_alias=AliasChoices("departureTime", "departure_time"))
    waitMinutes: int = Field(..., validation_alias=AliasChoices("waitMinutes", "wait_minutes"))
    fromLineCode: str = Field(..., validation_alias=AliasChoices("fromLineCode", "from_line_code"))
    fromOperator: str = Field(..., validation_alias=AliasChoices("fromOperator", "from_operator"))
    toLineCode: str = Field(..., validation_alias=AliasChoices("toLineCode", "to_line_code"))
    toOperator: str = Field(..., validation_alias=AliasChoices("toOperator", "to_operator"))
    bufferStatus: Literal["SAFE", "TIGHT", "RISKY"] = Field(
        ...,
        validation_alias=AliasChoices("bufferStatus", "buffer_status")
    )
    missedConnectionProbability: float = Field(
        default=0.0,
        validation_alias=AliasChoices("missedConnectionProbability", "missed_connection_probability")
    )

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    @property
    def transfer_index(self) -> int:
        return self.transferIndex

    @property
    def station_code(self) -> str:
        return self.stationCode

    @property
    def station_name(self) -> str:
        return self.stationName

    @property
    def arrival_time(self) -> str:
        return self.arrivalTime

    @property
    def departure_time(self) -> str:
        return self.departureTime

    @property
    def wait_minutes(self) -> int:
        return self.waitMinutes

    @property
    def from_line_code(self) -> str:
        return self.fromLineCode

    @property
    def from_operator(self) -> str:
        return self.fromOperator

    @property
    def to_line_code(self) -> str:
        return self.toLineCode

    @property
    def to_operator(self) -> str:
        return self.toOperator

    @property
    def buffer_status(self) -> str:
        return self.bufferStatus

    @property
    def missed_connection_probability(self) -> float:
        return self.missedConnectionProbability


class TransitRoutePlan(BaseModel):
    id: str
    query: TransitRouteQuery
    summary: str
    departureTime: str
    arrivalTime: str
    totalDurationMinutes: int
    totalWalkMinutes: int
    totalWalkDistanceMeters: int
    transfersCount: int
    curatedPillar: Optional[Union[CuratedPillar, str]] = None
    curatedPillars: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("curatedPillars", "curated_pillars"),
        serialization_alias="curatedPillars",
    )
    mascotRecommendation: MascotRecommendation
    riskAnalysis: RouteRiskAnalysis
    fare: RouteFareSummary
    eco: EcoBenchmark
    legs: List[TransitLeg]
    transfers: List[TransferDetail] = Field(
        default_factory=list,
        validation_alias=AliasChoices("transfers"),
        serialization_alias="transfers",
    )
    createdAt: str
    validUntil: str

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    @property
    def curated_pillars(self) -> List[str]:
        return self.curatedPillars

    @curated_pillars.setter
    def curated_pillars(self, value: List[str]) -> None:
        self.curatedPillars = value


# Semantic alias
RoutePlan = TransitRoutePlan


class BookingWindowInfo(BaseModel):
    minDate: str
    maxDate: str
    advanceBookingDays: int = 90
    activeTimetable: str = "2025-2026 / 2026-2027"
    liveSource: str = "INFOFER_IRIS_AND_OFFICIAL_XML"

    model_config = ConfigDict(extra="ignore", populate_by_name=True)


class TrainItineraryResponse(BaseModel):
    trainNumber: str = Field(..., validation_alias=AliasChoices("trainNumber", "train_number"))
    operator: str
    trainCategory: Optional[str] = Field(default=None, validation_alias=AliasChoices("trainCategory", "train_category"))
    date: str
    fullTrainOrigin: str = Field(..., validation_alias=AliasChoices("fullTrainOrigin", "full_train_origin"))
    fullTrainDestination: str = Field(..., validation_alias=AliasChoices("fullTrainDestination", "full_train_destination"))
    totalDistanceKm: float = Field(..., validation_alias=AliasChoices("totalDistanceKm", "total_distance_km"))
    totalDurationMinutes: int = Field(..., validation_alias=AliasChoices("totalDurationMinutes", "total_duration_minutes"))
    stops: List[LegStop] = Field(default_factory=list)
    liveSource: str = "INFOFER_IRIS_AND_OFFICIAL_XML"
    bookingWindow: Optional[BookingWindowInfo] = Field(default=None, validation_alias=AliasChoices("bookingWindow", "booking_window"))

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    @property
    def train_number(self) -> str:
        return self.trainNumber

    @property
    def train_category(self) -> Optional[str]:
        return self.trainCategory

    @property
    def full_train_origin(self) -> str:
        return self.fullTrainOrigin

    @property
    def full_train_destination(self) -> str:
        return self.fullTrainDestination

    @property
    def total_distance_km(self) -> float:
        return self.totalDistanceKm

    @property
    def total_duration_minutes(self) -> int:
        return self.totalDurationMinutes

    @property
    def booking_window(self) -> Optional[BookingWindowInfo]:
        return self.bookingWindow


class RoutePlanResponse(BaseModel):
    plans: List[TransitRoutePlan]
    recommendedPlanId: str
    query: TransitRouteQuery
    generatedAt: str
    bookingWindow: Optional[BookingWindowInfo] = None
    allDayDepartures: Optional[List[Any]] = None
    totalDayRoutes: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("totalDayRoutes", "total_day_routes"),
        serialization_alias="totalDayRoutes",
    )

    model_config = ConfigDict(extra="ignore", populate_by_name=True)


class SaveRouteRequest(BaseModel):
    plan: TransitRoutePlan
    notes: Optional[str] = None


class SavedRouteResponse(BaseModel):
    id: str
    origin_name: str
    destination_name: str
    plan: TransitRoutePlan
    notes: Optional[str] = None
    created_at: str


class SavedRouteUpdate(BaseModel):
    origin_name: Optional[str] = None
    destination_name: Optional[str] = None
    plan: Optional[TransitRoutePlan] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")
