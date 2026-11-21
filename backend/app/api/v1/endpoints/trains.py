from datetime import datetime
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth import MessageResponse
from app.schemas.common import PaginatedResponse
from app.schemas.route_plan import TrainItineraryResponse
from app.schemas.train import (
    OperatorsSummaryResponse,
    RailwayOperatorsResponse,
    TimetableStatusResponse,
    TimetableSyncResponse,
    TrainCreate,
    TrainJourney,
    TrainUpdate,
)
from app.services.operator_summary_service import operator_summary_service
from app.services.search_cache_service import search_cache_service, BUCHAREST_TZ
from app.services.timetable_sync_service import timetable_sync_service
from app.services.train_service import train_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[TrainJourney])
async def search_trains(
    response: Response,
    searchQuery: Optional[str] = Query(None, description="Search by train number, origin, or destination"),
    trainNumber: Optional[str] = Query(None, description="Search alias for train number"),
    train_number: Optional[str] = Query(None, description="Search alias for train number"),
    trainCode: Optional[str] = Query(None, description="Search alias for train code"),
    train_code: Optional[str] = Query(None, description="Search alias for train code"),
    q: Optional[str] = Query(None, description="General search query alias"),
    code: Optional[str] = Query(None, description="Search alias for train code"),
    status: Optional[str] = Query(None, description="Filter by status (e.g. ALL, ON_TIME, DELAYED, CANCELLED, BOARDING)"),
    operator: Optional[str] = Query(None, description="Filter by railway operator"),
    originCode: Optional[str] = Query(None, description="Origin station code (e.g. GLT, BCT)"),
    destinationCode: Optional[str] = Query(None, description="Destination station code (e.g. BSV, BCT)"),
    origin: Optional[str] = Query(None, description="Origin station name or code"),
    destination: Optional[str] = Query(None, description="Destination station name or code"),
    date: Optional[str] = Query(None, description="Travel date in YYYY-MM-DD format"),
    travel_date: Optional[str] = Query(None, description="Travel date alias in YYYY-MM-DD format"),
    maxPrice: Optional[float] = Query(None, description="Maximum price in LEI"),
    sortBy: str = Query("departure", description="Sort by 'departure', 'price', or 'duration'"),
    sortOrder: str = Query("asc", description="'asc' or 'desc'"),
    page: int = Query(1, ge=1, description="1-based page index"),
    pageSize: int = Query(20, ge=1, le=100, description="Items per page")
) -> Any:
    """Search Romanian rail journeys with status, tiered seat classes, amenities, and multi-operator fares."""
    effective_query = searchQuery or trainNumber or train_number or trainCode or train_code or q or code
    effective_date = travel_date or date

    cache_key = search_cache_service.compute_trains_search_key(
        search_query=effective_query,
        status_filter=status,
        operator_filter=operator,
        origin_code=originCode,
        destination_code=destinationCode,
        origin=origin,
        destination=destination,
        travel_date=effective_date,
        max_price=maxPrice,
        sort_by=sortBy,
        sort_order=sortOrder,
        page=page,
        page_size=pageSize,
    )
    cached = await search_cache_service.get_trains_search(cache_key)
    if cached is not None:
        cached_resp, source = cached
        if response is not None:
            response.headers["X-Beeline-Cache"] = "HIT"
            response.headers["X-Beeline-Cache-Source"] = source
        eff_date = effective_date or datetime.now(BUCHAREST_TZ).strftime("%Y-%m-%d")
        await search_cache_service.record_recent_train_search(
            origin=origin or originCode or effective_query or "All Trains",
            destination=destination or destinationCode or "",
            date=eff_date,
            cache_key=cache_key,
            result_count=len(cached_resp.data),
        )
        return cached_resp

    if response is not None:
        response.headers["X-Beeline-Cache"] = "MISS"
        response.headers["X-Beeline-Cache-Source"] = "origin"

    trains, pagination = train_service.get_trains(
        search_query=effective_query,
        status_filter=status,
        operator_filter=operator,
        origin_code=originCode,
        destination_code=destinationCode,
        origin=origin,
        destination=destination,
        travel_date=effective_date,
        max_price=maxPrice,
        sort_by=sortBy,
        sort_order=sortOrder,
        page=page,
        page_size=pageSize
    )
    bw = timetable_sync_service.get_booking_window()
    resp = PaginatedResponse[TrainJourney](data=trains, pagination=pagination, bookingWindow=bw)

    eff_date = effective_date or datetime.now(BUCHAREST_TZ).strftime("%Y-%m-%d")
    await search_cache_service.set_trains_search(
        cache_key=cache_key,
        response=resp,
        date_str=eff_date,
        origin=origin or originCode or "",
        destination=destination or destinationCode or "",
        query_display=effective_query or "",
    )
    return resp


@router.get("/timetable-status", response_model=TimetableStatusResponse)
async def get_timetable_status() -> Any:
    """Returns active Romanian railway timetable period, operator train counts, and bookingWindow metadata."""
    return timetable_sync_service.get_timetable_status()


@router.post("/sync-timetables", response_model=TimetableSyncResponse)
async def sync_timetables() -> Any:
    """Discovers and synchronizes 2026-2027 and active 2025-2026 XML timetables from data.gov.ro CKAN API."""
    return await timetable_sync_service.sync_timetables()


@router.post("", response_model=TrainJourney, status_code=status.HTTP_201_CREATED)
async def create_train(
    data: TrainCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Register a new scheduled train service."""
    return await train_service.create_train(data, db=db)


@router.get("/operators", response_model=RailwayOperatorsResponse)
async def list_railway_operators() -> Any:
    """Returns registered Romanian railway operators, live GTFS-RT feed health, and contact channels."""
    operators = train_service.list_operators()
    return RailwayOperatorsResponse(operators=operators)


@router.get("/operators-summary", response_model=OperatorsSummaryResponse)
async def get_operators_summary() -> Any:
    """Returns dynamic real-time summary of Romanian railway operators with train counts and unique routes."""
    return await operator_summary_service.get_live_operators_summary()


@router.get("/{train_number}/itinerary", response_model=TrainItineraryResponse)
async def get_train_itinerary(
    train_number: str,
    response: Response,
    date: Optional[str] = Query(None, description="Travel date in YYYY-MM-DD format"),
    travel_date: Optional[str] = Query(None, description="Travel date alias in YYYY-MM-DD format"),
) -> Any:
    """Returns the train's complete end-to-end commercial itinerary with all stops, times, and dwell minutes."""
    effective_date = travel_date or date
    cache_key = search_cache_service.compute_train_itinerary_key(train_number, effective_date)
    cached = await search_cache_service.get_train_itinerary(cache_key)
    if cached is not None:
        cached_resp, source = cached
        if response is not None:
            response.headers["X-Beeline-Cache"] = "HIT"
            response.headers["X-Beeline-Cache-Source"] = source
        return cached_resp

    if response is not None:
        response.headers["X-Beeline-Cache"] = "MISS"
        response.headers["X-Beeline-Cache-Source"] = "origin"

    itin = train_service.get_train_itinerary(train_number, effective_date)
    eff_date = effective_date or datetime.now(BUCHAREST_TZ).strftime("%Y-%m-%d")
    await search_cache_service.set_train_itinerary(cache_key, itin, eff_date)
    return itin


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


@router.patch("/{train_id}", response_model=TrainJourney)
async def update_train(
    train_id: str,
    data: TrainUpdate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Update train service status, delay minutes, carrier, or onboard amenities."""
    return await train_service.update_train(train_id, data, db=db)


@router.delete("/{train_id}", response_model=MessageResponse)
async def delete_train(
    train_id: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Delete a scheduled train journey."""
    await train_service.delete_train(train_id, db=db)
    return MessageResponse(message=f"Train journey '{train_id}' deleted successfully")
