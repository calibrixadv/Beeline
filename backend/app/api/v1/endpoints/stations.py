from typing import Any, Optional
from fastapi import APIRouter, Query

from app.schemas.station import (
    StationBoardResponse,
    StationSearchResponse,
)
from app.services.station_service import station_service

router = APIRouter()


@router.get("/search", response_model=StationSearchResponse)
async def search_stations(
    query: str = Query(..., description="Search term for station name or code (min 2 chars)"),
    limit: int = Query(10, ge=1, le=50, description="Max stations to return"),
    city: Optional[str] = Query(None, description="Optional city filter")
) -> Any:
    """Autocomplete station search across Romanian transit nodes."""
    stations = station_service.search_stations(query=query, limit=limit, city=city)
    return StationSearchResponse(stations=stations)


@router.get("/{station_code}/board", response_model=StationBoardResponse)
async def get_station_board(
    station_code: str,
    type: str = Query("DEPARTURES", description="'DEPARTURES' or 'ARRIVALS'"),
    windowHours: int = Query(2, ge=1, le=24, description="Hours window forward")
) -> Any:
    """Live station departure / arrival board with delays and platform assignments."""
    return station_service.get_station_board(
        station_code=station_code,
        board_type=type,
        window_hours=windowHours
    )
