import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import secrets
from typing import Any, Dict, Optional, Union

import bcrypt
from cryptography.fernet import Fernet, InvalidToken
from fastapi import Request
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    """Hashes a password using native bcrypt."""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def hash_token(token: str) -> str:
    """Computes SHA-256 hash of a token for safe database persistence."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_secure_random_token(length: int = 32) -> str:
    """Generates a cryptographically strong URL-safe random string."""
    return secrets.token_urlsafe(length)


def get_fernet_key() -> bytes:
    """Derives a deterministic 32-byte URL-safe base64 Fernet key from settings.SECRET_KEY using hashlib.sha256."""
    raw_digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(raw_digest)


def get_fernet() -> Fernet:
    """Returns a Fernet cipher instance configured with the derived application key."""
    return Fernet(get_fernet_key())


def encrypt_auth_token(payload: Dict[str, Any]) -> str:
    """
    Encrypts the session payload using Fernet symmetric encryption (AES-128-CBC + HMAC-SHA256).
    Produces an opaque encrypted token that cannot be decoded on jwt.io.
    """
    fernet = get_fernet()
    serialized = json.dumps(payload, default=str).encode("utf-8")
    return fernet.encrypt(serialized).decode("utf-8")


def encrypt_totp_secret(raw_secret: str) -> str:
    """
    Encrypts a plaintext base32 TOTP secret using Fernet symmetric encryption at rest.
    """
    if not raw_secret:
        return ""
    fernet = get_fernet()
    return fernet.encrypt(raw_secret.encode("utf-8")).decode("utf-8")


def decrypt_totp_secret(stored_secret: str) -> str:
    """
    Decrypts a Fernet-encrypted TOTP secret.
    If stored_secret is plaintext Base32 (e.g. from seed.sql or legacy entries),
    gracefully returns the raw secret directly for 100% backward compatibility.
    """
    if not stored_secret:
        return ""
    clean = stored_secret.strip()
    if clean.startswith("gAAAAA"):
        try:
            fernet = get_fernet()
            return fernet.decrypt(clean.encode("utf-8")).decode("utf-8")
        except Exception:
            pass
    return clean


def decrypt_auth_token(token: str) -> Dict[str, Any]:
    """
    Decrypts a Fernet auth token.
    Falls back to standard JWT decoding so existing automated tests and Bearer tokens remain 100% compatible.
    """
    clean_token = token.strip('"').strip("'")
    # 1. Try Fernet decryption
    try:
        fernet = get_fernet()
        decrypted = fernet.decrypt(clean_token.encode("utf-8"))
        payload = json.loads(decrypted.decode("utf-8"))
        if "sid" in payload and "session_id" not in payload:
            payload["session_id"] = payload["sid"]
        elif "session_id" in payload and "sid" not in payload:
            payload["sid"] = payload["session_id"]
        return payload
    except Exception:
        pass

    # 2. Fallback to standard JWT decode
    payload = jwt.decode(clean_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    if "sid" in payload and "session_id" not in payload:
        payload["session_id"] = payload["sid"]
    elif "session_id" in payload and "sid" not in payload:
        payload["sid"] = payload["session_id"]
    return payload


def compute_device_fingerprint(request: Request) -> str:
    """
    Computes anti-hijack device-context fingerprint:
    HMAC-SHA256(SECRET_KEY, f"{normalized_user_agent}|{sec_ch_ua}|{accept_language}").
    """
    ua = (request.headers.get("user-agent") or "").strip().lower()
    sec_ch_ua = (request.headers.get("sec-ch-ua") or "").strip()
    accept_lang = (request.headers.get("accept-language") or "").split(",")[0].strip().lower()
    raw = f"{ua}|{sec_ch_ua}|{accept_lang}"
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def compute_device_proof(session_id: str, fingerprint: str) -> str:
    """
    Computes secondary HttpOnly binding cookie proof:
    HMAC-SHA256(SECRET_KEY, f"{session_id}|{fingerprint}").
    """
    raw = f"{session_id}|{fingerprint}"
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def create_access_token(
    subject: str,
    is_guest: bool = False,
    extra_claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "is_guest": is_guest,
        "token_type": "access",
        "exp": expire,
        "iat": now,
    }
    if extra_claims:
        to_encode.update(extra_claims)
        
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    subject: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
    to_encode = {
        "sub": str(subject),
        "token_type": "refresh",
        "jti": secrets.token_hex(16),
        "exp": expire,
        "iat": now,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_mfa_session_token(
    user_id: str,
    remember_me: bool = False,
    jti: Optional[str] = None
) -> str:
    """Generates a temporary single-use short-lived JWT for completing MFA challenge."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.MFA_TEMP_TOKEN_EXPIRE_MINUTES)
    challenge_jti = jti or secrets.token_hex(16)
    to_encode = {
        "sub": str(user_id),
        "token_type": "mfa_challenge",
        "type": "mfa_temp",
        "jti": challenge_jti,
        "remember_me": bool(remember_me),
        "exp": expire,
        "iat": now,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a token (supports Fernet auth tokens and Jose JWTs)."""
    return decrypt_auth_token(token)
