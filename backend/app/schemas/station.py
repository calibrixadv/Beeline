from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.route_plan import GeoPoint, TransitMode


class StationSearchResult(BaseModel):
    code: str
    name: str
    city: str
    modes: List[TransitMode]
    coordinates: GeoPoint

    model_config = ConfigDict(extra="ignore")


class StationSearchResponse(BaseModel):
    stations: List[StationSearchResult]


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
