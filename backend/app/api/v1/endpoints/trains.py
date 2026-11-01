from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.common import PaginatedResponse
from app.schemas.train import (
    RailwayOperatorsResponse,
    TrainJourney,
)
from app.services.train_service import train_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[TrainJourney])
async def search_trains(
    searchQuery: Optional[str] = Query(None, description="Search by train number, origin, or destination"),
    status: Optional[str] = Query(None, description="Filter by status (e.g. ALL, ON_TIME, DELAYED, CANCELLED, BOARDING)"),
    operator: Optional[str] = Query(None, description="Filter by railway operator"),
    originCode: Optional[str] = Query(None, description="Origin station code (e.g. GLT, BCT)"),
    destinationCode: Optional[str] = Query(None, description="Destination station code (e.g. BSV, BCT)"),
    date: Optional[str] = Query(None, description="Travel date in YYYY-MM-DD format"),
    maxPrice: Optional[float] = Query(None, description="Maximum price in LEI"),
    sortBy: str = Query("departure", description="Sort by 'departure', 'price', or 'duration'"),
    sortOrder: str = Query("asc", description="'asc' or 'desc'"),
    page: int = Query(1, ge=1, description="1-based page index"),
    pageSize: int = Query(20, ge=1, le=100, description="Items per page")
) -> Any:
    """Search Romanian rail journeys with status, tiered seat classes, amenities, and multi-operator fares."""
    trains, pagination = train_service.get_trains(
        search_query=searchQuery,
        status_filter=status,
        operator_filter=operator,
        origin_code=originCode,
        destination_code=destinationCode,
        travel_date=date,
        max_price=maxPrice,
        sort_by=sortBy,
        sort_order=sortOrder,
        page=page,
        page_size=pageSize
    )
    return PaginatedResponse[TrainJourney](data=trains, pagination=pagination)


@router.get("/operators", response_model=RailwayOperatorsResponse)
async def list_railway_operators() -> Any:
    """Returns registered Romanian railway operators, live GTFS-RT feed health, and contact channels."""
    operators = train_service.list_operators()
    return RailwayOperatorsResponse(operators=operators)


@router.get("/{train_id}", response_model=TrainJourney)
async def get_train_details(train_id: str) -> Any:
    """Returns real-time stop-by-stop live updates, actual versus scheduled arrival times, and platform assignments."""
    train = train_service.get_train_by_id(train_id)
    if not train:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Train journey with ID '{train_id}' not found."
        )
    return train
