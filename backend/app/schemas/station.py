from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.route_plan import GeoPoint, TransitMode


class StationSearchResult(BaseModel):
    code: str
    name: str
    city: str
    modes: List[TransitMode]
    coordinates: GeoPoint
    dailyTrainCount: int = 0
    operators: List[str] = Field(default_factory=list)
    isMajorHub: bool = False

    model_config = ConfigDict(extra="ignore")


class WeeklyStationSyncMeta(BaseModel):
    isoWeek: str
    lastSyncedAt: str
    nextWeeklySyncAt: str
    totalStations: int
    source: str = "OFFLINE_XML_FALLBACK"
    schedule: str = "WEEKLY_MONDAY_00_05_RO"

    model_config = ConfigDict(extra="ignore")


class StationCreate(BaseModel):
    code: str
    name: str
    city: str
    modes: List[TransitMode] = [TransitMode.TRAIN]
    coordinates: GeoPoint
    dailyTrainCount: int = 0
    operators: List[str] = Field(default_factory=list)
    isMajorHub: bool = False

    model_config = ConfigDict(extra="ignore")


class StationUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    modes: Optional[List[TransitMode]] = None
    coordinates: Optional[GeoPoint] = None
    dailyTrainCount: Optional[int] = None
    operators: Optional[List[str]] = None
    isMajorHub: Optional[bool] = None

    model_config = ConfigDict(extra="ignore")


class StationSearchResponse(BaseModel):
    stations: List[StationSearchResult]
    weeklySync: Optional[WeeklyStationSyncMeta] = None

    model_config = ConfigDict(extra="ignore")


class StationAutocompleteCatalogResponse(BaseModel):
    stations: List[StationSearchResult]
    weeklySync: WeeklyStationSyncMeta

    model_config = ConfigDict(extra="ignore")


class StationBoardItem(BaseModel):
    trainNumber: str
    operator: str
    destination: str
    origin: str
    scheduledTime: str
    expectedTime: str
    delayMinutes: int = 0
    platform: Optional[str] = None
    status: Literal["ON_TIME", "DELAYED", "CANCELLED", "BOARDING"] = "ON_TIME"

    model_config = ConfigDict(extra="ignore")


class StationBoardResponse(BaseModel):
    station: StationSearchResult
    boardType: Literal["DEPARTURES", "ARRIVALS"]
    windowHours: int
    generatedAt: str
    items: List[StationBoardItem]

    model_config = ConfigDict(extra="ignore")
