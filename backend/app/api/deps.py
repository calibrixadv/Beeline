import logging
from typing import Optional, Tuple
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import (
    compute_device_fingerprint,
    compute_device_proof,
    decrypt_auth_token,
)
from app.models.user import User, UserSession, utcnow
from app.services.auth_service import AuthService, is_expired

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False
)


def get_client_ip(request: Request) -> str:
    """Extracts client IP considering forwarding headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def get_device_info(request: Request) -> str:
    """Extracts User-Agent or device description."""
    ua = request.headers.get("User-Agent")
    return ua[:200] if ua else "Web Browser"


def extract_auth_token(request: Request, bearer_token: Optional[str] = None) -> Tuple[Optional[str], str]:
    """
    Extracts authentication credentials from Authorization: Bearer header OR beeline_auth_token cookie.
    Returns (token, transport_type) where transport_type is 'header', 'cookie', or 'none'.
    """
    if bearer_token:
        return bearer_token, "header"

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip(), "header"

    cookie_token = request.cookies.get("beeline_auth_token")
    if cookie_token:
        return cookie_token, "cookie"

    return None, "none"


def get_current_session_id(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[str]:
    """Extracts active session ID from header Bearer token or beeline_auth_token cookie."""
    raw_token, _ = extract_auth_token(request, token)
    if not raw_token:
        return None
    try:
        payload = decrypt_auth_token(raw_token)
        return payload.get("session_id") or payload.get("sid")
    except Exception:
        return None


async def get_current_session(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[UserSession]:
    """Retrieves the active UserSession record from database."""
    sid = get_current_session_id(request=request, token=token)
    if not sid:
        return None
    res = await db.execute(select(UserSession).where(UserSession.id == sid))
    return res.scalar_one_or_none()


async def touch_session_activity(session_id: str, ip: str, db: AsyncSession) -> None:
    """
    Updates last_active_at and ip_address at most once every 5 minutes per session_id.
    Throttled via Redis key session:active_touch:{session_id} with 300s TTL.
    """
    try:
        redis = get_redis()
        touch_key = f"session:active_touch:{session_id}"
        acquired = await redis.set(touch_key, "1", ex=300, nx=True)
        if acquired:
            await db.execute(
                update(UserSession)
                .where(UserSession.id == session_id)
                .values(last_active_at=utcnow(), ip_address=ip)
            )
            await db.commit()
    except Exception as exc:
        logger.debug(f"Session activity touch skipped/fallback: {exc}")


async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    raw_token, transport = extract_auth_token(request, token)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decrypt_auth_token(raw_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: Optional[str] = payload.get("sub")
    session_id: Optional[str] = payload.get("sid") or payload.get("session_id")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Anti-Hijack Device-Context Verification for Cookie transport
    if transport == "cookie" or (session_id and payload.get("dfp")):
        current_dfp = compute_device_fingerprint(request)
        proof = request.cookies.get("beeline_device_proof")
        expected_proof = compute_device_proof(session_id, current_dfp) if session_id else ""
        token_dfp = payload.get("dfp")

        if transport == "cookie":
            if not proof or proof != expected_proof or (token_dfp and token_dfp != current_dfp):
                # Anti-hijack violation! Revoke session instantly in Redis and PostgreSQL
                if session_id:
                    await AuthService.revoke_session_direct(db, session_id=session_id)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Device context mismatch or hijack attempt detected. Session revoked.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    # Redis Instant Revocation Lookup (< 0.5ms) for cookie session transport
    if transport == "cookie" and session_id:
        is_revoked = await AuthService.is_session_revoked_redis(session_id)
        if is_revoked is True:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Revoked or expired session",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if is_revoked is None:
            res = await db.execute(
                select(UserSession).where(UserSession.id == session_id)
            )
            sess = res.scalar_one_or_none()
            if not sess or sess.is_revoked:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Revoked session",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            if is_expired(sess.expires_at):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Expired session",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    if session_id:
        # Throttled live device activity tracking (5m throttle)
        ip = get_client_ip(request)
        await touch_session_activity(session_id, ip, db)

    user = await AuthService.get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if getattr(user, "account_status", "ACTIVE") == "FROZEN_PENDING_DELETION":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is frozen pending deletion",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    return user


async def get_optional_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    try:
        return await get_current_user(request=request, token=token, db=db)
    except HTTPException:
        return None
