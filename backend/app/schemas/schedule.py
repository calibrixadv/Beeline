from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.route_plan import TransitMode


class TransitProvider(BaseModel):
    id: str
    name: str
    shortName: str
    city: str
    modes: List[TransitMode]
    badgeColor: str
    isNationalRail: Optional[bool] = False


class DepartureTime(BaseModel):
    time: str
    minutesUntil: int
    crowdingLevel: Optional[Literal["LOW", "MEDIUM", "HIGH"]] = "LOW"
    platform: Optional[str] = None
    isLiveTracking: Optional[bool] = True


class TransitLineSchedule(BaseModel):
    id: str
    lineCode: str
    lineName: str
    mode: TransitMode
    provider: TransitProvider
    city: str
    origin: str
    destination: str
    nextDepartures: List[DepartureTime]
    frequencyDescription: Optional[str] = None
    status: Literal["ON_TIME", "DELAYED", "DISRUPTED"] = "ON_TIME"
    fareLei: float
    viaStops: Optional[List[str]] = None

    model_config = ConfigDict(extra="ignore")


class ScheduleCreate(BaseModel):
    id: Optional[str] = None
    lineCode: str
    lineName: str
    mode: TransitMode
    provider: TransitProvider
    city: str
    origin: str
    destination: str
    nextDepartures: Optional[List[DepartureTime]] = None
    frequencyDescription: Optional[str] = None
    frequencyMinutes: Optional[int] = 15
    firstDeparture: Optional[str] = "05:00"
    lastDeparture: Optional[str] = "23:30"
    status: Literal["ON_TIME", "DELAYED", "DISRUPTED"] = "ON_TIME"
    fareLei: float = 3.0
    viaStops: Optional[List[str]] = None

    model_config = ConfigDict(extra="ignore")


class ScheduleUpdate(BaseModel):
    lineName: Optional[str] = None
    frequencyDescription: Optional[str] = None
    frequencyMinutes: Optional[int] = None
    firstDeparture: Optional[str] = None
    lastDeparture: Optional[str] = None
    status: Optional[Literal["ON_TIME", "DELAYED", "DISRUPTED"]] = None
    fareLei: Optional[float] = None
    nextDepartures: Optional[List[DepartureTime]] = None
    viaStops: Optional[List[str]] = None

    model_config = ConfigDict(extra="ignore")


class ScheduleQuery(BaseModel):
    section: Optional[Literal["URBAN", "TRAIN"]] = None
    city: Optional[str] = None
    mode: Optional[TransitMode] = None
    search: Optional[str] = None


class ScheduleStopDetails(BaseModel):
    stopSequence: int
    name: str
    latitude: float
    longitude: float
    platform: Optional[str] = None
    scheduledDepartures: List[str] = []

    model_config = ConfigDict(extra="ignore")


class ScheduleDetailResponse(BaseModel):
    schedule: TransitLineSchedule
    stops: List[ScheduleStopDetails]
    operatingDays: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    model_config = ConfigDict(extra="ignore")


class SupportedCity(BaseModel):
    name: str
    modes: List[TransitMode]
    hasRealtime: bool = True

    model_config = ConfigDict(extra="ignore")


class SupportedCitiesResponse(BaseModel):
    cities: List[SupportedCity]

