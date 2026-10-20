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


class ScheduleQuery(BaseModel):
    section: Optional[Literal["URBAN", "TRAIN"]] = None
    city: Optional[str] = None
    mode: Optional[TransitMode] = None
    search: Optional[str] = None
