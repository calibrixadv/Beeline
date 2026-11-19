from datetime import datetime, timedelta, timezone
import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.booking import Booking
from app.models.route import SavedRoute
from app.models.user import User
from app.services.email_service import email_service
from app.services.trip_notification_service import (
    get_user_reminder_window,
    parse_dt_safe,
    trip_notification_service,
    user_allows_email_notifications,
)

logger = logging.getLogger(__name__)

router = APIRouter()


class TestDepartureAlertRequest(BaseModel):
    trainNumber: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    departureTime: Optional[str] = None
    delayMinutes: Optional[int] = Field(default=0, ge=0)


class NotificationStatusResponse(BaseModel):
    emailNotificationsEnabled: bool
    departureReminderMinutes: int
    emailMode: str
    mailpitWebUrl: Optional[str] = None
    sentCount: int


class TestDepartureAlertResponse(BaseModel):
    message: str
    recipientEmail: str
    trainNumber: str
    origin: str
    destination: str
    departureTime: str
    delayMinutes: int


@router.get("/status", response_model=NotificationStatusResponse)
async def get_notification_status(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve the current user's email notification preferences, delivery mode, and outbox telemetry."""
    email_enabled = True
    reminder_mins = int(getattr(settings, "TRIP_REMINDER_WINDOW_MINUTES", 60))

    if current_user.preferences:
        try:
            prefs = json.loads(current_user.preferences)
            if isinstance(prefs, dict):
                email_enabled = prefs.get("email_notifications", True)
                if "departure_reminder_minutes" in prefs:
                    reminder_mins = int(prefs["departure_reminder_minutes"])
        except Exception:
            pass

    email_mode = getattr(settings, "EMAIL_MODE", "dev_sink")
    smtp_host = getattr(settings, "SMTP_HOST", "localhost")

    mailpit_url: Optional[str] = None
    if email_mode in ("smtp", "dev_sink") and smtp_host in ("localhost", "127.0.0.1", "mailpit"):
        mailpit_url = "http://localhost:8025"

    sent_count = len(email_service.get_outbox())

    return NotificationStatusResponse(
        emailNotificationsEnabled=email_enabled,
        departureReminderMinutes=reminder_mins,
        emailMode=email_mode,
        mailpitWebUrl=mailpit_url,
        sentCount=sent_count
    )


@router.post("/test-departure-alert", response_model=TestDepartureAlertResponse)
async def send_test_departure_alert(
    body: Optional[TestDepartureAlertRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Sends an immediate test departure alert email to the authenticated non-guest user.
    Uses custom payload if supplied, else picks the user's next booking/saved route,
    falling back to IR 1572 București Nord -> Brașov departing in 45 min.
    """
    if current_user.is_guest:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sign in with an email account to receive train departure emails."
        )

    if not current_user.email or current_user.email.endswith("@guest.beeline.local") or "@" not in current_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have a valid registered email address."
        )

    train_num = body.trainNumber if body and body.trainNumber else None
    origin = body.origin if body and body.origin else None
    destination = body.destination if body and body.destination else None
    departure_time = body.departureTime if body and body.departureTime else None
    delay_minutes = (body.delayMinutes if body and body.delayMinutes is not None else 0)

    # If missing required fields, inspect the user's next booking
    if not (train_num and origin and destination and departure_time):
        bkg_stmt = (
            select(Booking)
            .where(Booking.user_id == current_user.id, Booking.status == "CONFIRMED")
            .options(selectinload(Booking.tickets))
            .order_by(Booking.created_at.desc())
        )
        bkg_res = await db.execute(bkg_stmt)
        latest_bkg = bkg_res.scalars().first()
        if latest_bkg and latest_bkg.tickets:
            t = latest_bkg.tickets[0]
            train_num = train_num or t.train_number
            origin = origin or t.origin
            destination = destination or t.destination
            departure_time = departure_time or t.departure_time

    # If still missing, inspect saved routes
    if not (train_num and origin and destination and departure_time):
        s_stmt = (
            select(SavedRoute)
            .where(SavedRoute.user_id == current_user.id)
            .order_by(SavedRoute.created_at.desc())
        )
        s_res = await db.execute(s_stmt)
        latest_saved = s_res.scalars().first()
        if latest_saved:
            origin = origin or latest_saved.origin_name
            destination = destination or latest_saved.destination_name
            try:
                plan = json.loads(latest_saved.plan_data)
                departure_time = departure_time or plan.get("departureTime")
                legs = plan.get("legs", [])
                if legs:
                    train_num = train_num or legs[0].get("trainNumber") or legs[0].get("lineCode")
            except Exception:
                pass

    # Fallback to realistic standard train
    now = datetime.now(timezone.utc)
    train_num = train_num or "IR 1572"
    origin = origin or "București Nord"
    destination = destination or "Brașov"
    if not departure_time:
        departure_time = (now + timedelta(minutes=45)).strftime("%Y-%m-%dT%H:%M:%S+02:00")

    dep_dt = parse_dt_safe(departure_time) or (now + timedelta(minutes=45))
    minutes_until = max(1, int((dep_dt - now).total_seconds() / 60))

    try:
        await email_service.send_train_departure_reminder_email(
            to_email=current_user.email,
            train_number=train_num,
            origin=origin,
            destination=destination,
            departure_time=departure_time,
            minutes_until_departure=minutes_until,
            platform="Linia 1" if "Nord" in origin else None,
            delay_minutes=delay_minutes,
            transfer_note=None,
            user_name=current_user.full_name
        )
    except Exception as exc:
        logger.error(f"Failed to dispatch test departure email: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {exc}"
        )

    return TestDepartureAlertResponse(
        message="Test departure email sent successfully",
        recipientEmail=current_user.email,
        trainNumber=train_num,
        origin=origin,
        destination=destination,
        departureTime=departure_time,
        delayMinutes=delay_minutes
    )


@router.post("/dispatch-due")
async def dispatch_due_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, int]:
    """Manually triggers check_and_dispatch_upcoming_departures for verification and testing."""
    return await trip_notification_service.check_and_dispatch_upcoming_departures(db)
