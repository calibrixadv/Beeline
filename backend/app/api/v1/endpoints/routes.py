from datetime import datetime, timezone
import json
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_current_user
from app.core.database import get_db
from app.models.route import SavedRoute
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.route_plan import (
    RoutePlanResponse,
    SaveRouteRequest,
    SavedRouteResponse,
    TransitRoutePlan,
    TransitRouteQuery,
)
from app.services.routing_service import routing_service

router = APIRouter()


@router.post("/plan", response_model=RoutePlanResponse)
async def plan_route(
    query: TransitRouteQuery,
    current_user: User = Depends(get_optional_current_user)
) -> Any:
    """
    Facilitates the standard TransitRoutePlan contract:
    Computes door-to-door multi-modal journeys across Romania and Europe with
    Romanian Transfer Shield risk scores and mascot companion recommendations.
    """
    plans = routing_service.plan_routes(query)
    recommended_id = plans[0].id if plans else ""

    return RoutePlanResponse(
        plans=plans,
        recommendedPlanId=recommended_id,
        query=query,
        generatedAt=datetime.now(timezone.utc).isoformat()
    )


@router.post("/saved", response_model=SavedRouteResponse, status_code=status.HTTP_201_CREATED)
async def save_route(
    data: SaveRouteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Save an itinerary to the user's travel wallet."""
    serialized = data.plan.model_dump_json()
    saved = SavedRoute(
        user_id=current_user.id,
        origin_name=data.plan.query.origin.name,
        destination_name=data.plan.query.destination.name,
        plan_data=serialized
    )
    db.add(saved)
    await db.commit()
    await db.refresh(saved)

    return SavedRouteResponse(
        id=saved.id,
        origin_name=saved.origin_name,
        destination_name=saved.destination_name,
        plan=data.plan,
        created_at=saved.created_at.isoformat()
    )


@router.get("/saved", response_model=List[SavedRouteResponse])
async def list_saved_routes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieve saved itineraries for current user or guest."""
    result = await db.execute(
        select(SavedRoute)
        .where(SavedRoute.user_id == current_user.id)
        .order_by(SavedRoute.created_at.desc())
    )
    routes = result.scalars().all()

    response_items = []
    for r in routes:
        try:
            plan_obj = TransitRoutePlan.model_validate_json(r.plan_data)
            response_items.append(SavedRouteResponse(
                id=r.id,
                origin_name=r.origin_name,
                destination_name=r.destination_name,
                plan=plan_obj,
                created_at=r.created_at.isoformat()
            ))
        except Exception:
            continue

    return response_items


@router.delete("/saved/{route_id}", response_model=MessageResponse)
async def delete_saved_route(
    route_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Delete a saved itinerary."""
    result = await db.execute(
        select(SavedRoute).where(
            SavedRoute.id == route_id,
            SavedRoute.user_id == current_user.id
        )
    )
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved route not found")

    await db.delete(route)
    await db.commit()
    return MessageResponse(message="Saved route removed")
