from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth import MessageResponse
from app.schemas.route_plan import TransitMode
from app.schemas.station import (
    StationBoardResponse,
    StationCreate,
    StationSearchResponse,
    StationSearchResult,
    StationUpdate,
)
from app.services.station_service import station_service

router = APIRouter()


@router.get("", response_model=List[StationSearchResult])
async def list_stations(
    city: Optional[str] = Query(None, description="Optional city filter"),
    mode: Optional[TransitMode] = Query(None, description="Optional transit mode filter"),
    limit: Optional[int] = Query(None, ge=1, le=100, description="Max stations to return")
) -> Any:
    """List all registered transit stations/nodes."""
    return station_service.list_all_stations(city=city, mode=mode, limit=limit)


@router.get("/search", response_model=StationSearchResponse)
async def search_stations(
    query: str = Query(..., description="Search term for station name or code (min 2 chars)"),
    limit: int = Query(10, ge=1, le=50, description="Max stations to return"),
    city: Optional[str] = Query(None, description="Optional city filter")
) -> Any:
    """Autocomplete station search across Romanian transit nodes."""
    stations = station_service.search_stations(query=query, limit=limit, city=city)
    return StationSearchResponse(stations=stations)


@router.get("/{station_code}", response_model=StationSearchResult)
async def get_station(station_code: str) -> Any:
    """Get station metadata and coordinates by station code."""
    st = station_service.get_station_by_code(station_code)
    if not st:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Station with code '{station_code}' not found."
        )
    return st


@router.post("", response_model=StationSearchResult, status_code=status.HTTP_201_CREATED)
async def create_station(
    data: StationCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Register a new transit station node."""
    return await station_service.create_station(data, db=db)


@router.patch("/{station_code}", response_model=StationSearchResult)
async def update_station(
    station_code: str,
    data: StationUpdate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Update station metadata, city, or GPS coordinates."""
    return await station_service.update_station(station_code, data, db=db)


@router.delete("/{station_code}", response_model=MessageResponse)
async def delete_station(
    station_code: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Delete a station node with Foreign Key dependency validation."""
    await station_service.delete_station(station_code, db=db)
    return MessageResponse(message=f"Station '{station_code}' deleted successfully")


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
