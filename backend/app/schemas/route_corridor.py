from typing import List
from pydantic import BaseModel, ConfigDict


class PopularCorridor(BaseModel):
    origin: str
    destination: str
    label: str
    frequency: str
    fastestDurationFormatted: str
    minFareLei: float
    primaryOperators: List[str]

    model_config = ConfigDict(extra="ignore")


class PopularCorridorsResponse(BaseModel):
    corridors: List[PopularCorridor]
