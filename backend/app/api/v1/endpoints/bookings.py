from typing import Any, Optional
from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.booking import (
    BookingResponse,
    CreateBookingRequest,
)
from app.schemas.common import PaginatedResponse
from app.services.booking_service import booking_service
from app.services.idempotency_service import IdempotencyService

router = APIRouter()


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: CreateBookingRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Reserve journey itinerary and issue passenger tickets with idempotency protection."""
    payload_hash = IdempotencyService.compute_hash(data.model_dump())

    if idempotency_key:
        cached = await IdempotencyService.claim_key(
            db,
            user_id=current_user.id,
            idempotency_key=idempotency_key,
            payload_hash=payload_hash
        )
        if cached:
            _, response_data = cached
            return BookingResponse.model_validate(response_data)

    try:
        booking = await booking_service.create_booking(db, current_user, data)

        if idempotency_key:
            await IdempotencyService.complete_key(
                db,
                user_id=current_user.id,
                idempotency_key=idempotency_key,
                payload_hash=payload_hash,
                response_code=201,
                response_data=booking.model_dump()
            )

        return booking
    except Exception:
        if idempotency_key:
            await IdempotencyService.release_key_on_error(db, current_user.id, idempotency_key)
        raise


@router.get("", response_model=PaginatedResponse[BookingResponse])
async def list_bookings(
    page: int = Query(1, ge=1, description="1-based page index"),
    pageSize: int = Query(10, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Optional booking status filter (e.g. CONFIRMED, CANCELLED)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Returns paginated list of active and archived traveler bookings."""
    bookings, pagination = await booking_service.list_bookings(
        db,
        user=current_user,
        page=page,
        page_size=pageSize,
        status_filter=status
    )
    return PaginatedResponse[BookingResponse](data=bookings, pagination=pagination)


@router.delete("/{booking_id}", response_model=BookingResponse)
async def cancel_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Idempotently cancel booking reservation."""
    return await booking_service.cancel_booking(db, user=current_user, booking_id=booking_id)
