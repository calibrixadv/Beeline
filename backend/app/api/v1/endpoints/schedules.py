from typing import Any, List, Optional
from fastapi import APIRouter, Query

from app.schemas.route_plan import TransitMode
from app.schemas.schedule import TransitLineSchedule
from app.services.schedule_service import schedule_service

router = APIRouter()


@router.get("", response_model=List[TransitLineSchedule])
async def list_schedules(
    section: Optional[str] = Query(None, description="'URBAN' or 'TRAIN'"),
    city: Optional[str] = Query(None, description="City name (e.g. 'Galați', 'București')"),
    mode: Optional[TransitMode] = Query(None, description="Filter by transit mode"),
    search: Optional[str] = Query(None, description="Search query string")
) -> Any:
    """Fetch Romanian transit schedules and live departure estimates."""
    return schedule_service.get_schedules(
        section=section,
        city=city,
        mode=mode,
        search=search
    )
