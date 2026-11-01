from datetime import datetime, timezone
import json
import math
from typing import Any, List, Optional, Union
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_current_user
from app.core.database import get_db
from app.models.route import SavedRoute
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.common import PaginatedResponse, PaginationMeta
from app.schemas.route_corridor import PopularCorridorsResponse
from app.schemas.route_plan import (
    RoutePlanResponse,
    SaveRouteRequest,
    SavedRouteResponse,
    TransitRoutePlan,
    TransitRouteQuery,
)
from app.services.corridor_service import corridor_service
from app.services.idempotency_service import IdempotencyService
from app.services.routing_service import routing_service

router = APIRouter()


@router.get("/corridors/popular", response_model=PopularCorridorsResponse)
async def get_popular_corridors() -> Any:
    """Returns high-frequency Romanian transit corridors for quick one-tap search on homepage."""
    return PopularCorridorsResponse(corridors=corridor_service.get_popular_corridors())


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
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Save an itinerary to the user's travel wallet with idempotency support."""
    payload_hash = IdempotencyService.compute_hash(data.model_dump())
    if idempotency_key:
        cached = await IdempotencyService.claim_key(db, current_user.id, idempotency_key, payload_hash)
        if cached:
            _, response_data = cached
            return SavedRouteResponse.model_validate(response_data)

    try:
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

        resp = SavedRouteResponse(
            id=saved.id,
            origin_name=saved.origin_name,
            destination_name=saved.destination_name,
            plan=data.plan,
            created_at=saved.created_at.isoformat()
        )

        if idempotency_key:
            await IdempotencyService.complete_key(
                db,
                user_id=current_user.id,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                response_code=201,
                response_data=resp.model_dump()
            )

        return resp
    except Exception:
        if idempotency_key:
            await IdempotencyService.release_key_on_error(db, current_user.id, idempotency_key)
        raise



@router.get("/saved", response_model=Union[PaginatedResponse[SavedRouteResponse], List[SavedRouteResponse]])
async def list_saved_routes(
    page: Optional[int] = Query(None, ge=1, description="1-based page index"),
    pageSize: Optional[int] = Query(None, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieve saved itineraries for current user or guest with optional standard pagination."""
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

    if page is not None or pageSize is not None:
        p = page or 1
        ps = pageSize or 20
        total_items = len(response_items)
        total_pages = math.ceil(total_items / ps) if total_items > 0 else 1
        start_idx = (p - 1) * ps
        end_idx = start_idx + ps
        data = response_items[start_idx:end_idx]
        pagination = PaginationMeta(
            page=p,
            pageSize=ps,
            totalItems=total_items,
            totalPages=total_pages,
            hasNext=(p < total_pages),
            hasPrev=(p > 1)
        )
        return PaginatedResponse[SavedRouteResponse](data=data, pagination=pagination)

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
