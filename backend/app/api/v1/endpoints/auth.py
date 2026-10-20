import json
from typing import Any, Union
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_client_ip, get_current_user, get_device_info
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_mfa_session_token, decode_token, verify_password
from app.models.user import MFACredential, User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    GuestConvertRequest,
    GuestLoginRequest,
    LoginRequest,
    MessageResponse,
    MFAConfirmSetupRequest,
    MFADisableRequest,
    MFALoginChallengeResponse,
    MFASetupResponse,
    MFAVerifyRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    SignUpRequest,
    TokenResponse,
)
from app.schemas.user import UserProfile
from app.services.auth_service import AuthService
from app.services.mfa_service import mfa_service

router = APIRouter()


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    data: SignUpRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Register a new user and generate immediate access + refresh tokens."""
    user = await AuthService.create_user(
        db=db,
        email=data.email,
        password=data.password,
        full_name=data.full_name
    )

    ip = get_client_ip(request)
    device = data.device_info or get_device_info(request)
    access_token, refresh_token, _ = await AuthService.create_session(
        db=db,
        user=user,
        device_info=device,
        ip_address=ip
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserProfile.model_validate(user)
    )


@router.post("/login", response_model=Union[TokenResponse, MFALoginChallengeResponse])
async def login(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Authenticate user. If MFA is enabled, returns challenge session token.
    Otherwise creates session and returns JWT tokens.
    """
    user = await AuthService.get_user_by_email(db, data.email)
    if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is disabled")

    # Check if MFA is required
    if user.mfa_enabled and user.mfa_credential and user.mfa_credential.is_confirmed:
        mfa_token = create_mfa_session_token(user.id)
        return MFALoginChallengeResponse(
            mfa_required=True,
            mfa_session_token=mfa_token,
            message="Multi-factor authentication required"
        )

    ip = get_client_ip(request)
    device = data.device_info or get_device_info(request)
    access_token, refresh_token, _ = await AuthService.create_session(
        db=db,
        user=user,
        device_info=device,
        ip_address=ip
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserProfile.model_validate(user)
    )


@router.post("/guest", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def login_as_guest(
    data: GuestLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """1-tap ephemeral guest session provisioning."""
    ip = get_client_ip(request)
    device = data.device_info or get_device_info(request)
    user, access_token, refresh_token, _ = await AuthService.create_guest_user(
        db=db,
        device_info=device,
        ip_address=ip
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserProfile.model_validate(user)
    )


@router.post("/guest/convert", response_model=UserProfile)
async def convert_guest(
    data: GuestConvertRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Upgrade a guest account to a permanent email/password account."""
    if not current_user.is_guest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current account is already a registered user"
        )

    updated_user = await AuthService.convert_guest_user(
        db=db,
        guest_user_id=current_user.id,
        email=data.email,
        password=data.password,
        full_name=data.full_name
    )
    return UserProfile.model_validate(updated_user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Perform refresh token rotation: invalidate old token and issue fresh pair."""
    ip = get_client_ip(request)
    device = get_device_info(request)

    new_access_token, new_refresh_token, _ = await AuthService.rotate_refresh_token(
        db=db,
        refresh_token_str=data.refresh_token,
        device_info=device,
        ip_address=ip
    )

    payload = decode_token(new_access_token)
    user_id = payload.get("sub")
    user = await AuthService.get_user_by_id(db, user_id)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserProfile.model_validate(user)
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Revoke all active sessions for current user."""
    await AuthService.revoke_all_user_sessions(db, current_user.id)
    return MessageResponse(message="Successfully logged out")


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Generate a password reset token."""
    raw_token = await AuthService.create_password_reset_token(db, data.email)
    return ForgotPasswordResponse(
        message="If an account exists with this email, a password reset link has been dispatched.",
        reset_token=raw_token
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Reset account password using reset token and revoke all existing sessions."""
    await AuthService.reset_password_with_token(
        db=db,
        raw_token=data.reset_token,
        new_password=data.new_password
    )
    return MessageResponse(message="Password reset successfully. Please log in with your new password.")


# ==========================================
# MFA ENDPOINTS
# ==========================================

@router.post("/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Generate TOTP secret, QR code, and 8 backup emergency codes."""
    if current_user.is_guest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guest accounts cannot enable Multi-Factor Authentication"
        )

    secret = mfa_service.generate_secret()
    provisioning_uri = mfa_service.get_provisioning_uri(secret, current_user.email or "user@beeline.io")
    qr_b64 = mfa_service.generate_qr_code_base64(provisioning_uri)
    raw_codes, hashed_codes = mfa_service.generate_backup_codes(8)

    # Persist or update credential record in unconfirmed status
    result = await db.execute(
        select(MFACredential).where(MFACredential.user_id == current_user.id)
    )
    cred = result.scalar_one_or_none()
    if not cred:
        cred = MFACredential(
            user_id=current_user.id,
            secret_key=secret,
            backup_codes_hash=json.dumps(hashed_codes),
            is_confirmed=False
        )
        db.add(cred)
    else:
        cred.secret_key = secret
        cred.backup_codes_hash = json.dumps(hashed_codes)
        cred.is_confirmed = False

    await db.commit()

    return MFASetupResponse(
        secret=secret,
        otpauth_url=provisioning_uri,
        qr_code_base64=qr_b64,
        backup_codes=raw_codes
    )


@router.post("/mfa/verify", response_model=MessageResponse)
async def confirm_mfa(
    data: MFAConfirmSetupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Confirm TOTP token to activate MFA."""
    result = await db.execute(
        select(MFACredential).where(MFACredential.user_id == current_user.id)
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup has not been initiated"
        )

    if not mfa_service.verify_totp(cred.secret_key, data.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit verification code"
        )

    cred.is_confirmed = True
    current_user.mfa_enabled = True
    await db.commit()

    return MessageResponse(message="Multi-Factor Authentication enabled successfully")


@router.post("/mfa/challenge", response_model=TokenResponse)
async def verify_mfa_challenge(
    data: MFAVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Complete login challenge via TOTP code or emergency backup code."""
    try:
        payload = decode_token(data.mfa_session_token)
        if payload.get("token_type") != "mfa_challenge":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA challenge token")
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired or invalid MFA challenge token")

    user = await AuthService.get_user_by_id(db, user_id)
    if not user or not user.mfa_credential or not user.mfa_credential.is_confirmed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA is not configured for this user")

    cred = user.mfa_credential
    verified = False

    # 1. Try TOTP code
    if data.totp_code:
        if mfa_service.verify_totp(cred.secret_key, data.totp_code):
            verified = True

    # 2. Try single-use backup code
    if not verified and data.backup_code:
        try:
            hashed_list = json.loads(cred.backup_codes_hash)
        except Exception:
            hashed_list = []
        
        matched, updated_list = mfa_service.verify_and_consume_backup_code(data.backup_code, hashed_list)
        if matched:
            verified = True
            cred.backup_codes_hash = json.dumps(updated_list)
            await db.commit()

    if not verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication code or backup recovery code"
        )

    ip = get_client_ip(request)
    device = data.device_info or get_device_info(request)
    access_token, refresh_token, _ = await AuthService.create_session(
        db=db,
        user=user,
        device_info=device,
        ip_address=ip
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserProfile.model_validate(user)
    )


@router.post("/mfa/disable", response_model=MessageResponse)
async def disable_mfa(
    data: MFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Disable MFA after verifying current password."""
    if not current_user.hashed_password or not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    current_user.mfa_enabled = False
    result = await db.execute(
        select(MFACredential).where(MFACredential.user_id == current_user.id)
    )
    cred = result.scalar_one_or_none()
    if cred:
        await db.delete(cred)

    await db.commit()
    return MessageResponse(message="Multi-Factor Authentication disabled successfully")
