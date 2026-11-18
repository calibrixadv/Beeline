from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserProfile


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    username: Optional[str] = Field(None, min_length=3, max_length=50, description="Unique traveler username")
    full_name: Optional[str] = None
    device_info: Optional[str] = "Web Browser"
    remember_me: bool = False


class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str
    device_info: Optional[str] = "Web Browser"
    remember_me: bool = False


class BreachCheckRequest(BaseModel):
    password: Optional[str] = None
    email: Optional[str] = None


class BreachCheckResponse(BaseModel):
    is_password_compromised: bool = False
    password_breach_count: int = 0
    is_email_compromised: bool = False
    email_breach_count: int = 0
    breaches: List[str] = Field(default_factory=list)
    warning: Optional[str] = None
    recommendation: str = "Use a unique password with at least 8 characters, combining uppercase, lowercase, numbers, and symbols."


class GuestLoginRequest(BaseModel):
    device_info: Optional[str] = "Guest Client"


class GuestConvertRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserProfile
    recovery_codes: Optional[List[str]] = None


class RecoveryLoginRequest(BaseModel):
    email: EmailStr
    recovery_code: str
    password: Optional[str] = None
    device_info: Optional[str] = "Authenticated Device"
    remember_me: bool = False


class MFALoginChallengeResponse(BaseModel):
    mfa_required: bool = True
    mfa_session_token: str
    mfa_temp_token: Optional[str] = None
    message: str = "Multi-factor authentication required"

    def __init__(self, **data):
        super().__init__(**data)
        if not self.mfa_temp_token and self.mfa_session_token:
            self.mfa_temp_token = self.mfa_session_token


class MFAVerifyRequest(BaseModel):
    mfa_session_token: Optional[str] = None
    mfa_temp_token: Optional[str] = None
    totp_code: Optional[str] = None
    code: Optional[str] = None
    backup_code: Optional[str] = None
    recovery_code: Optional[str] = None
    device_info: Optional[str] = "Authenticated Device"
    remember_me: Optional[bool] = None


MFAChallengeRequest = MFAVerifyRequest


class MFASetupResponse(BaseModel):
    secret: str
    otpauth_url: str
    otpauth_uri: Optional[str] = None
    qr_uri: Optional[str] = None
    apple_passwords_uri: Optional[str] = None
    qr_code_base64: str
    qr_code_svg: Optional[str] = None
    backup_codes: List[str] = Field(default_factory=list)
    supported_authenticators: List[str] = Field(default_factory=list)


class MFAStatusResponse(BaseModel):
    mfa_enabled: bool
    is_confirmed: bool
    remaining_recovery_codes: int
    supported_authenticators: List[str] = Field(default_factory=list)


class MFAConfirmSetupRequest(BaseModel):
    code: str


class MFADisableRequest(BaseModel):
    password: Optional[str] = None
    code: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    # reset_token provided to facilitate local dev / programmatic verification
    reset_token: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str = Field(..., min_length=8)


class UnfreezeAccountRequest(BaseModel):
    token: str
    remember_me: bool = False


class MessageResponse(BaseModel):
    message: str
