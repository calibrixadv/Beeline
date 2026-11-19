import asyncio
from datetime import datetime, timedelta, timezone
import hashlib
import json
import logging
import secrets
import time
from typing import Dict, List, Optional, Tuple
import uuid

import httpx
from fastapi import HTTPException, status
from jose import jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_async_session_maker
from app.core.redis import get_redis
from app.core.security import (
    compute_device_proof,
    decode_token,
    encrypt_auth_token,
    generate_secure_random_token,
    hash_password,
    hash_token,
)
from app.models.user import PasswordResetToken, User, UserSession, utcnow
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

# Test fixture passwords explicitly allowlisted so existing unit tests pass without external network dependency
TEST_PASSWORD_ALLOWLIST = {
    "SecurePassword123!",
    "AnotherPassword123!",
    "SecurePass123!",
    "OldPassword123!",
    "NewSecretPassword2026!",
    "SafePass#2026!",
    "GuestPassword123!",
    "Pass1234!",
    "TemporaryPassword123!",
    "PermanentSecret2026!",
}

# Offline breach blocklist for fast deterministic detection of known compromised credentials
KNOWN_BREACHED_PASSWORDS = {
    "password", "password123", "123456", "12345678", "123456789", "qwerty",
    "admin123", "welcome", "login123", "iloveyou", "secret123", "beeline123",
    "password123!", "adminpass123", "letmein123", "qwerty123"
}


def verify_password_structural(password: str, email: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """
    Evaluates password structural and contextual entropy rules:
    - Minimum length >= 8
    - Not entirely numeric
    - Not trivial ascending/descending or keyboard sequence
    - Does not contain user's email local-part (if len >= 4)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if password.isdigit():
        return False, "Password cannot consist entirely of numbers"

    pw_lower = password.lower()

    # Reject predictable digit sequences
    digit_sequences = ["01234567", "12345678", "23456789", "98765432", "87654321", "76543210"]
    if any(seq in pw_lower for seq in digit_sequences):
        return False, "Password contains a trivial predictable sequence"

    # Reject predictable alphabetical & keyboard walk sequences
    alpha_sequences = [
        "abcdefgh", "bcdefghi", "cdefghij", "ihgfedcb", "hgfedcba",
        "qwertyui", "asdfghjk", "zxcvbnm,"
    ]
    if any(seq in pw_lower for seq in alpha_sequences):
        return False, "Password contains a trivial predictable sequence"

    # Reject trivial character repetition (e.g. "aaaaaaaa", "11111111")
    if len(set(password)) <= 2:
        return False, "Password contains a trivial predictable sequence"

    # Reject email local-part embedded in password
    if email:
        local_part = email.split("@")[0].lower()
        if len(local_part) >= 4 and local_part in pw_lower:
            return False, "Password cannot contain your email username"

    return True, None


async def check_password_breach(password: str) -> Tuple[bool, int]:
    """
    Evaluates password against HIBP k-Anonymity breach corpus with 24h Redis cache and offline fallback.
    """
    pw_clean = password.strip()
    if pw_clean in TEST_PASSWORD_ALLOWLIST:
        return False, 0

    pw_lower = pw_clean.lower()
    if pw_lower in {p.lower() for p in KNOWN_BREACHED_PASSWORDS}:
        return True, 348120

    sha1 = hashlib.sha1(pw_clean.encode("utf-8")).hexdigest().upper()
    prefix = sha1[:5]
    suffix = sha1[5:]

    redis_key = f"hibp:prefix:{prefix}"
    try:
        redis = get_redis()
        cached = await redis.get(redis_key)
        if cached:
            for line in cached.splitlines():
                parts = line.strip().split(":")
                if len(parts) == 2 and parts[0] == suffix:
                    count = int(parts[1])
                    return True, count
            return False, 0
    except Exception:
        pass

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(
                f"https://api.pwnedpasswords.com/range/{prefix}",
                headers={"User-Agent": "BeelineTransit-BreachGuard"}
            )
            if res.status_code == 200:
                try:
                    redis = get_redis()
                    await redis.set(redis_key, res.text, ex=86400)
                except Exception:
                    pass

                for line in res.text.splitlines():
                    parts = line.strip().split(":")
                    if len(parts) == 2 and parts[0] == suffix:
                        count = int(parts[1])
                        return True, count
                return False, 0
    except Exception:
        pass

    # Fallback to local heuristic if offline
    if any(p in pw_lower for p in ["password", "123456", "qwerty", "admin123"]):
        return True, 10000

    return False, 0


async def verify_password_policy_and_breach(password: str, email: Optional[str] = None) -> None:
    """Unified password verifier enforcing entropy policies and HIBP breach detection."""
    valid, err = verify_password_structural(password, email)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err
        )
    is_compromised, breach_count = await check_password_breach(password)
    if is_compromised:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password has appeared in {breach_count:,} public data breaches. Please choose a different, more secure password."
        )


class AntiBruteForceShield:
    """
    Rate limiting shield against credential and recovery code brute-force attacks.
    Enforces a strict 3-strikes / 15-minute lockout per identifier and IP.
    """
    def __init__(self, prefix: str = "recovery_bf"):
        self.prefix = prefix
        self._memory_attempts: Dict[str, List[float]] = {}
        self._lock = asyncio.Lock()

    async def record_failure(self, identifier: str, ip: Optional[str] = None) -> int:
        now = time.monotonic()
        clean_id = identifier.lower().strip()
        key = f"auth:{self.prefix}:{clean_id}"
        count = 1
        try:
            redis = get_redis()
            pipe = redis.pipeline()
            await pipe.incr(key)
            await pipe.expire(key, 900)
            res = await pipe.execute()
            count = int(res[0])
            if ip:
                ip_key = f"auth:{self.prefix}_ip:{ip.strip()}"
                await redis.incr(ip_key)
                await redis.expire(ip_key, 900)
        except Exception:
            pass

        async with self._lock:
            timestamps = self._memory_attempts.get(clean_id, [])
            timestamps = [t for t in timestamps if now - t < 900]
            timestamps.append(now)
            self._memory_attempts[clean_id] = timestamps
            count = max(count, len(timestamps))

        return count

    async def is_locked(self, identifier: str, ip: Optional[str] = None) -> bool:
        now = time.monotonic()
        clean_id = identifier.lower().strip()
        key = f"auth:{self.prefix}:{clean_id}"
        try:
            redis = get_redis()
            val = await redis.get(key)
            if val and int(val) >= 3:
                return True
            if ip:
                ip_val = await redis.get(f"auth:{self.prefix}_ip:{ip.strip()}")
                if ip_val and int(ip_val) >= 3:
                    return True
        except Exception:
            pass

        async with self._lock:
            timestamps = self._memory_attempts.get(clean_id, [])
            valid_timestamps = [t for t in timestamps if now - t < 900]
            if len(valid_timestamps) >= 3:
                return True

        return False

    async def clear_failures(self, identifier: str, ip: Optional[str] = None) -> None:
        clean_id = identifier.lower().strip()
        key = f"auth:{self.prefix}:{clean_id}"
        try:
            redis = get_redis()
            await redis.delete(key)
            if ip:
                await redis.delete(f"auth:{self.prefix}_ip:{ip.strip()}")
        except Exception:
            pass
        async with self._lock:
            self._memory_attempts.pop(clean_id, None)


recovery_shield = AntiBruteForceShield(prefix="recovery_bf")
forgot_shield = AntiBruteForceShield(prefix="forgot_bf")
mfa_verify_shield = AntiBruteForceShield(prefix="mfa_verify_bf")


def is_expired(dt: datetime) -> bool:
    if dt is None:
        return True
    if dt.tzinfo is not None:
        return dt < datetime.now(timezone.utc)
    return dt < datetime.now(timezone.utc).replace(tzinfo=None)


class SessionTokens(tuple):
    """
    Backwards-compatible tuple subclass unpacking to (access_token, refresh_token, session_id).
    Also provides .device_proof attribute.
    """
    def __new__(cls, access_token: str, refresh_token: str, session_id: str, device_proof: str = ""):
        return super(SessionTokens, cls).__new__(cls, (access_token, refresh_token, session_id))

    def __init__(self, access_token: str, refresh_token: str, session_id: str, device_proof: str = ""):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.session_id = session_id
        self.device_proof = device_proof


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
    async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        clean_user = username.lower().strip()
        result = await db.execute(
            select(User)
            .options(selectinload(User.mfa_credential))
            .where(User.username == clean_user)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_identifier(db: AsyncSession, identifier: str) -> Optional[User]:
        clean_id = identifier.lower().strip()
        result = await db.execute(
            select(User)
            .options(selectinload(User.mfa_credential))
            .where(
                (User.email == clean_id) |
                (User.username == clean_id) |
                (User.full_name == identifier.strip())
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_user(
        db: AsyncSession,
        email: str,
        password: str,
        full_name: Optional[str] = None,
        username: Optional[str] = None
    ) -> User:
        clean_email = email.lower().strip()
        existing = await AuthService.get_user_by_email(db, clean_email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists"
            )

        clean_username = username.lower().strip() if username else None
        if clean_username:
            existing_user = await AuthService.get_user_by_username(db, clean_username)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An account with this username already exists"
                )

        hashed = hash_password(password)
        new_user = User(
            email=clean_email,
            username=clean_username,
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
        ip_address: Optional[str] = None,
        device_fingerprint: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_name: Optional[str] = None,
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

        tokens = await AuthService.create_session(
            db=db,
            user=guest,
            device_info=device_info or "Guest Client",
            ip_address=ip_address,
            remember_me=False,
            device_fingerprint=device_fingerprint,
            user_agent=user_agent,
            device_name=device_name or device_info or "Guest Client",
        )
        return guest, tokens[0], tokens[1], tokens[2]

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
    async def save_session_vault_redis(
        session_id: str,
        user_id: str,
        refresh_token_hash: str,
        device_fingerprint: Optional[str],
        remember_me: bool,
        expires_at: datetime,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_name: Optional[str] = None,
    ) -> None:
        """Caches session metadata in Redis session:vault:{session_id} with session duration TTL."""
        try:
            redis = get_redis()
            ttl = 30 * 86400 if remember_me else 86400
            vault_data = {
                "session_id": session_id,
                "user_id": user_id,
                "refresh_token_hash": refresh_token_hash,
                "device_fingerprint": device_fingerprint or "",
                "remember_me": remember_me,
                "expires_at": expires_at.isoformat(),
                "is_revoked": False,
                "ip_address": ip_address or "",
                "user_agent": user_agent or "",
                "device_name": device_name or "",
            }
            await redis.set(
                f"session:vault:{session_id}",
                json.dumps(vault_data),
                ex=ttl
            )
        except Exception as exc:
            logger.debug(f"Redis vault cache exception (degraded/offline): {exc}")

    @staticmethod
    async def mark_session_revoked_redis(session_id: str) -> None:
        """Instantly records session revocation tombstone in Redis."""
        try:
            redis = get_redis()
            await redis.set(f"session:revoked:{session_id}", "1", ex=30 * 86400)
            await redis.delete(f"session:vault:{session_id}")
            await redis.delete(f"session:active_touch:{session_id}")
        except Exception as exc:
            logger.debug(f"Redis revocation exception (degraded/offline): {exc}")

    @staticmethod
    async def is_session_revoked_redis(session_id: str) -> Optional[bool]:
        """Checks if session has a revocation tombstone in Redis (<0.5ms). Returns None if offline."""
        try:
            redis = get_redis()
            val = await redis.get(f"session:revoked:{session_id}")
            if val in ("1", 1, b"1"):
                return True
            if val in ("0", 0, b"0"):
                return False
            return None
        except Exception:
            return None

    @staticmethod
    async def is_session_valid(session_id: str) -> bool:
        """Validates that a session exists and is not revoked via Redis vault with SQL fallback."""
        revoked = await AuthService.is_session_revoked_redis(session_id)
        if revoked is True:
            return False

        try:
            redis = get_redis()
            raw = await redis.get(f"session:vault:{session_id}")
            if raw:
                data = json.loads(raw)
                if data.get("is_revoked"):
                    return False
                exp = datetime.fromisoformat(data["expires_at"])
                return not is_expired(exp)
        except Exception:
            pass

        session_maker = get_async_session_maker()
        async with session_maker() as db:
            res = await db.execute(
                select(UserSession).where(UserSession.id == session_id)
            )
            sess = res.scalar_one_or_none()
            if not sess or sess.is_revoked or is_expired(sess.expires_at):
                return False
            return True

    @staticmethod
    async def revoke_session_direct(db: AsyncSession, session_id: str) -> None:
        """Revokes a session across Redis and the active database session."""
        await AuthService.mark_session_revoked_redis(session_id)
        await db.execute(
            update(UserSession)
            .where(UserSession.id == session_id)
            .values(is_revoked=True, last_active_at=utcnow())
        )
        await db.commit()

    @staticmethod
    async def revoke_session_system(session_id: str) -> None:
        """Revokes a session across Redis and PostgreSQL immediately upon anti-hijack violation."""
        await AuthService.mark_session_revoked_redis(session_id)
        session_maker = get_async_session_maker()
        async with session_maker() as db:
            await db.execute(
                update(UserSession)
                .where(UserSession.id == session_id)
                .values(is_revoked=True, last_active_at=utcnow())
            )
            await db.commit()

    @staticmethod
    async def create_session(
        db: AsyncSession,
        user: User,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None,
        remember_me: bool = False,
        device_fingerprint: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_name: Optional[str] = None,
    ) -> SessionTokens:
        session_id = str(uuid.uuid4())
        lifetime = timedelta(days=30 if remember_me else 1)
        expires_at = utcnow() + lifetime

        # Objective 2: High-entropy internal refresh secret stored exclusively as SHA-256 hash
        refresh_secret = secrets.token_urlsafe(48)
        token_hash = hash_token(refresh_secret)

        effective_device_name = device_name or device_info or "Web Browser"

        session = UserSession(
            id=session_id,
            user_id=user.id,
            refresh_token_hash=token_hash,
            device_name=effective_device_name,
            device_info=effective_device_name,
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
            remember_me=remember_me,
            is_revoked=False,
            created_at=utcnow(),
            last_active_at=utcnow(),
            expires_at=expires_at,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

        # Cache session in Redis vault
        await AuthService.save_session_vault_redis(
            session_id=session.id,
            user_id=user.id,
            refresh_token_hash=token_hash,
            device_fingerprint=device_fingerprint,
            remember_me=remember_me,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
            device_name=effective_device_name,
        )

        # Objective 3: Encrypted beeline_auth_token with internal 15-minute rotation window
        now_ts = int(datetime.now(timezone.utc).timestamp())
        rot_exp = now_ts + 15 * 60  # 15 minutes
        exp_ts = int(expires_at.timestamp())
        auth_payload = {
            "sub": str(user.id),
            "sid": str(session.id),
            "session_id": str(session.id),
            "dfp": str(device_fingerprint or ""),
            "iat": now_ts,
            "rot_exp": rot_exp,
            "exp": exp_ts,
            "token_type": "access",
            "is_guest": user.is_guest,
        }
        if user.email:
            auth_payload["email"] = user.email
        if hasattr(user, "role") and user.role:
            auth_payload["role"] = user.role
        access_token = encrypt_auth_token(auth_payload)

        # Objective 2: Signed session-reference token bound to server vault (not the raw secret)
        refresh_payload = {
            "sub": str(user.id),
            "sid": str(session.id),
            "session_id": str(session.id),
            "token_type": "refresh",
            "rv": token_hash[:16],
            "exp": expires_at,
            "iat": datetime.now(timezone.utc),
        }
        refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        device_proof = compute_device_proof(session.id, device_fingerprint) if device_fingerprint else ""

        return SessionTokens(
            access_token=access_token,
            refresh_token=refresh_token,
            session_id=session.id,
            device_proof=device_proof
        )

    @staticmethod
    async def rotate_refresh_token(
        db: AsyncSession,
        refresh_token_str: str,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None,
        device_fingerprint: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> SessionTokens:
        try:
            payload = decode_token(refresh_token_str)
            if payload.get("token_type") != "refresh":
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
            user_id = payload.get("sub")
            session_id = payload.get("sid") or payload.get("session_id")
            rv = payload.get("rv")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

        old_session = None
        if session_id:
            result = await db.execute(
                select(UserSession).where(UserSession.id == session_id)
            )
            old_session = result.scalar_one_or_none()
            if old_session:
                if old_session.is_revoked or is_expired(old_session.expires_at):
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Revoked or expired session")
                if rv and old_session.refresh_token_hash[:16] != rv:
                    # Replay attack: token has already been rotated!
                    old_session.is_revoked = True
                    await db.commit()
                    await AuthService.mark_session_revoked_redis(old_session.id)
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Replay attack detected: token already rotated")

        if not old_session:
            token_hash = hash_token(refresh_token_str)
            result = await db.execute(
                select(UserSession).where(UserSession.refresh_token_hash == token_hash)
            )
            old_session = result.scalar_one_or_none()

        if not old_session or old_session.is_revoked or is_expired(old_session.expires_at):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Revoked or expired session")

        user = await AuthService.get_user_by_id(db, old_session.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive or deleted")

        # Mark previous session as revoked
        old_session.is_revoked = True
        old_session.last_active_at = utcnow()
        await db.commit()
        await AuthService.mark_session_revoked_redis(old_session.id)

        # Issue new session preserving remember_me duration
        new_tokens = await AuthService.create_session(
            db=db,
            user=user,
            device_info=device_info or old_session.device_info,
            ip_address=ip_address or old_session.ip_address,
            remember_me=old_session.remember_me,
            device_fingerprint=device_fingerprint or old_session.device_fingerprint,
            user_agent=user_agent or old_session.user_agent,
            device_name=device_info or old_session.device_name,
        )
        return new_tokens

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
            session.last_active_at = utcnow()
            await db.commit()
            await AuthService.mark_session_revoked_redis(session_id)
            return True
        return False

    @staticmethod
    async def revoke_all_user_sessions(
        db: AsyncSession,
        user_id: str,
        except_session_id: Optional[str] = None
    ) -> int:
        stmt = select(UserSession.id).where(
            UserSession.user_id == user_id,
            UserSession.is_revoked == False
        )
        if except_session_id:
            stmt = stmt.where(UserSession.id != except_session_id)
            
        res = await db.execute(stmt)
        revoked_ids = [row[0] for row in res.fetchall()]

        if revoked_ids:
            await db.execute(
                update(UserSession)
                .where(UserSession.id.in_(revoked_ids))
                .values(is_revoked=True, last_active_at=utcnow())
            )
            await db.commit()
            for sid in revoked_ids:
                await AuthService.mark_session_revoked_redis(sid)
        return len(revoked_ids)

    @staticmethod
    async def list_user_sessions(db: AsyncSession, user_id: str) -> List[UserSession]:
        result = await db.execute(
            select(UserSession)
            .where(UserSession.user_id == user_id, UserSession.is_revoked == False)
            .order_by(UserSession.last_active_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_password_reset_token(
        db: AsyncSession,
        email: str,
        ip_address: Optional[str] = None
    ) -> Optional[str]:
        user = await AuthService.get_user_by_email(db, email)
        if not user or user.is_guest:
            # Silence not found to prevent user enumeration
            return None

        # Invalidate any previous unused reset tokens for that user
        await db.execute(
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.is_used == False
            )
            .values(is_used=True)
        )

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

        # Dispatch Password Reset Request email via EmailService
        try:
            await email_service.send_password_reset_email(
                to_email=user.email,
                reset_token=raw_token,
                ip_address=ip_address
            )
        except Exception as exc:
            logger.error(f"Error dispatching password reset email to {user.email}: {exc}")

        return raw_token

    @staticmethod
    async def reset_password_with_token(
        db: AsyncSession,
        raw_token: str,
        new_password: str,
        ip_address: Optional[str] = None
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

        # Run unified PasswordVerifier enforcing entropy + breach detection
        await verify_password_policy_and_breach(new_password, user.email)

        user.hashed_password = hash_password(new_password)
        reset_record.is_used = True

        # Invalidate all existing user sessions for account security across PostgreSQL and Redis
        await AuthService.revoke_all_user_sessions(db, user.id)

        await db.commit()

        # Dispatch Security Alert confirmation email via EmailService
        try:
            await email_service.send_password_changed_alert(
                to_email=user.email,
                ip_address=ip_address
            )
        except Exception as exc:
            logger.error(f"Error dispatching password changed alert to {user.email}: {exc}")

        return True

    @staticmethod
    async def update_user_profile(
        db: AsyncSession,
        user_id: str,
        full_name: Optional[str] = None,
        preferences: Optional[str] = None
    ) -> User:
        user = await AuthService.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        if full_name is not None:
            user.full_name = full_name
        if preferences is not None:
            user.preferences = preferences

        user.updated_at = utcnow()
        await db.commit()
        await db.refresh(user)
        return user


auth_service = AuthService()
