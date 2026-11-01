from typing import Generic, List, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int
    pageSize: int
    totalItems: int
    totalPages: int
    hasNext: bool
    hasPrev: bool

    model_config = ConfigDict(extra="ignore")


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    pagination: PaginationMeta

    model_config = ConfigDict(extra="ignore")
