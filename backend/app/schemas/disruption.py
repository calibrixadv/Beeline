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


class DisruptionsResponse(BaseModel):
    disruptions: List[DisruptionItem]
