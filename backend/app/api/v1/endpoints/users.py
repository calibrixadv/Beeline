import json
import logging
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_client_ip,
    get_current_session_id,
    get_current_user,
)
from app.api.v1.endpoints.auth import clear_auth_cookies
from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models.user import User, utcnow
from app.schemas.auth import MessageResponse
from app.schemas.user import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    DeleteAccountResponse,
    SessionResponse,
    UserProfile,
    UserPreferencesSchema,
    UserPreferencesUpdate,
    UserUpdate,
)
from app.services.account_lifecycle_service import AccountLifecycleService
from app.services.auth_service import AuthService, verify_password_policy_and_breach
from app.services.email_service import email_service
from app.services.mfa_service import mfa_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/me", response_model=UserProfile)
async def get_me(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve full profile details of the currently authenticated user."""
    return UserProfile.model_validate(current_user)


@router.patch("/me", response_model=UserProfile)
async def update_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Self-service update of user profile attributes:
    full_name, username (unique, 409 if taken), email (unique, 409 if taken),
    phone_number, avatar_url, and preferences.
    """
    # 1. Username uniqueness check (case-insensitive)
    if update_data.username is not None and update_data.username.strip():
        clean_username = update_data.username.strip()
        if clean_username.lower() != (current_user.username or "").lower():
            dup_res = await db.execute(
                select(User.id).where(
                    func.lower(User.username) == clean_username.lower(),
                    User.id != current_user.id
                )
            )
            if dup_res.first():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username is already taken"
                )
            current_user.username = clean_username

    # 2. Email uniqueness check (case-insensitive)
    if update_data.email is not None and str(update_data.email).strip():
        clean_email = str(update_data.email).strip().lower()
        if clean_email != (current_user.email or "").lower():
            dup_res = await db.execute(
                select(User.id).where(
                    func.lower(User.email) == clean_email,
                    User.id != current_user.id
                )
            )
            if dup_res.first():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email is already in use"
                )
            current_user.email = clean_email

    # 3. Attributes update
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name
    if update_data.phone_number is not None:
        current_user.phone_number = update_data.phone_number
    if update_data.avatar_url is not None:
        current_user.avatar_url = update_data.avatar_url
    if update_data.preferences is not None:
        pref = update_data.preferences
        current_user.preferences = pref if isinstance(pref, str) else json.dumps(pref)

    current_user.updated_at = utcnow()
    await db.commit()
    await db.refresh(current_user)
    return UserProfile.model_validate(current_user)


@router.post("/me/password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    current_session_id: Optional[str] = Depends(get_current_session_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    In-account password change:
    - Verifies current password (401 if wrong)
    - Validates new password with unified entropy + HIBP breach policy (400 if weak/breached)
    - Updates password hash
    - Revokes all OTHER active sessions of that user (keeping current session active)
    - Dispatches security alert email
    """
    if not current_user.hashed_password or not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect current password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Validate new password with unified PasswordVerifier
    await verify_password_policy_and_breach(data.new_password, current_user.email)

    # Update password hash
    current_user.hashed_password = hash_password(data.new_password)
    current_user.updated_at = utcnow()

    # Revoke all OTHER active sessions (preserving the current session)
    revoked_count = await AuthService.revoke_all_user_sessions(
        db,
        user_id=current_user.id,
        except_session_id=current_session_id
    )
    await db.commit()

    # Dispatch security alert email
    client_ip = get_client_ip(request)
    try:
        await email_service.send_password_changed_alert(
            to_email=current_user.email,
            ip_address=client_ip
        )
    except Exception as exc:
        logger.error(f"Error dispatching password changed alert to {current_user.email}: {exc}")

    return MessageResponse(
        message="Password changed successfully. All other active sessions have been revoked."
    )


@router.get("/me/preferences", response_model=UserPreferencesSchema)
async def get_preferences(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve validated travel & notification preferences for the current user."""
    stored = {}
    if current_user.preferences:
        try:
            stored = json.loads(current_user.preferences)
            if not isinstance(stored, dict):
                stored = {}
        except Exception:
            stored = {}

    return UserPreferencesSchema(**stored)


@router.patch("/me/preferences", response_model=UserPreferencesSchema)
async def update_preferences(
    update_data: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Update travel & notification preferences supporting clean partial merges.
    Validates defaults and ranges via UserPreferencesSchema.
    """
    stored = {}
    if current_user.preferences:
        try:
            stored = json.loads(current_user.preferences)
            if not isinstance(stored, dict):
                stored = {}
        except Exception:
            stored = {}

    updates = update_data.model_dump(exclude_unset=True, exclude_none=True)
    stored.update(updates)

    validated = UserPreferencesSchema(**stored)
    current_user.preferences = json.dumps(validated.model_dump())
    current_user.updated_at = utcnow()
    await db.commit()
    await db.refresh(current_user)

    return validated


@router.delete("/me", response_model=DeleteAccountResponse)
async def delete_me(
    request: Request,
    response: Response,
    body: Optional[DeleteAccountRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    30-Day Account Deletion Freeze:
    - Verifies password (if body provided)
    - Verifies MFA code (if 2FA active)
    - Puts account in FROZEN_PENDING_DELETION state (scheduled for 30 days)
    - Revokes active sessions in Redis & PostgreSQL
    - Clears auth cookies and dispatches 30-Day Notice email
    """
    # Verify credentials if provided or required
    if body and body.password:
        if not current_user.hashed_password or not verify_password(body.password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password",
                headers={"WWW-Authenticate": "Bearer"}
            )

    if current_user.mfa_enabled and current_user.mfa_credential and current_user.mfa_credential.is_confirmed:
        if body and body.password and not body.mfa_code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="MFA verification code is required to delete this account",
                headers={"WWW-Authenticate": "Bearer"}
            )
        if body and body.mfa_code:
            cred = current_user.mfa_credential
            valid = mfa_service.verify_totp(cred.secret_key, body.mfa_code)
            if not valid:
                hashes = json.loads(cred.backup_codes_hash) if cred.backup_codes_hash else []
                valid_backup, _ = mfa_service.verify_and_consume_backup_code(
                    body.mfa_code, hashes, user_id=current_user.id
                )
                if not valid_backup:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid MFA verification code",
                        headers={"WWW-Authenticate": "Bearer"}
                    )

    # Execute 30-Day Account Freeze
    client_ip = get_client_ip(request)
    freeze_result = await AccountLifecycleService.freeze_account(
        db,
        user=current_user,
        client_ip=client_ip
    )

    # Clear auth cookies
    clear_auth_cookies(response)

    return freeze_result


@router.get("/me/sessions", response_model=List[SessionResponse])
async def get_my_sessions(
    current_user: User = Depends(get_current_user),
    current_session_id: Optional[str] = Depends(get_current_session_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """List all active sessions registered for the current user."""
    sessions = await AuthService.list_user_sessions(db, current_user.id)
    return [
        SessionResponse(
            session_id=s.id,
            device_info=s.device_info or s.device_name,
            device_name=s.device_name or s.device_info,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            remember_me=s.remember_me if hasattr(s, "remember_me") else False,
            created_at=s.created_at,
            last_active_at=s.last_active_at,
            expires_at=s.expires_at,
            is_current=(s.id == current_session_id) if current_session_id else False
        )
        for s in sessions
    ]


@router.delete("/me/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Revoke a specific remote session."""
    revoked = await AuthService.revoke_session(db, session_id=session_id, user_id=current_user.id)
    if not revoked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return MessageResponse(message="Session revoked successfully")


@router.delete("/me/sessions", response_model=MessageResponse)
async def revoke_all_sessions(
    current_user: User = Depends(get_current_user),
    current_session_id: Optional[str] = Depends(get_current_session_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Revoke all other sessions for current user except current session."""
    count = await AuthService.revoke_all_user_sessions(
        db,
        user_id=current_user.id,
        except_session_id=current_session_id
    )
    return MessageResponse(message=f"Revoked {count} sessions successfully")
