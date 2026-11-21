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
from app.models.transit import Train
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


async def lookup_train_delay(
    train_number: str,
    travel_date: Optional[str] = None,
    db: Optional[AsyncSession] = None,
    plan_data: Optional[Dict[str, Any]] = None,
) -> int:
    """
    Retrieves the current live delay in minutes for a given train journey using:
    1. plan_data / leg risk metrics
    2. Database Train status / delay_minutes records
    3. In-memory timetable datasets (TRAINS_DATA)
    4. InfoFer telematics adapter snapshots
    """
    delay = 0

    if plan_data:
        delay = max(delay, int(plan_data.get("delayMinutes") or plan_data.get("delay_minutes") or 0))
        for leg in plan_data.get("legs", []):
            delay = max(delay, int(leg.get("delayMinutes") or leg.get("delay_minutes") or 0))
            risk_obj = leg.get("risk")
            if isinstance(risk_obj, dict):
                delay = max(delay, int(risk_obj.get("expectedDelayMinutes") or 0))

    if db is not None and train_number:
        clean_num = train_number.strip().upper()
        digits = "".join(ch for ch in clean_num if ch.isdigit())
        try:
            from sqlalchemy import or_
            conds = [Train.train_number == clean_num]
            if digits:
                conds.append(Train.train_number.like(f"%{digits}%"))
            stmt = select(Train).where(or_(*conds))
            res = await db.execute(stmt)
            db_trains = res.scalars().all()
            for db_t in db_trains:
                if db_t.delay_minutes:
                    delay = max(delay, int(db_t.delay_minutes))
        except Exception as e:
            logger.debug(f"DB train delay lookup exception: {e}")

    if train_number:
        try:
            from app.services.train_service import TRAINS_DATA, matches_train_code
            for t in TRAINS_DATA:
                if matches_train_code(t.trainNumber, train_number):
                    delay = max(delay, int(getattr(t, "delayMinutes", 0) or 0))
        except Exception:
            pass

    if train_number and travel_date:
        try:
            from scraper.collectors.train_api import InfoFerLiveAdapter
            adapter = InfoFerLiveAdapter.get_shared_instance()
            rec = adapter.fetch_train_sync(train_number, travel_date[:10])
            if rec and getattr(rec, "target_labels", None):
                actual = getattr(rec.target_labels, "actual_delay_minutes", 0)
                if actual:
                    delay = max(delay, int(round(actual)))
        except Exception:
            pass

    return delay


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

                # If alert_muted is True: SKIP both departure reminder and live delay alert
                if getattr(s_route, "alert_muted", False) is True:
                    stats["skipped_muted"] = stats.get("skipped_muted", 0) + 1
                    continue

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

                # Only evaluate active/upcoming trips (not journeys completed in the distant past)
                if dep_dt < now - timedelta(minutes=15):
                    continue

                train_number = "IR 1572"
                if legs:
                    train_number = legs[0].get("trainNumber") or legs[0].get("lineCode") or train_number
                elif plan_data.get("summary"):
                    parts = plan_data["summary"].split("•")
                    if parts:
                        train_number = parts[0].strip()

                lead_minutes = getattr(s_route, "alert_lead_minutes", 30) or 30

                # 3a. Departure Reminder:
                # Check if remaining minutes until departure satisfies 0 < minutes_until_departure <= saved_route.alert_lead_minutes
                diff_seconds = (dep_dt - now).total_seconds()
                mins_until = int(round(diff_seconds / 60.0)) if diff_seconds > 0 else 0

                if 0 < mins_until <= lead_minutes:
                    dedup_key = f"beeline:notif:sent:{user.id}:{s_route.id}:departure:{lead_minutes}"
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
                                minutes_until_departure=max(1, mins_until),
                                platform=None,
                                delay_minutes=0,
                                transfer_note=transfer_note,
                                user_name=user.full_name
                            )
                            stats["sent"] += 1
                        except Exception as exc:
                            logger.error(f"Error sending departure reminder for saved route {s_route.id}: {exc}")

                # 3b. Automatic Live Delay Check:
                # Check current live delay for that trip's train number / date. If delay_minutes >= 10, dispatch live delay alert email.
                travel_date = str(dep_val)[:10] if dep_val else None
                delay_minutes = await lookup_train_delay(
                    train_number=train_number,
                    travel_date=travel_date,
                    db=db,
                    plan_data=plan_data
                )

                if delay_minutes >= 10:
                    delay_dedup_key = f"beeline:notif:sent:{user.id}:{s_route.id}:delay:{delay_minutes}"
                    if await _is_dedup_sent(delay_dedup_key):
                        stats["skipped_duplicate"] += 1
                    else:
                        await _mark_dedup_sent(delay_dedup_key, ttl_seconds=86400)
                        try:
                            await email_service.send_train_delay_alert_email(
                                to_email=user.email,
                                train_number=train_number,
                                origin=s_route.origin_name,
                                destination=s_route.destination_name,
                                departure_time=str(dep_val),
                                delay_minutes=delay_minutes,
                                user_name=user.full_name
                            )
                            stats["sent"] += 1
                        except Exception as exc:
                            logger.error(f"Error sending live delay alert for saved route {s_route.id}: {exc}")

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
