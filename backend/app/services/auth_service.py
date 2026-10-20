from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_secure_random_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.user import MFACredential, PasswordResetToken, User, UserSession, utcnow


def is_expired(dt: datetime) -> bool:
    if dt is None:
        return True
    if dt.tzinfo is not None:
        return dt < datetime.now(timezone.utc)
    return dt < datetime.now(timezone.utc).replace(tzinfo=None)


class AuthService:
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        result = await db.execute(
            select(User)
            .options(selectinload(User.mfa_credential))
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(
            select(User)
            .options(selectinload(User.mfa_credential))
            .where(User.email == email.lower().strip())
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_user(
        db: AsyncSession,
        email: str,
        password: str,
        full_name: Optional[str] = None
    ) -> User:
        clean_email = email.lower().strip()
        existing = await AuthService.get_user_by_email(db, clean_email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists"
            )

        hashed = hash_password(password)
        new_user = User(
            email=clean_email,
            hashed_password=hashed,
            full_name=full_name,
            is_guest=False,
            is_active=True,
            mfa_enabled=False
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

    @staticmethod
    async def create_guest_user(
        db: AsyncSession,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[User, str, str, str]:
        guest = User(
            is_guest=True,
            is_active=True,
            mfa_enabled=False,
            full_name="Guest Traveler"
        )
        db.add(guest)
        await db.commit()
        await db.refresh(guest)

        access_token, refresh_token, session_id = await AuthService.create_session(
            db=db,
            user=guest,
            device_info=device_info or "Guest Client",
            ip_address=ip_address
        )
        return guest, access_token, refresh_token, session_id

    @staticmethod
    async def convert_guest_user(
        db: AsyncSession,
        guest_user_id: str,
        email: str,
        password: str,
        full_name: Optional[str] = None
    ) -> User:
        clean_email = email.lower().strip()
        user = await AuthService.get_user_by_id(db, guest_user_id)
        if not user or not user.is_guest:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or non-guest user account"
            )

        # Check if email is already claimed
        existing = await AuthService.get_user_by_email(db, clean_email)
        if existing and existing.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists"
            )

        user.email = clean_email
        user.hashed_password = hash_password(password)
        if full_name:
            user.full_name = full_name
        user.is_guest = False
        user.updated_at = utcnow()

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def create_session(
        db: AsyncSession,
        user: User,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[str, str, str]:
        access_token = create_access_token(
            subject=user.id,
            is_guest=user.is_guest,
            extra_claims={"email": user.email} if user.email else None
        )
        refresh_token = create_refresh_token(subject=user.id)
        
        expires_at = utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        token_hash = hash_token(refresh_token)

        session = UserSession(
            user_id=user.id,
            refresh_token_hash=token_hash,
            device_info=device_info,
            ip_address=ip_address,
            is_revoked=False,
            expires_at=expires_at,
            last_active_at=utcnow()
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

        return access_token, refresh_token, session.id

    @staticmethod
    async def rotate_refresh_token(
        db: AsyncSession,
        refresh_token_str: str,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[str, str, str]:
        try:
            payload = decode_token(refresh_token_str)
            if payload.get("token_type") != "refresh":
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
            user_id = payload.get("sub")
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

        token_hash = hash_token(refresh_token_str)
        result = await db.execute(
            select(UserSession).where(UserSession.refresh_token_hash == token_hash)
        )
        old_session = result.scalar_one_or_none()

        if not old_session or old_session.is_revoked or is_expired(old_session.expires_at):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Revoked or expired session")

        user = await AuthService.get_user_by_id(db, user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive or deleted")

        # Mark previous session as revoked
        old_session.is_revoked = True
        old_session.last_active_at = utcnow()

        # Issue new session and tokens
        new_access_token, new_refresh_token, new_session_id = await AuthService.create_session(
            db=db,
            user=user,
            device_info=device_info or old_session.device_info,
            ip_address=ip_address or old_session.ip_address
        )
        return new_access_token, new_refresh_token, new_session_id

    @staticmethod
    async def revoke_session(db: AsyncSession, session_id: str, user_id: str) -> bool:
        result = await db.execute(
            select(UserSession).where(
                UserSession.id == session_id,
                UserSession.user_id == user_id
            )
        )
        session = result.scalar_one_or_none()
        if session:
            session.is_revoked = True
            await db.commit()
            return True
        return False

    @staticmethod
    async def revoke_all_user_sessions(
        db: AsyncSession,
        user_id: str,
        except_session_id: Optional[str] = None
    ) -> int:
        stmt = update(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.is_revoked == False
        )
        if except_session_id:
            stmt = stmt.where(UserSession.id != except_session_id)
            
        stmt = stmt.values(is_revoked=True)
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount

    @staticmethod
    async def list_user_sessions(db: AsyncSession, user_id: str) -> List[UserSession]:
        result = await db.execute(
            select(UserSession)
            .where(UserSession.user_id == user_id, UserSession.is_revoked == False)
            .order_by(UserSession.last_active_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_password_reset_token(db: AsyncSession, email: str) -> Optional[str]:
        user = await AuthService.get_user_by_email(db, email)
        if not user or user.is_guest:
            # Silence not found to prevent user enumeration
            return None

        raw_token = generate_secure_random_token(32)
        token_hash = hash_token(raw_token)
        expires_at = utcnow() + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_used=False
        )
        db.add(reset_record)
        await db.commit()
        return raw_token

    @staticmethod
    async def reset_password_with_token(
        db: AsyncSession,
        raw_token: str,
        new_password: str
    ) -> bool:
        token_hash = hash_token(raw_token)
        result = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.is_used == False
            )
        )
        reset_record = result.scalar_one_or_none()
        if not reset_record or is_expired(reset_record.expires_at):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token"
            )

        user = await AuthService.get_user_by_id(db, reset_record.user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Update password
        user.hashed_password = hash_password(new_password)
        reset_record.is_used = True

        # Invalidate all existing user sessions for account security
        await AuthService.revoke_all_user_sessions(db, user.id)

        await db.commit()
        return True


auth_service = AuthService()
