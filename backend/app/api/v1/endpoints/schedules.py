import math
from typing import Any, List, Optional, Union
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.common import PaginatedResponse, PaginationMeta
from app.schemas.route_plan import TransitMode
from app.schemas.schedule import (
    ScheduleDetailResponse,
    SupportedCitiesResponse,
    TransitLineSchedule,
)
from app.services.schedule_service import schedule_service

router = APIRouter()


@router.get("", response_model=Union[PaginatedResponse[TransitLineSchedule], List[TransitLineSchedule]])
async def list_schedules(
    section: Optional[str] = Query(None, description="'URBAN' or 'TRAIN'"),
    city: Optional[str] = Query(None, description="City name (e.g. 'Galați', 'București')"),
    mode: Optional[TransitMode] = Query(None, description="Filter by transit mode"),
    search: Optional[str] = Query(None, description="Search query string"),
    page: Optional[int] = Query(None, ge=1, description="1-based page index"),
    pageSize: Optional[int] = Query(None, ge=1, le=100, description="Items per page")
) -> Any:
    """Fetch Romanian transit schedules and live departure estimates with optional standard pagination."""
    schedules = schedule_service.get_schedules(
        section=section,
        city=city,
        mode=mode,
        search=search
    )

    if page is not None or pageSize is not None:
        p = page or 1
        ps = pageSize or 20
        total_items = len(schedules)
        total_pages = math.ceil(total_items / ps) if total_items > 0 else 1
        start_idx = (p - 1) * ps
        end_idx = start_idx + ps
        data = schedules[start_idx:end_idx]
        pagination = PaginationMeta(
            page=p,
            pageSize=ps,
            totalItems=total_items,
            totalPages=total_pages,
            hasNext=(p < total_pages),
            hasPrev=(p > 1)
        )
        return PaginatedResponse[TransitLineSchedule](data=data, pagination=pagination)

    return schedules


@router.get("/cities", response_model=SupportedCitiesResponse)
async def list_supported_cities() -> Any:
    """Returns supported cities and coverage flags."""
    return SupportedCitiesResponse(cities=schedule_service.get_supported_cities())  # type: ignore


@router.get("/{schedule_id}", response_model=ScheduleDetailResponse)
async def get_schedule_details(schedule_id: str) -> Any:
    """Returns the complete list of stops with GPS coordinates and scheduled timetable departure matrices."""
    details = schedule_service.get_schedule_details(schedule_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule with ID '{schedule_id}' not found."
        )
    return details

