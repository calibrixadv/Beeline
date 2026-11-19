import asyncio
from datetime import datetime, timedelta, timezone
import json
import logging
import os
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.redis import get_redis
from app.models.booking import Booking, Ticket
from app.models.route import SavedRoute
from app.models.user import User
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

# Fallback in-memory deduplication set for offline / test environments
_sent_dedup_set: Set[str] = set()

_scheduler_stop_event: Optional[asyncio.Event] = None
_scheduler_task: Optional[asyncio.Task] = None


def parse_dt_safe(val: Any) -> Optional[datetime]:
    """Safely parse various datetime representations into UTC datetime."""
    if not val:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val.astimezone(timezone.utc)
    if isinstance(val, str):
        val = val.strip()
        try:
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except Exception:
            pass
        # Common alternative format: YYYY-MM-DD HH:MM:SS
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
            try:
                dt = datetime.strptime(val, fmt)
                return dt.replace(tzinfo=timezone.utc)
            except Exception:
                continue
    return None


def user_allows_email_notifications(user: User) -> bool:
    """
    Returns True if user is eligible and has not opted out of email departure notifications.
    Returns False if user is guest, inactive, or has an invalid/guest email.
    """
    if getattr(user, "is_guest", False):
        return False
    if not getattr(user, "is_active", True):
        return False
    if not user.email or user.email.endswith("@guest.beeline.local") or "@" not in user.email:
        return False

    prefs_str = getattr(user, "preferences", None)
    if prefs_str:
        try:
            prefs = json.loads(prefs_str)
            if isinstance(prefs, dict) and prefs.get("email_notifications") is False:
                return False
        except Exception:
            pass

    return True


def get_user_reminder_window(user: User) -> int:
    """Returns the user's departure reminder window in minutes (clamped to 10..240)."""
    default_window = int(getattr(settings, "TRIP_REMINDER_WINDOW_MINUTES", 60))
    prefs_str = getattr(user, "preferences", None)
    if prefs_str:
        try:
            prefs = json.loads(prefs_str)
            if isinstance(prefs, dict) and "departure_reminder_minutes" in prefs:
                val = int(prefs["departure_reminder_minutes"])
                return max(10, min(240, val))
        except Exception:
            pass
    return max(10, min(240, default_window))


async def _is_dedup_sent(key: str) -> bool:
    """Check if notification key has already been dispatched in Redis or in-memory set."""
    if key in _sent_dedup_set:
        return True
    try:
        redis = get_redis()
        val = await redis.get(key)
        if val:
            _sent_dedup_set.add(key)
            return True
    except Exception:
        pass
    return False


async def _mark_dedup_sent(key: str, ttl_seconds: int = 86400) -> None:
    """Mark notification key as dispatched for 24h."""
    _sent_dedup_set.add(key)
    try:
        redis = get_redis()
        await redis.set(key, "1", ex=ttl_seconds)
    except Exception:
        pass


async def clear_dedup_cache() -> None:
    """Clears both the in-memory deduplication cache and Redis notification keys."""
    _sent_dedup_set.clear()
    try:
        redis = get_redis()
        keys = await redis.keys("beeline:notif:*")
        if keys:
            await redis.delete(*keys)
    except Exception:
        pass


class TripNotificationService:
    """
    Service responsible for querying upcoming passenger journeys (Bookings & SavedRoutes)
    and dispatching pre-departure reminders and delay notifications.
    """

    @staticmethod
    async def check_and_dispatch_upcoming_departures(
        db: AsyncSession,
        now: Optional[datetime] = None
    ) -> Dict[str, int]:
        """
        Scans all confirmed bookings and saved routes for active non-guest users
        departing within their configured reminder window [now, now + window_minutes].
        """
        now = now or datetime.now(timezone.utc)
        stats = {
            "checked": 0,
            "sent": 0,
            "skipped_duplicate": 0,
            "skipped_opted_out": 0
        }

        # 1. Fetch all active non-guest users
        users_stmt = select(User).where(
            User.is_guest.is_(False),
            User.is_active.is_(True),
            User.account_status == "ACTIVE"
        )
        res = await db.execute(users_stmt)
        active_users = res.scalars().all()

        for user in active_users:
            if not user_allows_email_notifications(user):
                stats["skipped_opted_out"] += 1
                continue

            window_mins = get_user_reminder_window(user)
            window_end = now + timedelta(minutes=window_mins)

            # 2. Check Upcoming Bookings (CONFIRMED)
            bkg_stmt = select(Booking).where(
                Booking.user_id == user.id,
                Booking.status == "CONFIRMED"
            ).options(selectinload(Booking.tickets))
            bkg_res = await db.execute(bkg_stmt)
            bookings = bkg_res.scalars().all()

            for bkg in bookings:
                stats["checked"] += 1
                for ticket in bkg.tickets:
                    dep_dt = parse_dt_safe(ticket.departure_time)
                    if not dep_dt:
                        continue

                    if now <= dep_dt <= window_end:
                        mins_until = max(1, int((dep_dt - now).total_seconds() / 60))
                        trip_ref = f"bkg_{bkg.booking_reference}_{ticket.train_number}"
                        dedup_key = f"beeline:notif:sent:{user.id}:{trip_ref}:departure"

                        if await _is_dedup_sent(dedup_key):
                            stats["skipped_duplicate"] += 1
                        else:
                            await _mark_dedup_sent(dedup_key, ttl_seconds=86400)
                            platform_str = "Linia 1" if "Nord" in ticket.origin else None
                            try:
                                await email_service.send_train_departure_reminder_email(
                                    to_email=user.email,
                                    train_number=ticket.train_number,
                                    origin=ticket.origin,
                                    destination=ticket.destination,
                                    departure_time=ticket.departure_time,
                                    minutes_until_departure=mins_until,
                                    platform=platform_str,
                                    delay_minutes=0,
                                    transfer_note=None,
                                    user_name=user.full_name
                                )
                                stats["sent"] += 1
                            except Exception as exc:
                                logger.error(f"Error sending departure reminder for booking {bkg.booking_reference}: {exc}")

            # 3. Check Upcoming Saved Routes
            saved_stmt = select(SavedRoute).where(SavedRoute.user_id == user.id)
            saved_res = await db.execute(saved_stmt)
            saved_routes = saved_res.scalars().all()

            for s_route in saved_routes:
                stats["checked"] += 1
                try:
                    plan_data = json.loads(s_route.plan_data)
                except Exception:
                    continue

                dep_val = plan_data.get("departureTime")
                legs = plan_data.get("legs", [])
                if not dep_val and legs:
                    dep_val = legs[0].get("departureTime")

                dep_dt = parse_dt_safe(dep_val)
                if not dep_dt:
                    continue

                if now <= dep_dt <= window_end:
                    mins_until = max(1, int((dep_dt - now).total_seconds() / 60))
                    train_number = "IR 1572"
                    if legs:
                        train_number = legs[0].get("trainNumber") or legs[0].get("lineCode") or train_number

                    trip_ref = f"saved_{s_route.id}_{train_number}"
                    dedup_key = f"beeline:notif:sent:{user.id}:{trip_ref}:departure"

                    if await _is_dedup_sent(dedup_key):
                        stats["skipped_duplicate"] += 1
                    else:
                        await _mark_dedup_sent(dedup_key, ttl_seconds=86400)
                        transfer_note = f"Journey includes {len(legs) - 1} transfer(s)" if len(legs) > 1 else None
                        try:
                            await email_service.send_train_departure_reminder_email(
                                to_email=user.email,
                                train_number=train_number,
                                origin=s_route.origin_name,
                                destination=s_route.destination_name,
                                departure_time=str(dep_val),
                                minutes_until_departure=mins_until,
                                platform=None,
                                delay_minutes=0,
                                transfer_note=transfer_note,
                                user_name=user.full_name
                            )
                            stats["sent"] += 1
                        except Exception as exc:
                            logger.error(f"Error sending departure reminder for saved route {s_route.id}: {exc}")

        return stats


trip_notification_service = TripNotificationService()


async def trip_notification_scheduler_worker():
    """Periodic background worker checking for upcoming train departures."""
    global _scheduler_stop_event
    _scheduler_stop_event = asyncio.Event()
    poll_seconds = getattr(settings, "TRIP_NOTIFICATION_POLL_SECONDS", 60)

    while not _scheduler_stop_event.is_set():
        try:
            async with AsyncSessionLocal() as db:
                await trip_notification_service.check_and_dispatch_upcoming_departures(db)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.debug(f"Trip notification scheduler note: {exc}")

        if _scheduler_stop_event.is_set():
            break

        try:
            await asyncio.wait_for(_scheduler_stop_event.wait(), timeout=float(poll_seconds))
            break
        except asyncio.TimeoutError:
            pass
        except asyncio.CancelledError:
            break


def start_trip_notification_scheduler() -> Optional[asyncio.Task]:
    """Starts the background worker unless running under pytest or explicitly disabled."""
    global _scheduler_task
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return None
    if not getattr(settings, "ENABLE_TRIP_NOTIFICATION_WORKER", True):
        return None
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(trip_notification_scheduler_worker())
    return _scheduler_task


def stop_trip_notification_scheduler() -> None:
    """Signals and cancels the background departure notification scheduler."""
    global _scheduler_stop_event, _scheduler_task
    if _scheduler_stop_event is not None:
        _scheduler_stop_event.set()
    if _scheduler_task is not None and not _scheduler_task.done():
        _scheduler_task.cancel()
