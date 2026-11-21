from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict

TrainStatus = Literal["ON_TIME", "DELAYED", "CANCELLED", "BOARDING"]
TrainClass = Literal["STANDARD", "FIRST", "BUSINESS", "SLEEPER"]
Amenity = Literal[
    "WIFI",
    "POWER_OUTLETS",
    "DINING_CAR",
    "BIKE_STORAGE",
    "WHEELCHAIR_ACCESSIBLE",
    "QUIET_ZONE"
]


class TrainStation(BaseModel):
    code: str
    name: str
    city: str
    platform: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class TrainStop(BaseModel):
    stopNumber: int
    station: TrainStation
    scheduledArrival: Optional[str] = None
    scheduledDeparture: Optional[str] = None
    actualArrival: Optional[str] = None
    actualDeparture: Optional[str] = None
    platform: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class TrainFare(BaseModel):
    classType: TrainClass
    price: float
    currency: str = "RON"
    seatsAvailable: int

    model_config = ConfigDict(extra="ignore")


class TrainJourney(BaseModel):
    id: str
    trainNumber: str
    operator: str
    origin: TrainStation
    destination: TrainStation
    departureTime: str
    arrivalTime: str
    durationMinutes: int
    durationFormatted: str
    status: TrainStatus
    delayMinutes: int = 0
    fares: List[TrainFare]
    stops: List[TrainStop]
    amenities: List[Amenity]
    carbonFootprintKg: float

    model_config = ConfigDict(extra="ignore")


class TrainCreate(BaseModel):
    id: Optional[str] = None
    trainNumber: str
    operator: str
    origin: TrainStation
    destination: TrainStation
    departureTime: str
    arrivalTime: str
    durationMinutes: int
    durationFormatted: Optional[str] = None
    status: TrainStatus = "ON_TIME"
    delayMinutes: int = 0
    fares: Optional[List[TrainFare]] = None
    stops: Optional[List[TrainStop]] = None
    amenities: Optional[List[Amenity]] = None
    carbonFootprintKg: Optional[float] = 12.5

    model_config = ConfigDict(extra="ignore")


class TrainUpdate(BaseModel):
    operator: Optional[str] = None
    status: Optional[TrainStatus] = None
    delayMinutes: Optional[int] = None
    amenities: Optional[List[Amenity]] = None
    fares: Optional[List[TrainFare]] = None
    carbonFootprintKg: Optional[float] = None

    model_config = ConfigDict(extra="ignore")


class RailwayOperator(BaseModel):
    id: str
    name: str
    shortName: str
    country: str = "Romania"
    website: Optional[str] = None
    phone: Optional[str] = None
    gtfsRtHealth: Literal["OPERATIONAL", "DEGRADED", "OFFLINE"] = "OPERATIONAL"
    logoUrl: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class RailwayOperatorsResponse(BaseModel):
    operators: List[RailwayOperator]


class RailOperatorSummary(BaseModel):
    id: str
    shortName: str
    name: str
    dailyTrains: int
    routes: int

    model_config = ConfigDict(extra="ignore")


class OperatorsSummaryResponse(BaseModel):
    totalDailyTrains: int
    totalRoutes: int
    operatorCount: int
    updatedAt: str
    source: str = "OFFICIAL_XML_LIVE"
    operators: List[RailOperatorSummary]

    model_config = ConfigDict(extra="ignore")



class TimetableBookingWindow(BaseModel):
    minDate: str
    maxDate: str
    advanceBookingDays: int = 90
    activeTimetable: str = "2025-2026 / 2026-2027"
    liveSource: str = "INFOFER_LIVE_ONLY"

    model_config = ConfigDict(extra="ignore")


class TimetableStatusResponse(BaseModel):
    status: str = "OPERATIONAL"
    activeTimetable: str
    timetableTransitionDate: str
    operatorCounts: dict
    totalActiveDailyTrains: int
    totalRoutes: int
    operatorsCovered: List[str]
    bookingWindow: TimetableBookingWindow
    lastSyncedAt: str

    model_config = ConfigDict(extra="ignore")


class TimetableSyncResponse(BaseModel):
    status: str
    apiSourceStatus: str
    discoveredPackages: int
    downloadedFiles: int
    activeTimetable: str
    totalActiveDailyTrains: int
    totalRoutes: int
    operatorCounts: dict
    bookingWindow: TimetableBookingWindow
    lastSyncedAt: str

    model_config = ConfigDict(extra="ignore")


# Re-export TrainItineraryResponse for backward compatibility
from app.schemas.route_plan import TrainItineraryResponse  # noqa: E402


