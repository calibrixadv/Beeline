from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict


class DisruptionItem(BaseModel):
    id: str
    operator: str
    severity: Literal["INFO", "WARNING", "CRITICAL"]
    headline: str
    description: str
    estimatedDelayMinutes: Optional[int] = None
    affectedLines: List[str]
    startsAt: str
    endsAt: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class DisruptionCreate(BaseModel):
    id: Optional[str] = None
    operator: str
    severity: Literal["INFO", "WARNING", "CRITICAL"] = "WARNING"
    headline: str
    description: str
    estimatedDelayMinutes: Optional[int] = None
    affectedLines: List[str]
    startsAt: Optional[str] = None
    endsAt: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class DisruptionUpdate(BaseModel):
    operator: Optional[str] = None
    severity: Optional[Literal["INFO", "WARNING", "CRITICAL"]] = None
    headline: Optional[str] = None
    description: Optional[str] = None
    estimatedDelayMinutes: Optional[int] = None
    affectedLines: Optional[List[str]] = None
    endsAt: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class DisruptionsResponse(BaseModel):
    disruptions: List[DisruptionItem]
