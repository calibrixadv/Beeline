from enum import Enum
from typing import List, Literal, Optional, Tuple, Union
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


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
    legRiskScore: float
    historicalPunctualityPercent: float
    transferBufferAfterMinutes: Optional[int] = None
    isShieldedBuffer: bool = False
    disruptions: List[TransitDisruption] = Field(default_factory=list)


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
    missedConnectionProbability: float = Field(
        default=0.0,
        validation_alias=AliasChoices("missedConnectionProbability", "missed_connection_probability"),
        serialization_alias="missedConnectionProbability",
        description="Calibrated probability of missing a transfer"
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
    optimizationPreference: Literal["FASTEST", "BEST_VALUE", "SAFE_BUFFERS", "LEAST_TRANSFERS"] = "SAFE_BUFFERS"
    minimumBufferMinutes: Optional[int] = 20


class MascotRecommendation(BaseModel):
    persona: Literal["barnaby", "honey", "bumble"]
    badgeLabel: str
    advice: str


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
    curatedPillar: CuratedPillar
    mascotRecommendation: MascotRecommendation
    riskAnalysis: RouteRiskAnalysis
    fare: RouteFareSummary
    eco: EcoBenchmark
    legs: List[TransitLeg]
    createdAt: str
    validUntil: str

    model_config = ConfigDict(extra="ignore")


class RoutePlanResponse(BaseModel):
    plans: List[TransitRoutePlan]
    recommendedPlanId: str
    query: TransitRouteQuery
    generatedAt: str


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
