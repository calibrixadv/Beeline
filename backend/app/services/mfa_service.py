import asyncio
import base64
import hashlib
import hmac
import io
import json
import logging
import secrets
import time
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote

import pyotp
import qrcode
from qrcode.image.svg import SvgImage

from app.core.config import settings
from app.core.redis import get_redis
from app.core.security import decrypt_totp_secret, encrypt_totp_secret, hash_token

logger = logging.getLogger(__name__)


class TOTPReplayShield:
    """
    Prevents replay of the same 6-digit TOTP code across login challenges within the same validity window.
    Tracks consumed TOTP codes with a 60-second TTL in Redis with thread-safe in-memory fallback.
    """
    def __init__(self):
        self._memory_used: Dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def is_replayed(self, user_id: str, code: str) -> bool:
        clean_code = str(code).strip().replace(" ", "").replace("-", "")
        key = f"mfa:used_challenge_totp:{user_id}:{clean_code}"
        try:
            redis = get_redis()
            val = await redis.get(key)
            if val:
                return True
        except Exception:
            pass

        now = time.monotonic()
        async with self._lock:
            # Purge expired
            self._memory_used = {k: exp for k, exp in self._memory_used.items() if exp > now}
            mem_key = f"{user_id}:{clean_code}"
            if mem_key in self._memory_used:
                return True

        return False

    async def mark_used(self, user_id: str, code: str, ttl: int = 60) -> None:
        clean_code = str(code).strip().replace(" ", "").replace("-", "")
        key = f"mfa:used_challenge_totp:{user_id}:{clean_code}"
        try:
            redis = get_redis()
            await redis.set(key, "1", ex=ttl)
        except Exception:
            pass

        now = time.monotonic()
        async with self._lock:
            self._memory_used[f"{user_id}:{clean_code}"] = now + ttl


class MFAChallengeVault:
    """
    Manages short-lived single-use MFA challenge tokens (mfa_temp_token / mfa_session_token).
    Stores active, consumed, and revoked challenge states in Redis with in-memory fallback.
    """
    def __init__(self):
        self._challenges: Dict[str, Dict[str, Any]] = {}
        self._revoked_jtis: Dict[str, float] = {}
        self._consumed_jtis: Dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def register(self, jti: str, user_id: str, remember_me: bool = False, ttl: int = 300) -> None:
        now = time.monotonic()
        val = json.dumps({"user_id": user_id, "remember_me": remember_me})
        try:
            redis = get_redis()
            await redis.set(f"mfa:challenge:{jti}", val, ex=ttl)
        except Exception:
            pass

        async with self._lock:
            self._challenges[jti] = {
                "user_id": user_id,
                "remember_me": remember_me,
                "exp": now + ttl
            }

    async def is_active(self, jti: str) -> bool:
        now = time.monotonic()
        if await self.is_revoked(jti) or await self.is_consumed(jti):
            return False

        try:
            redis = get_redis()
            val = await redis.get(f"mfa:challenge:{jti}")
            if val:
                return True
        except Exception:
            pass

        async with self._lock:
            item = self._challenges.get(jti)
            if item and item["exp"] > now:
                return True

        return False

    async def is_revoked(self, jti: str) -> bool:
        now = time.monotonic()
        try:
            redis = get_redis()
            if await redis.get(f"mfa:challenge:revoked:{jti}"):
                return True
        except Exception:
            pass

        async with self._lock:
            exp = self._revoked_jtis.get(jti)
            if exp and exp > now:
                return True
        return False

    async def is_consumed(self, jti: str) -> bool:
        now = time.monotonic()
        try:
            redis = get_redis()
            if await redis.get(f"mfa:challenge:consumed:{jti}"):
                return True
        except Exception:
            pass

        async with self._lock:
            exp = self._consumed_jtis.get(jti)
            if exp and exp > now:
                return True
        return False

    async def consume(self, jti: str) -> None:
        now = time.monotonic()
        try:
            redis = get_redis()
            pipe = redis.pipeline()
            await pipe.set(f"mfa:challenge:consumed:{jti}", "1", ex=300)
            await pipe.delete(f"mfa:challenge:{jti}")
            await pipe.execute()
        except Exception:
            pass

        async with self._lock:
            self._challenges.pop(jti, None)
            self._consumed_jtis[jti] = now + 300

    async def revoke(self, jti: str) -> None:
        now = time.monotonic()
        try:
            redis = get_redis()
            pipe = redis.pipeline()
            await pipe.set(f"mfa:challenge:revoked:{jti}", "1", ex=900)
            await pipe.delete(f"mfa:challenge:{jti}")
            await pipe.execute()
        except Exception:
            pass

        async with self._lock:
            self._challenges.pop(jti, None)
            self._revoked_jtis[jti] = now + 900


class MFAChallengeShield:
    """
    Enforces a strict 3-strike anti-brute-force threshold per challenge token (JTI) and per user.
    """
    def __init__(self):
        self._user_attempts: Dict[str, List[float]] = {}
        self._jti_attempts: Dict[str, List[float]] = {}
        self._lock = asyncio.Lock()

    async def record_failure(self, user_id: str, jti: str) -> Tuple[int, int]:
        now = time.monotonic()
        u_count = 1
        j_count = 1
        try:
            redis = get_redis()
            pipe = redis.pipeline()
            await pipe.incr(f"auth:mfa_bf:{user_id}")
            await pipe.expire(f"auth:mfa_bf:{user_id}", 900)
            await pipe.incr(f"auth:mfa_bf_jti:{jti}")
            await pipe.expire(f"auth:mfa_bf_jti:{jti}", 900)
            res = await pipe.execute()
            u_count = int(res[0])
            j_count = int(res[2])
        except Exception:
            pass

        async with self._lock:
            u_times = [t for t in self._user_attempts.get(user_id, []) if now - t < 900]
            u_times.append(now)
            self._user_attempts[user_id] = u_times
            u_count = max(u_count, len(u_times))

            j_times = [t for t in self._jti_attempts.get(jti, []) if now - t < 900]
            j_times.append(now)
            self._jti_attempts[jti] = j_times
            j_count = max(j_count, len(j_times))

        return u_count, j_count

    async def is_locked(self, user_id: str, jti: str) -> bool:
        now = time.monotonic()
        try:
            redis = get_redis()
            u_val = await redis.get(f"auth:mfa_bf:{user_id}")
            j_val = await redis.get(f"auth:mfa_bf_jti:{jti}")
            if (u_val and int(u_val) >= 3) or (j_val and int(j_val) >= 3):
                return True
        except Exception:
            pass

        async with self._lock:
            u_times = [t for t in self._user_attempts.get(user_id, []) if now - t < 900]
            j_times = [t for t in self._jti_attempts.get(jti, []) if now - t < 900]
            if len(u_times) >= 3 or len(j_times) >= 3:
                return True

        return False

    async def clear_jti(self, jti: str) -> None:
        try:
            redis = get_redis()
            await redis.delete(f"auth:mfa_bf_jti:{jti}")
        except Exception:
            pass
        async with self._lock:
            self._jti_attempts.pop(jti, None)

    async def clear_user(self, user_id: str) -> None:
        try:
            redis = get_redis()
            await redis.delete(f"auth:mfa_bf:{user_id}")
        except Exception:
            pass
        async with self._lock:
            self._user_attempts.pop(user_id, None)


totp_replay_shield = TOTPReplayShield()
mfa_challenge_vault = MFAChallengeVault()
mfa_challenge_shield = MFAChallengeShield()


class MFAService:
    encrypt_totp_secret = staticmethod(encrypt_totp_secret)
    decrypt_totp_secret = staticmethod(decrypt_totp_secret)

    @staticmethod
    def generate_secret() -> str:
        """Generates a cryptographically random 160-bit base32 TOTP secret (RFC 6238)."""
        return pyotp.random_base32()

    @staticmethod
    def get_provisioning_uri(secret: str, user_email: str) -> str:
        """
        Returns the standard RFC 6238 otpauth:// provisioning URI
        compatible with Proton Pass, Google Authenticator, Microsoft Authenticator, 1Password, and Authy.
        """
        plain_secret = decrypt_totp_secret(secret)
        clean_email = (user_email or "user@beeline.io").strip()
        encoded_email = quote(clean_email)
        return (
            f"otpauth://totp/Beeline:{encoded_email}"
            f"?secret={plain_secret}&issuer=Beeline&algorithm=SHA1&digits=6&period=30"
        )

    @staticmethod
    def get_apple_passwords_uri(secret: str, user_email: str) -> str:
        """
        Returns native apple-otpauth:// deep-link provisioning URI
        for seamless one-tap setup in Apple Passwords on iPhone / iOS / iPadOS / macOS.
        """
        plain_secret = decrypt_totp_secret(secret)
        clean_email = (user_email or "user@beeline.io").strip()
        encoded_email = quote(clean_email)
        return (
            f"apple-otpauth://totp/Beeline:{encoded_email}"
            f"?secret={plain_secret}&issuer=Beeline&algorithm=SHA1&digits=6&period=30"
        )

    @staticmethod
    def generate_qr_code_svg(provisioning_uri: str) -> str:
        """Generates a base64 encoded inline SVG data URI of the QR code."""
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=2,
                image_factory=SvgImage,
            )
            qr.add_data(provisioning_uri)
            qr.make(fit=True)
            img = qr.make_image()
            buffer = io.BytesIO()
            img.save(buffer)
            buffer.seek(0)
            svg_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
            return f"data:image/svg+xml;base64,{svg_b64}"
        except Exception as exc:
            logger.warning(f"Failed to generate SVG QR with SvgImage: {exc}")
            # Fallback to PNG data URI if SvgImage encountered an environment issue
            return MFAService.generate_qr_code_base64(provisioning_uri)

    @staticmethod
    def generate_qr_code_base64(provisioning_uri: str) -> str:
        """Generates a base64 encoded PNG data URI of the QR code."""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=2,
        )
        qr.add_data(provisioning_uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        img_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_b64}"

    @staticmethod
    def generate_backup_codes(count: int = 8) -> Tuple[List[str], List[str]]:
        """
        Generates `count` single-use emergency backup recovery codes.
        Returns:
            Tuple of (raw_backup_codes, hashed_backup_codes)
        """
        raw_codes = []
        hashed_codes = []
        for _ in range(count):
            token = f"{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}"
            raw_codes.append(token)
            hashed_codes.append(hash_token(token))
        return raw_codes, hashed_codes

    @staticmethod
    def generate_post_signup_recovery_codes(
        user_id: str,
        count: int = 3
    ) -> Tuple[List[str], List[str]]:
        """
        Generates exactly `count` high-entropy post-signup recovery codes (e.g. BEE-XXXX-XXXX)
        using unambiguous alphanumeric characters.
        Returns:
            Tuple of (raw_codes, salted_peppered_hashes)
        """
        charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
        raw_codes = []
        hashed_codes = []
        for _ in range(count):
            p1 = "".join(secrets.choice(charset) for _ in range(4))
            p2 = "".join(secrets.choice(charset) for _ in range(4))
            code = f"BEE-{p1}-{p2}"
            salt = secrets.token_hex(16)
            mac = hmac.new(
                settings.SECRET_KEY.encode("utf-8"),
                f"{user_id}:{code.strip().upper()}:{salt}".encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            raw_codes.append(code)
            hashed_codes.append(f"{salt}${mac}")
        return raw_codes, hashed_codes

    @staticmethod
    def verify_totp(secret: str, code: str, window: int = 1) -> bool:
        """
        Verifies a 6-digit TOTP code against the secret (supports Fernet ciphertext and legacy Base32).
        Allows a clock drift window of `window` intervals (+/- 30 seconds per window).
        """
        if not secret or not code:
            return False
        plain_secret = decrypt_totp_secret(secret)
        clean_code = str(code).strip().replace(" ", "").replace("-", "")
        totp = pyotp.TOTP(plain_secret)
        return bool(totp.verify(clean_code, valid_window=window))

    @staticmethod
    def generate_totp_code(secret: str, offset_seconds: int = 0) -> str:
        """Generates a valid 6-digit TOTP code with optional clock drift offset."""
        plain_secret = decrypt_totp_secret(secret)
        totp = pyotp.TOTP(plain_secret)
        return totp.at(int(time.time()) + offset_seconds)

    @staticmethod
    def verify_and_consume_backup_code(
        raw_code: str,
        hashed_codes: List[str],
        user_id: Optional[str] = None
    ) -> Tuple[bool, List[str]]:
        """
        Verifies if raw_code matches any hashed backup/recovery code in constant time.
        Supports both salted/peppered HMAC hashes ($ separator) and SHA-256 hashes.
        If matched, returns (True, updated_hashed_codes_without_used_code).
        Otherwise returns (False, hashed_codes).
        """
        clean_code = str(raw_code).strip().upper()
        matched_hash = None

        for stored_hash in hashed_codes:
            if "$" in stored_hash and user_id:
                parts = stored_hash.split("$", 1)
                if len(parts) == 2:
                    salt, digest = parts
                    expected = hmac.new(
                        settings.SECRET_KEY.encode("utf-8"),
                        f"{user_id}:{clean_code}:{salt}".encode("utf-8"),
                        hashlib.sha256
                    ).hexdigest()
                    if hmac.compare_digest(digest, expected):
                        matched_hash = stored_hash
                        break
            else:
                target_hash = hash_token(clean_code)
                if hmac.compare_digest(stored_hash, target_hash):
                    matched_hash = stored_hash
                    break

        if matched_hash is not None:
            updated_list = [h for h in hashed_codes if h != matched_hash]
            return True, updated_list

        return False, hashed_codes


mfa_service = MFAService()
