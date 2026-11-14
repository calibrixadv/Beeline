from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth import MessageResponse
from app.schemas.disruption import (
    DisruptionCreate,
    DisruptionItem,
    DisruptionsResponse,
    DisruptionUpdate,
)
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


@router.post("", response_model=DisruptionItem, status_code=status.HTTP_201_CREATED)
async def create_disruption(
    data: DisruptionCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Report a new network delay, infrastructure maintenance, or transit incident."""
    return await disruption_service.create_disruption(data, db=db)


@router.get("/{disruption_id}", response_model=DisruptionItem)
async def get_disruption(disruption_id: str) -> Any:
    """Fetch disruption incident details by ID."""
    d = disruption_service.get_disruption_by_id(disruption_id)
    if not d:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Disruption incident with ID '{disruption_id}' not found."
        )
    return d


@router.patch("/{disruption_id}", response_model=DisruptionItem)
async def update_disruption(
    disruption_id: str,
    data: DisruptionUpdate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Update active disruption delay estimates, severity, or affected corridors."""
    return await disruption_service.update_disruption(disruption_id, data, db=db)


@router.delete("/{disruption_id}", response_model=MessageResponse)
async def delete_disruption(
    disruption_id: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Archive or remove a resolved transit disruption."""
    await disruption_service.delete_disruption(disruption_id, db=db)
    return MessageResponse(message=f"Disruption '{disruption_id}' deleted successfully")
