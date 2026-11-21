from datetime import datetime, timezone
import logging
import math
from typing import Any, List, Optional, Union
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
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
    BookingWindowInfo,
    CacheStats,
    LocationQuery,
    RecentSearchItem,
    RecentSearchesResponse,
    RoutePlanResponse,
    SaveRouteRequest,
    SavedRouteResponse,
    SavedRouteUpdate,
    TransitRoutePlan,
    TransitRouteQuery,
)
from app.services.corridor_service import corridor_service
from app.services.email_service import email_service
from app.services.idempotency_service import IdempotencyService
from app.services.routing_service import routing_service
from app.services.search_cache_service import search_cache_service
from app.services.timetable_sync_service import timetable_sync_service
from app.schemas.train import TrainFare, TrainJourney, TrainStation, TrainStatus, TrainStop
from app.services.train_service import _scrape_record_to_train_journey
from app.services.trip_fingerprint import compute_trip_fingerprint_from_plan
from app.services.trip_notification_service import user_allows_email_notifications
from scraper.collectors.train_api import (
    InfoFerLiveAdapter,
    canonical_station_code,
    normalize_train_number,
    resolve_known_station,
    to_bucharest_iso,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/corridors/popular", response_model=PopularCorridorsResponse)
async def get_popular_corridors() -> Any:
    """Returns high-frequency Romanian transit corridors for quick one-tap search on homepage."""
    return PopularCorridorsResponse(corridors=corridor_service.get_popular_corridors())


@router.get("/recent-searches", response_model=RecentSearchesResponse)
async def get_recent_route_searches(
    limit: int = Query(10, ge=1, le=25, description="Number of recent searches to return (max 25)")
) -> Any:
    """Returns recent route searches from Redis and cache hit/miss statistics."""
    recent = await search_cache_service.get_recent_route_searches(limit=limit)
    stats = await search_cache_service.get_cache_stats()
    return RecentSearchesResponse(
        recentSearches=[RecentSearchItem(**item) for item in recent],
        stats=CacheStats(**stats),
    )


@router.get("/plan", response_model=RoutePlanResponse)
async def plan_route_get(
    response: Response,
    origin: str = Query(..., description="Origin city or station name"),
    destination: str = Query(..., description="Destination city or station name"),
    date: Optional[str] = Query(None, description="Optional ISO travel date (YYYY-MM-DD)"),
    maxTransfers: Optional[int] = Query(None, ge=0, description="Max allowed transfers (0=direct only, 1=max 1 transfer, etc.)"),
    current_user: User = Depends(get_optional_current_user)
) -> Any:
    """GET query variant of /plan for rapid browser navigation and prefetching."""
    bw = timetable_sync_service.get_booking_window()
    min_date = bw["minDate"]
    max_date = bw["maxDate"]
    travel_date = date if date else min_date

    if travel_date < min_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Cannot plan or book a trip in the past. Please choose a date from today onward."
        )
    if travel_date > max_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Travel date '{travel_date}' is outside the booking window ({min_date} to {max_date}). Please choose a date within 90 days."
        )

    q = TransitRouteQuery(
        origin=LocationQuery(name=origin, city=origin),
        destination=LocationQuery(name=destination, city=destination),
        departureTime=f"{travel_date}T08:00:00+02:00",
        allowedModes=["TRAIN"],
        maxTransfers=maxTransfers,
    )
    return await plan_route(query=q, response=response, current_user=current_user)


@router.post("/plan", response_model=RoutePlanResponse)
async def plan_route(
    query: TransitRouteQuery,
    response: Response,
    current_user: User = Depends(get_optional_current_user)
) -> Any:
    """
    Facilitates the standard TransitRoutePlan contract:
    Computes door-to-door multi-modal journeys across Romania and Europe with
    Romanian Transfer Shield risk scores and mascot companion recommendations.
    Validates provider booking window [minDate, maxDate].
    """
    bw = timetable_sync_service.get_booking_window()
    min_date = bw["minDate"]
    max_date = bw["maxDate"]

    if query.departureTime:
        date_str = query.departureTime[:10]
        if date_str < min_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Cannot plan or book a trip in the past. Please choose a date from today onward."
            )
        if date_str > max_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Travel date '{date_str}' is outside the booking window ({min_date} to {max_date}). Please choose a date within 90 days."
            )
    else:
        query.departureTime = f"{min_date}T08:00:00+02:00"
        date_str = min_date

    orig_q = query.origin.name or query.origin.city or ""
    dest_q = query.destination.name or query.destination.city or ""
    om = resolve_known_station(orig_q)
    dm = resolve_known_station(dest_q)
    eff_orig = om.name if om else orig_q
    eff_dest = dm.name if dm else dest_q

    # Search Cache Check
    cache_key = search_cache_service.compute_route_plan_key(query)
    cached_entry = await search_cache_service.get_route_plan(cache_key)
    if cached_entry is not None:
        cached_resp, source = cached_entry
        if response is not None:
            response.headers["X-Beeline-Cache"] = "HIT"
            response.headers["X-Beeline-Cache-Source"] = source
        await search_cache_service.record_recent_route_search(
            origin=eff_orig,
            destination=eff_dest,
            date=date_str,
            cache_key=cache_key,
            result_count=cached_resp.totalDayRoutes,
        )
        return cached_resp

    if response is not None:
        response.headers["X-Beeline-Cache"] = "MISS"
        response.headers["X-Beeline-Cache-Source"] = "origin"

    plans = await routing_service.plan_routes(query)
    if query.maxTransfers is not None:
        plans = [p for p in plans if p.transfersCount <= query.maxTransfers]
    recommended_id = plans[0].id if plans else None
    om = resolve_known_station(orig_q)
    dm = resolve_known_station(dest_q)
    eff_orig = om.name if om else orig_q
    eff_dest = dm.name if dm else dest_q
    date_str = query.departureTime[:10] if query.departureTime else min_date
    if plans:
        infofer_adapter = InfoFerLiveAdapter.get_shared_instance()
        direct_recs = infofer_adapter.fetch_itinerary_sync(eff_orig, eff_dest, date_str=date_str) or []
        rec_map = {}
        for r in direct_recs:
            is_r_multi = (
                getattr(r, "is_multi_leg", False)
                or (getattr(r, "transfer_legs", None) and len(r.transfer_legs) > 1)
                or ("+" in r.source_train_api.train_number)
                or ("->" in r.source_train_api.train_number)
                or ("/" in r.source_train_api.train_number and any(c.isdigit() for c in r.source_train_api.train_number.split("/")[0]) and any(c.isdigit() for c in r.source_train_api.train_number.split("/")[1]))
            )
            if not is_r_multi:
                rec_map[normalize_train_number(r.source_train_api.train_number)] = r

        all_day_deps = []
        seen_all_day_keys = set()
        for p in plans:
            is_p_multi = (
                (p.transfersCount is not None and p.transfersCount > 0)
                or (len(p.legs) > 1)
                or (p.transfers and len(p.transfers) > 0)
                or any("+" in (l.names.lineCode or "") or "->" in (l.names.lineCode or "") for l in p.legs)
            )
            if is_p_multi:
                continue

            tj = None
            if p.legs:
                first_line = normalize_train_number(p.legs[0].names.lineCode or "")
                matched_rec = rec_map.get(first_line)
                if matched_rec:
                    tj = _scrape_record_to_train_journey(matched_rec, date_str)
            if not tj and p.legs:
                first_leg = p.legs[0]
                t_num = first_leg.names.lineCode or "TRAIN"
                if "+" in t_num or "->" in t_num:
                    continue
                stops_data = [
                    TrainStop(
                        stopNumber=s.stopSequence,
                        station=TrainStation(code=s.stationCode, name=s.stationName, city=s.city or s.stationName),
                        scheduledArrival=to_bucharest_iso(s.arrivalTime, date_str),
                        scheduledDeparture=to_bucharest_iso(s.departureTime, date_str),
                        platform=s.platform or "1"
                    )
                    for s in (p.legs[0].stops or [])
                ]
                tj = TrainJourney(
                    id=f"tr-{p.id}",
                    trainNumber=t_num,
                    operator=first_leg.names.operatorName or "CFR Călători",
                    origin=TrainStation(code=canonical_station_code(first_leg.names.originName), name=first_leg.names.originName, city=first_leg.names.originCity or first_leg.names.originName, platform="1"),
                    destination=TrainStation(code=canonical_station_code(first_leg.names.destinationName), name=first_leg.names.destinationName, city=first_leg.names.destinationCity or first_leg.names.destinationName, platform="2"),
                    departureTime=to_bucharest_iso(p.departureTime, date_str) or p.departureTime,
                    arrivalTime=to_bucharest_iso(p.arrivalTime, date_str) or p.arrivalTime,
                    durationMinutes=p.totalDurationMinutes,
                    durationFormatted=f"{p.totalDurationMinutes // 60}h {p.totalDurationMinutes % 60}m",
                    status="ON_TIME",
                    delayMinutes=first_leg.timings.delayMinutes or 0,
                    carbonFootprintKg=p.eco.routeEmissionsKgCO2 if p.eco else 12.0,
                    amenities=["POWER_OUTLETS", "WHEELCHAIR_ACCESSIBLE"],
                    fares=[
                        TrainFare(classType="STANDARD", price=p.fare.totalAmountLei, currency="RON", seatsAvailable=50)
                    ] if p.fare else [],
                    stops=stops_data
                )
            if tj and not ("+" in tj.trainNumber or "->" in tj.trainNumber):
                t_key = (normalize_train_number(tj.trainNumber), tj.departureTime)
                if t_key not in seen_all_day_keys:
                    seen_all_day_keys.add(t_key)
                    all_day_deps.append(tj)
    else:
        all_day_deps = []

    bw["liveSource"] = "INFOFER_LIVE_ONLY"

    resp = RoutePlanResponse(
        plans=plans,
        recommendedPlanId=recommended_id,
        query=query,
        generatedAt=datetime.now(timezone.utc).isoformat(),
        bookingWindow=BookingWindowInfo(**bw),
        allDayDepartures=all_day_deps,
        totalDayRoutes=len(plans),
    )

    await search_cache_service.set_route_plan(
        cache_key=cache_key,
        response=resp,
        date_str=date_str,
        origin=eff_orig,
        destination=eff_dest,
    )

    return resp


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
        # Strict zero-duplicate physical journey deduplication
        incoming_fp = compute_trip_fingerprint_from_plan(data.plan)
        existing_result = await db.execute(
            select(SavedRoute)
            .where(SavedRoute.user_id == current_user.id)
            .order_by(SavedRoute.created_at.desc())
        )
        existing_routes = existing_result.scalars().all()
        for existing in existing_routes:
            try:
                existing_plan = TransitRoutePlan.model_validate_json(existing.plan_data)
                existing_fp = compute_trip_fingerprint_from_plan(existing_plan)
                if existing_fp == incoming_fp:
                    # Idempotent match: return existing SavedRoute record without inserting duplicate
                    resp = SavedRouteResponse(
                        id=existing.id,
                        origin_name=existing.origin_name,
                        destination_name=existing.destination_name,
                        plan=existing_plan,
                        notes=existing.notes,
                        alertMuted=getattr(existing, "alert_muted", False),
                        alertLeadMinutes=getattr(existing, "alert_lead_minutes", 30),
                        created_at=existing.created_at.isoformat()
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
            except Exception as parse_err:
                logger.warning(f"Failed parsing saved route {existing.id} plan_data: {parse_err}")
                continue

        serialized = data.plan.model_dump_json()
        saved = SavedRoute(
            user_id=current_user.id,
            origin_name=data.plan.query.origin.name,
            destination_name=data.plan.query.destination.name,
            plan_data=serialized,
            notes=data.notes,
            alert_muted=bool(data.alertMuted) if data.alertMuted is not None else False,
            alert_lead_minutes=data.alertLeadMinutes if data.alertLeadMinutes is not None else 30
        )
        db.add(saved)
        await db.commit()
        await db.refresh(saved)

        resp = SavedRouteResponse(
            id=saved.id,
            origin_name=saved.origin_name,
            destination_name=saved.destination_name,
            plan=data.plan,
            notes=saved.notes,
            alertMuted=saved.alert_muted,
            alertLeadMinutes=saved.alert_lead_minutes,
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

        if user_allows_email_notifications(current_user):
            try:
                await email_service.send_saved_trip_confirmation_email(
                    to_email=current_user.email,
                    origin=saved.origin_name,
                    destination=saved.destination_name,
                    departure_time=str(data.plan.departureTime),
                    train_summary=data.plan.summary
                )
            except Exception as exc:
                logger.warning(f"Failed to dispatch saved trip confirmation email: {exc}")

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
                notes=r.notes,
                alertMuted=getattr(r, "alert_muted", False),
                alertLeadMinutes=getattr(r, "alert_lead_minutes", 30),
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


@router.patch("/saved/{route_id}", response_model=SavedRouteResponse)
async def update_saved_route(
    route_id: str,
    update_data: SavedRouteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Update a saved itinerary label, destination, plan details, or alert preferences."""
    result = await db.execute(select(SavedRoute).where(SavedRoute.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved route not found")
    if route.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this saved route")

    if update_data.origin_name is not None:
        route.origin_name = update_data.origin_name
    if update_data.destination_name is not None:
        route.destination_name = update_data.destination_name
    if update_data.plan is not None:
        route.plan_data = update_data.plan.model_dump_json()
    if update_data.notes is not None:
        route.notes = update_data.notes
    if update_data.alertMuted is not None:
        route.alert_muted = update_data.alertMuted
    if update_data.alertLeadMinutes is not None:
        route.alert_lead_minutes = update_data.alertLeadMinutes

    await db.commit()
    await db.refresh(route)

    plan_obj = TransitRoutePlan.model_validate_json(route.plan_data)
    return SavedRouteResponse(
        id=route.id,
        origin_name=route.origin_name,
        destination_name=route.destination_name,
        plan=plan_obj,
        notes=route.notes,
        alertMuted=route.alert_muted,
        alertLeadMinutes=route.alert_lead_minutes,
        created_at=route.created_at.isoformat()
    )


@router.delete("/saved/{route_id}", response_model=MessageResponse)
async def delete_saved_route(
    route_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Delete a saved itinerary."""
    result = await db.execute(select(SavedRoute).where(SavedRoute.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved route not found")
    if route.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this saved route")

    await db.delete(route)
    await db.commit()
    return MessageResponse(message="Saved route removed")
