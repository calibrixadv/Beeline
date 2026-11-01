from typing import Any, Optional
from fastapi import APIRouter, Query

from app.schemas.disruption import DisruptionsResponse
from app.services.disruption_service import disruption_service

router = APIRouter()


@router.get("", response_model=DisruptionsResponse)
async def list_disruptions(
    severity: Optional[str] = Query(None, description="Filter by severity: INFO, WARNING, CRITICAL, or ALL"),
    operator: Optional[str] = Query(None, description="Filter by operating carrier"),
    line: Optional[str] = Query(None, description="Filter by affected line code")
) -> Any:
    """Fetch active network disruptions with severity and affected transit corridors."""
    disruptions = disruption_service.get_disruptions(
        severity=severity,
        operator=operator,
        line=line
    )
    return DisruptionsResponse(disruptions=disruptions)
