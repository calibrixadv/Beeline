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
