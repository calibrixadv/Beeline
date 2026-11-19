import asyncio
from datetime import datetime, timedelta, timezone
import logging
import secrets
import time
from typing import Dict, List, Optional
from fastapi import HTTPException, Request, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    compute_device_fingerprint,
    get_client_ip,
    get_device_info,
)
from app.core.config import settings
from app.core.redis import get_redis
from app.models.booking import Booking
from app.models.route import SavedRoute
from app.models.user import MFACredential, PasswordResetToken, User, UserSession, utcnow
from app.schemas.auth import TokenResponse
from app.schemas.user import DeleteAccountResponse, UserProfile
from app.services.auth_service import AuthService
from app.services.email_service import email_service

logger = logging.getLogger(__name__)


class UnfreezeVault:
    """
    Dual Redis + in-memory store for 24-hour single-use unfreeze tokens.
    """
    def __init__(self):
        self._memory_vault: Dict[str, Dict] = {}
        self._lock = asyncio.Lock()

    async def register(self, token: str, user_id: str, ttl: int = 86400) -> None:
        expires_at = time.time() + ttl
        # Redis registration
        try:
            redis = get_redis()
            await redis.set(f"unfreeze:{token}", user_id, ex=ttl)
        except Exception as exc:
            logger.debug(f"UnfreezeVault redis register note: {exc}")

        # In-memory registration
        async with self._lock:
            self._memory_vault[token] = {
                "user_id": user_id,
                "expires_at": expires_at
            }

    async def consume(self, token: str) -> Optional[str]:
        now = time.time()
        user_id = None

        # Check Redis
        try:
            redis = get_redis()
            val = await redis.get(f"unfreeze:{token}")
            if val:
                user_id = val.decode("utf-8") if isinstance(val, bytes) else str(val)
                await redis.delete(f"unfreeze:{token}")
        except Exception as exc:
            logger.debug(f"UnfreezeVault redis consume note: {exc}")

        # Check in-memory
        async with self._lock:
            entry = self._memory_vault.pop(token, None)
            if entry and entry["expires_at"] > now:
                if not user_id:
                    user_id = entry["user_id"]

        return user_id


unfreeze_vault = UnfreezeVault()


class AccountLifecycleService:
    """
    Manages the 30-Day Account Deletion Freeze Lifecycle:
    - 30-day freeze state on DELETE /users/me
    - Login unfreeze challenge email generation
    - Token unfreeze validation and account restoration
    - Automated lifecycle sweeps (15-day reminder & Day-0 cascade hard delete)
    """

    @staticmethod
    async def freeze_account(
        db: AsyncSession,
        user: User,
        client_ip: Optional[str] = None
    ) -> DeleteAccountResponse:
        """
        Freezes a user account for a 30-day grace period.
        Revokes all active sessions in Redis & PostgreSQL and dispatches the 30-Day Notice email.
        """
        now = utcnow()
        deletion_date = now + timedelta(days=30)

        user.account_status = "FROZEN_PENDING_DELETION"
        user.is_active = False
        user.frozen_at = now
        user.deletion_scheduled_at = deletion_date
        user.deletion_reminder_15d_sent = False
        user.updated_at = now

        # Revoke all user sessions in Redis and PostgreSQL
        await AuthService.revoke_all_user_sessions(db, user_id=user.id)
        await db.commit()
        await db.refresh(user)

        # Dispatch Email #1: 30 Days Remaining Notice
        try:
            await email_service.send_account_frozen_notice(
                to_email=user.email,
                days_remaining=30,
                deletion_scheduled_at=deletion_date
            )
        except Exception as exc:
            logger.error(f"Error dispatching account frozen notice to {user.email}: {exc}")

        return DeleteAccountResponse(
            message="User account deleted successfully (frozen for 30 days)",
            status="FROZEN_PENDING_DELETION",
            days_remaining=30,
            deletion_scheduled_at=deletion_date
        )

    @staticmethod
    async def generate_unfreeze_token(user_id: str) -> str:
        """Generates and registers a single-use 24-hour cryptographic unfreeze token."""
        token = secrets.token_urlsafe(32)
        await unfreeze_vault.register(token, user_id=user_id, ttl=86400)
        return token

    @staticmethod
    async def handle_frozen_login_attempt(
        db: AsyncSession,
        user: User,
        client_ip: Optional[str] = None
    ) -> None:
        """
        Called when a frozen user enters correct credentials during POST /auth/login.
        Checks if Day 0 was reached (triggers cascade delete), or generates unfreeze challenge email and rejects with 403.
        """
        now = utcnow()
        sched_at = user.deletion_scheduled_at
        if sched_at and sched_at.tzinfo is None:
            sched_at = sched_at.replace(tzinfo=timezone.utc)

        # If 30-day window expired, execute immediate hard delete
        if sched_at and now >= sched_at:
            await AccountLifecycleService.cascade_hard_delete_user(db, user)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account has been permanently deleted",
                headers={"WWW-Authenticate": "Bearer"}
            )

        # Calculate remaining days
        remaining_seconds = (sched_at - now).total_seconds() if sched_at else 30 * 86400
        days_remaining = max(1, int(round(remaining_seconds / 86400.0)))

        # Generate single-use unfreeze token
        unfreeze_token = await AccountLifecycleService.generate_unfreeze_token(user.id)

        # Dispatch Unfreeze Account Confirmation Email
        try:
            await email_service.send_account_unfreeze_challenge(
                to_email=user.email,
                unfreeze_token=unfreeze_token,
                days_remaining=days_remaining,
                ip_address=client_ip
            )
        except Exception as exc:
            logger.error(f"Error dispatching unfreeze challenge email to {user.email}: {exc}")

        # Return 403 Forbidden with structured detail
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_FROZEN_UNFREEZE_EMAIL_SENT",
                "message": "Your account is currently frozen for scheduled deletion. We have sent an unfreeze confirmation link to your email address.",
                "days_remaining": days_remaining,
            }
        )

    @staticmethod
    async def confirm_unfreeze(
        db: AsyncSession,
        token: str,
        remember_me: bool = False,
        request: Optional[Request] = None,
        response: Optional[Response] = None
    ) -> TokenResponse:
        """
        Validates unfreeze token, restores user account to ACTIVE, dispatches restored confirmation email,
        and logs user in with new session.
        """
        user_id = await unfreeze_vault.consume(token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired unfreeze token"
            )

        user = await AuthService.get_user_by_id(db, user_id=user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Restore user to ACTIVE status
        user.account_status = "ACTIVE"
        user.is_active = True
        user.frozen_at = None
        user.deletion_scheduled_at = None
        user.deletion_reminder_15d_sent = False
        user.updated_at = utcnow()
        await db.commit()
        await db.refresh(user)

        client_ip = get_client_ip(request) if request else "127.0.0.1"

        # Dispatch confirmation email
        try:
            await email_service.send_account_unfrozen_confirmation(
                to_email=user.email,
                ip_address=client_ip
            )
        except Exception as exc:
            logger.error(f"Error dispatching account restored confirmation to {user.email}: {exc}")

        # Create fresh session
        device = get_device_info(request) if request else "Web Browser"
        dfp = compute_device_fingerprint(request) if request else "default_dfp"
        ua = request.headers.get("user-agent") if request else "Web Browser"

        tokens = await AuthService.create_session(
            db=db,
            user=user,
            device_info=device,
            ip_address=client_ip,
            remember_me=remember_me,
            device_fingerprint=dfp,
            user_agent=ua,
            device_name=device
        )

        if response:
            from app.api.v1.endpoints.auth import set_auth_cookies
            set_auth_cookies(
                response=response,
                auth_token=tokens.access_token,
                device_proof=tokens.device_proof,
                remember_me=remember_me
            )

        return TokenResponse(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserProfile.model_validate(user)
        )

    @staticmethod
    async def cascade_hard_delete_user(db: AsyncSession, user: User) -> None:
        """
        Permanently deletes a user and cascades across PostgreSQL and Redis.
        Sends Email #3 (0 Days Remaining Notice).
        """
        user_email = user.email
        user_id = user.id

        # Dispatch Email #3: Account Permanently Deleted
        if user_email:
            try:
                await email_service.send_account_permanently_deleted_notice(to_email=user_email)
            except Exception as exc:
                logger.error(f"Error dispatching account deletion notice to {user_email}: {exc}")

        # Revoke sessions in Redis
        await AuthService.revoke_all_user_sessions(db, user_id=user_id)

        # Explicit cascade deletions
        try:
            await db.execute(delete(UserSession).where(UserSession.user_id == user_id))
            await db.execute(delete(MFACredential).where(MFACredential.user_id == user_id))
            await db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user_id))
            await db.execute(delete(SavedRoute).where(SavedRoute.user_id == user_id))
            await db.execute(delete(Booking).where(Booking.user_id == user_id))
            await db.delete(user)
            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.error(f"Error during cascade hard delete of user {user_id}: {exc}")
            raise

    @staticmethod
    async def run_lifecycle_sweep(
        db: AsyncSession,
        now: Optional[datetime] = None
    ) -> Dict[str, int]:
        """
        Automated lifecycle sweep:
        1. 15-Day Reminder: remaining <= 15 days, now < deletion_scheduled_at, and not deletion_reminder_15d_sent
           -> Send Email #2 and mark reminder sent.
        2. Day-0 Expiration: now >= deletion_scheduled_at
           -> Send Email #3 and execute Cascade Hard Delete.
        """
        now = now or utcnow()
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        result = await db.execute(
            select(User).where(User.account_status == "FROZEN_PENDING_DELETION")
        )
        frozen_users = list(result.scalars().all())

        reminders_sent = 0
        accounts_deleted = 0

        for user in frozen_users:
            sched_at = user.deletion_scheduled_at
            if not sched_at:
                continue
            if sched_at.tzinfo is None:
                sched_at = sched_at.replace(tzinfo=timezone.utc)

            # Day-0 check: permanent deletion
            if now >= sched_at:
                await AccountLifecycleService.cascade_hard_delete_user(db, user)
                accounts_deleted += 1
            else:
                # 15-day check
                remaining_seconds = (sched_at - now).total_seconds()
                remaining_days = max(1, int(round(remaining_seconds / 86400.0)))

                if remaining_days <= 15 and not user.deletion_reminder_15d_sent:
                    try:
                        await email_service.send_account_deletion_reminder_15d(
                            to_email=user.email,
                            days_remaining=remaining_days,
                            deletion_scheduled_at=sched_at
                        )
                    except Exception as exc:
                        logger.error(f"Error sending 15-day deletion reminder to {user.email}: {exc}")

                    user.deletion_reminder_15d_sent = True
                    user.updated_at = utcnow()
                    await db.commit()
                    reminders_sent += 1

        return {
            "reminders_sent": reminders_sent,
            "accounts_deleted": accounts_deleted
        }
