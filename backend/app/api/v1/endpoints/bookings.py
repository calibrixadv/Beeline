import logging
from typing import Any, Optional
from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.booking import (
    BookingResponse,
    BookingUpdate,
    CreateBookingRequest,
)
from app.schemas.common import PaginatedResponse
from app.services.booking_service import booking_service
from app.services.email_service import email_service
from app.services.idempotency_service import IdempotencyService

logger = logging.getLogger(__name__)

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

        # Dispatch non-blocking booking confirmation email to logged-in user
        target_email = current_user.email or (str(data.contactEmail) if getattr(data, "contactEmail", None) else None)
        if target_email and "@" in target_email and not target_email.endswith("@guest.beeline.local") and not getattr(current_user, "is_guest", False):
            try:
                first_ticket = booking.tickets[0] if booking.tickets else None
                train_num = first_ticket.trainNumber if first_ticket else "IR 1572"
                orig = first_ticket.origin if first_ticket else "Origin"
                dest = first_ticket.destination if first_ticket else "Destination"
                dep = first_ticket.departureTime if first_ticket else booking.createdAt
                arr = first_ticket.arrivalTime if first_ticket else booking.createdAt
                p_name = first_ticket.passengerName if first_ticket else (current_user.full_name or "Traveler")

                await email_service.send_booking_confirmation_email(
                    to_email=target_email,
                    booking_reference=booking.bookingReference,
                    train_number=train_num,
                    origin=orig,
                    destination=dest,
                    departure_time=dep,
                    arrival_time=arr,
                    total_amount_lei=booking.totalAmountLei,
                    tickets_count=len(booking.tickets),
                    passenger_name=p_name
                )
            except Exception as exc:
                logger.warning(f"Failed to dispatch booking confirmation email: {exc}")

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


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieve details and tickets for a specific booking."""
    return await booking_service.get_booking_by_id(db, user=current_user, booking_id=booking_id)


@router.patch("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: str,
    data: BookingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Update passenger contact information or status for an existing booking."""
    return await booking_service.update_booking(db, user=current_user, booking_id=booking_id, data=data)


@router.delete("/{booking_id}", response_model=BookingResponse)
async def cancel_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Idempotently cancel booking reservation."""
    cancelled = await booking_service.cancel_booking(db, user=current_user, booking_id=booking_id)

    target_email = current_user.email or cancelled.contactEmail
    if target_email and "@" in target_email and not target_email.endswith("@guest.beeline.local") and not getattr(current_user, "is_guest", False):
        try:
            first_ticket = cancelled.tickets[0] if cancelled.tickets else None
            orig = first_ticket.origin if first_ticket else None
            dest = first_ticket.destination if first_ticket else None
            await email_service.send_booking_cancellation_email(
                to_email=target_email,
                booking_reference=cancelled.bookingReference,
                origin=orig,
                destination=dest
            )
        except Exception as exc:
            logger.warning(f"Failed to dispatch booking cancellation email: {exc}")

    return cancelled
